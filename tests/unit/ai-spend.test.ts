import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { maximumLetterCostChfMicros, providerUsageCost, textCostChfMicros, previewTextModel } from '@/lib/ai-spend';

const mocks = vi.hoisted(() => ({ pool: undefined as Pool | undefined }));
vi.mock('@/lib/server/postgres', () => ({ databasePool: () => mocks.pool }));
import { AiSpendBlocked, DuplicateAiRequest, reserveAiSpend, settleAiSpend } from '@/lib/server/ai-spend-store';
import { callOpenAI, callOpenAIForm } from '@/lib/server/openai-client';

it('books the standard uncached token rates and rejects invalid usage reports', () => {
  expect(providerUsageCost({ input_tokens: 1000, output_tokens: 1000 })).toBe(6600);
  expect(providerUsageCost({ input_tokens: -1, output_tokens: 10 })).toBeUndefined();
  expect(providerUsageCost({ input_tokens: 1000, output_tokens: 1000 }, previewTextModel)).toBe(2200);
  expect(maximumLetterCostChfMicros('😀', 'x', previewTextModel)).toBe(4508);
  expect(maximumLetterCostChfMicros('😀', 'x')).toBe(textCostChfMicros(2053, 2048));
});

it('blocks unreserved legacy transports before any network call', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  try {
    await expect(callOpenAI('/responses', {})).rejects.toThrow('keine Kostenreservierung');
    await expect(callOpenAIForm('/images/edits', new FormData())).rejects.toThrow('keine Kostenreservierung');
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});

it('does not dispatch any paid transport at or after approval expiry', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  vi.stubEnv('MOTIVATIONS_PAID_AI_ENABLED', 'true');
  vi.stubEnv('MOTIVATIONS_AI_PRICE_APPROVED_UNTIL', new Date().toISOString());
  try {
    await expect(callOpenAI('/responses', {}, 'existing-receipt')).rejects.toMatchObject({ code: 'approval_expired' });
    await expect(callOpenAIForm('/images/edits', new FormData(), 'existing-receipt')).rejects.toMatchObject({ code: 'approval_expired' });
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});

const connection = process.env.MOTIVATIONS_E2E_DATABASE_URL;
describe.skipIf(!connection)('PostgreSQL spend reservations', () => {
  const schema = 'spend_test_' + randomUUID().replaceAll('-', '');
  let coordinator: Pool;
  beforeAll(async () => {
    const url = new URL(connection!);
    if (url.hostname !== '127.0.0.1' || url.protocol !== 'postgresql:' || url.pathname !== '/motivationsboost_e2e') {
      throw new Error('The spend test requires isolated loopback PostgreSQL.');
    }
    coordinator = new Pool({ connectionString: connection });
    await coordinator.query(`CREATE SCHEMA ${schema}`);
    mocks.pool = new Pool({ connectionString: connection, options: `-c search_path=${schema}` });
    await mocks.pool.query('CREATE TABLE "user" (id text PRIMARY KEY)');
    await mocks.pool.query("INSERT INTO \"user\" (id) VALUES ('synthetic-1'), ('synthetic-2')");
    await mocks.pool.query(readFileSync('migrations/007_ai_spend_reservations.sql', 'utf8'));
  });
  afterAll(async () => {
    await mocks.pool?.end();
    if (coordinator) {
      await coordinator.query(`DROP SCHEMA ${schema} CASCADE`);
      await coordinator.end();
    }
  });

  it('holds the shared ceiling under parallel reservations and books each result once', async () => {
    const requestId = randomUUID();
    const receipt = await reserveAiSpend('synthetic-1', requestId, 4_000_000);
    await expect(reserveAiSpend('synthetic-1', requestId, 4_000_000)).rejects.toBeInstanceOf(DuplicateAiRequest);
    const parallel = await Promise.allSettled(Array.from({ length: 4 }, () =>
      reserveAiSpend('synthetic-2', randomUUID(), 2_000_000)));
    expect(parallel.filter(result => result.status === 'fulfilled')).toHaveLength(3);
    expect(parallel.find(result => result.status === 'rejected')).toMatchObject({ reason: expect.any(AiSpendBlocked) });
    await Promise.all([settleAiSpend(receipt, 125), settleAiSpend(receipt, 125)]);
    const committed = await mocks.pool!.query('SELECT committed_micros FROM ai_spend_budget');
    expect(Number(committed.rows[0].committed_micros)).toBe(6_000_125);
    const next = await reserveAiSpend('synthetic-1', randomUUID(), 50_000);
    await settleAiSpend(next, 60_000);
    await expect(reserveAiSpend('synthetic-2', randomUUID(), 1)).rejects.toBeInstanceOf(AiSpendBlocked);
  });
});
