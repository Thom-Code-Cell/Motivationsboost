import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { PoolClient } from 'pg';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { applyWeeklySandboxEvent as applySandboxEvent, weeklySandboxEnabled } from '@/lib/server/payrexx-weekly';

const database = new PGlite();
const applyWeeklySandboxEvent = (client: PoolClient, payload: unknown) => applySandboxEvent(client, payload, { instance: 'shared-live', pspId: 27 });
const reference = '89cfe762-ea68-4a1c-9c65-a36e103610ab';
const event = {
  transaction: {
    uuid: 'payment-synthetic-1',
    status: 'confirmed',
    mode: 'TEST',
    paymentType: 'one-time',
    instance: { name: 'shared-live' },
    pspId: 27,
    referenceId: reference,
    amount: 890,
    invoice: { referenceId: reference, originalAmount: 890, currency: 'CHF', test: 1 },
  },
};
const poolClient = {
  query: async (text: string, args?: unknown[]) => {
    const result = await database.query(text, args);
    return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
  },
} as PoolClient;

beforeAll(async () => {
  await database.exec(`CREATE TABLE "user" (id text PRIMARY KEY); INSERT INTO "user" VALUES ('test-user');`);
  for (const file of ['001_app_data.sql', '004_payrexx_orders.sql', '008_payrexx_entitlement_reference.sql', '009_payrexx_sandbox_checkout.sql']) {
    await database.exec(readFileSync(`migrations/${file}`, 'utf8'));
  }
  await database.query("INSERT INTO payment_orders (reference_id,user_id,plan,amount,currency,status,sandbox,sandbox_psp_id) VALUES ($1,'test-user','weekly',890,'CHF','gateway-created',true,27)", [reference]);
});
afterAll(async () => { await database.close(); });

it('never enables a sandbox entitlement path on Vercel Production', () => {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('PAYREXX_WEEKLY_SANDBOX_ENTITLEMENTS_ENABLED', 'true');
  expect(weeklySandboxEnabled()).toBe(false);
  vi.unstubAllEnvs();
});

it('validates the weekly sandbox amount and order, grants once, and applies a matching full refund', async () => {
  const transaction = event.transaction;
  expect(await applyWeeklySandboxEvent(poolClient, { transaction: { ...transaction, amount: 100 } })).toBe(false);
  expect(await applyWeeklySandboxEvent(poolClient, { transaction: { ...transaction, invoice: { ...transaction.invoice, test: false } } })).toBe(false);
  expect(await applyWeeklySandboxEvent(poolClient, { transaction: { ...transaction, mode: 'LIVE' } })).toBe(false);
  expect(await applyWeeklySandboxEvent(poolClient, { transaction: { ...transaction, instance: { name: 'different-merchant' } } })).toBe(false);
  expect(await applyWeeklySandboxEvent(poolClient, { transaction: { ...transaction, pspId: 44 } })).toBe(false);
  expect(await applyWeeklySandboxEvent(poolClient, event)).toBe(true);
  expect(await applyWeeklySandboxEvent(poolClient, event)).toBe(false);
  const granted = await database.query('SELECT plan, status, payment_reference FROM ai_entitlements');
  expect(granted.rows).toEqual([{ plan: 'weekly', status: 'active', payment_reference: reference }]);
  const refund = { ...transaction, status: 'refunded', invoice: { ...transaction.invoice, refundedAmount: 890 } };
  expect(await applyWeeklySandboxEvent(poolClient, { transaction: { ...refund, uuid: 'unrelated-transaction' } })).toBe(false);
  await applyWeeklySandboxEvent(poolClient, { transaction: refund });
  const revoked = await database.query('SELECT status FROM ai_entitlements');
  expect(revoked.rows).toEqual([{ status: 'refunded' }]);
});
