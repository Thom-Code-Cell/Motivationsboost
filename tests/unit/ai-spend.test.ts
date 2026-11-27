import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { commercialTextModel, maximumLetterCostChfMicros, providerUsageCost, textCostChfMicros, previewTextModel } from '@/lib/ai-spend';

const mocks = vi.hoisted(() => ({ pool: undefined as Pool | undefined }));
vi.mock('@/lib/server/postgres', () => ({ databasePool: () => mocks.pool }));
import { AiSpendBlocked, DuplicateAiRequest, reserveAiSpend, settleAiSpend } from '@/lib/server/ai-spend-store';
import { callOpenAI } from '@/lib/server/openai-client';
import { creditBalance, InsufficientCredits } from '@/lib/server/ai-credits';

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
    for (const file of ['001_app_data.sql', '004_payrexx_orders.sql', '007_ai_spend_reservations.sql', '008_payrexx_entitlement_reference.sql', '009_payrexx_sandbox_checkout.sql', '012_credit_and_product_costs.sql']) {
      await mocks.pool.query(readFileSync(`migrations/${file}`, 'utf8'));
    }
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

  it('uses only verified credits, keeps commercial spend separate and reverses a definite no-cost attempt once', async () => {
    vi.stubEnv('MOTIVATIONS_PRODUCT_AI_MONTHLY_LIMIT_MICROS', '');
    await expect(reserveAiSpend('synthetic-1', randomUUID(), 29_000, { credits: 3, sandbox: false })).rejects.toBeInstanceOf(AiSpendBlocked);
    vi.stubEnv('MOTIVATIONS_PRODUCT_AI_MONTHLY_LIMIT_MICROS', '1000000');
    try {
      const paid = randomUUID();
      await mocks.pool!.query(`INSERT INTO payment_orders
        (reference_id,user_id,plan,amount,currency,status,payrexx_transaction_id,accepted_terms_at)
        VALUES ($1,'synthetic-1','weekly',890,'CHF','paid','verified-weekly',now())`, [paid]);
      await mocks.pool!.query(`INSERT INTO ai_entitlements (user_id,plan,starts_at,ends_at,status,payment_reference)
        VALUES ('synthetic-1','weekly',now() - interval '1 day',now() + interval '6 days','active',$1)`, [paid]);
      expect(await creditBalance('synthetic-1', true)).toBe(0);
      expect(await creditBalance('synthetic-2', false)).toBe(0);
      const requests = await Promise.allSettled(Array.from({ length: 8 }, () =>
        reserveAiSpend('synthetic-1', randomUUID(), 29_000, { credits: 3, sandbox: false })));
      const receipts = requests.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
      expect(receipts).toHaveLength(6);
      expect(requests.filter(result => result.status === 'rejected').map(result => result.reason))
        .toEqual([expect.any(InsufficientCredits), expect.any(InsufficientCredits)]);
      expect(await creditBalance('synthetic-1', false)).toBe(2);
      await Promise.all([settleAiSpend(receipts[0], 0), settleAiSpend(receipts[0], 0)]);
      expect(await creditBalance('synthetic-1', false)).toBe(5);
      expect(Number((await mocks.pool!.query('SELECT committed_micros FROM ai_product_spend')).rows[0].committed_micros)).toBe(145_000);
      await mocks.pool!.query("UPDATE payment_orders SET status = 'refunded' WHERE reference_id = $1", [paid]);
      expect(await creditBalance('synthetic-1', false)).toBe(0);
      await expect(reserveAiSpend('synthetic-1', randomUUID(), 30_001, { credits: 3, sandbox: false })).rejects.toBeInstanceOf(AiSpendBlocked);
      await Promise.all(receipts.slice(1).map(receipt => settleAiSpend(receipt, 0)));
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('shows only the current annual period and records a sub-target portfolio margin from posted costs', async () => {
    const annual = randomUUID();
    const pack = randomUUID();
    await mocks.pool!.query(`INSERT INTO payment_orders
      (reference_id,user_id,plan,amount,currency,status,payrexx_transaction_id,accepted_terms_at)
      VALUES ($1,'synthetic-2','yearly',11900,'CHF','paid','verified-yearly',now()),
        ($2,'synthetic-2','credits_small',990,'CHF','paid','verified-pack',now())`, [annual, pack]);
    await mocks.pool!.query(`INSERT INTO ai_entitlements (user_id,plan,starts_at,ends_at,status,payment_reference)
      VALUES ('synthetic-2','yearly',now() - interval '40 days',now() + interval '300 days','active',$1)`, [annual]);
    await mocks.pool!.query('INSERT INTO ai_credit_usage VALUES ($1,0,60), ($2,0,5)', [annual, pack]);
    expect(await creditBalance('synthetic-2', false)).toBe(95);
    const month = "date_trunc('month', now() AT TIME ZONE 'Europe/Zurich')::date";
    await mocks.pool!.query(`INSERT INTO product_economic_postings (source_key,month,plan,category,amount_micros)
      VALUES ('sale',${month},'weekly','net_sales',10000000), ('support',${month},'portfolio','support',3000000)`);
    vi.stubEnv('MOTIVATIONS_PRODUCT_AI_MONTHLY_LIMIT_MICROS', '1000000');
    const receipt = await reserveAiSpend('synthetic-2', randomUUID(), 29000, { credits: 3, sandbox: false }).finally(() => vi.unstubAllEnvs());
    const report = await mocks.pool!.query(readFileSync('scripts/product-economics.sql', 'utf8'));
    expect(report.rows[0]).toMatchObject({ plan: 'portfolio', status: 'incomplete_ai_cost', operating_margin_pct: '70.00' });
    await settleAiSpend(receipt, 0);
    const settled = await mocks.pool!.query(readFileSync('scripts/product-economics.sql', 'utf8'));
    expect(settled.rows[0]).toMatchObject({ plan: 'portfolio', status: 'below_80_percent', operating_margin_pct: '70.00', operator_closed: false });
  });
});

it('reserves commercial model costs at standard rates plus regional and FX buffers', () => {
  expect(textCostChfMicros(1000, 1000, commercialTextModel)).toBe(726);
  const reservation = Math.ceil(maximumLetterCostChfMicros('x'.repeat(40000), 'x'.repeat(2000), commercialTextModel, 128) * 1.25);
  expect(reservation).toBeLessThan(30000);
});
