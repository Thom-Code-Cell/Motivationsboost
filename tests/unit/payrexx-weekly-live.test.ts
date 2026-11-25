import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { PoolClient } from 'pg';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { applyWeeklyLiveEvent } from '@/lib/server/payrexx-weekly-live';

const database = new PGlite();
const merchant = { instance: 'isolated-motivationsboost', pspId: 88 };
const client = {
  async query(sql: string, values?: unknown[]) {
    const result = await database.query(sql, values);
    return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
  },
} as PoolClient;

beforeAll(async () => {
  await database.exec('CREATE TABLE "user" (id text PRIMARY KEY)');
  for (const migration of [
    '001_app_data.sql', '004_payrexx_orders.sql', '008_payrexx_entitlement_reference.sql', '009_payrexx_sandbox_checkout.sql',
    '010_payrexx_sandbox_status.sql', '014_payrexx_weekly_production.sql',
  ]) await database.exec(readFileSync(`migrations/${migration}`, 'utf8'));
});
afterAll(async () => { await database.close(); });

async function sample(user: string) {
  const reference = randomUUID();
  await database.query('INSERT INTO "user" VALUES ($1)', [user]);
  await database.query(`INSERT INTO payment_orders
    (reference_id, user_id, plan, amount, currency, status, accepted_terms_version, accepted_terms_at, live_psp_id, payrexx_gateway_id)
    VALUES ($1,$2,'weekly',890,'CHF','gateway-created','weekly-synthetic-v1',now(),88,123)`, [reference, user]);
  return {
    uuid: 'synthetic-' + user, referenceId: reference, instance: { name: merchant.instance }, mode: 'LIVE',
    pspId: merchant.pspId, paymentType: 'one-time', status: 'confirmed', amount: 890,
    invoice: { referenceId: reference, paymentRequestId: 123, currency: 'CHF', test: false, originalAmount: 890, refundedAmount: 0 },
  };
}

async function receive(transaction: unknown) {
  return applyWeeklyLiveEvent(client, { transaction }, merchant);
}

it('activates only a matching live weekly order once and queues one receipt', async () => {
  const transaction = await sample('weekly-payment');
  expect(await receive({ ...transaction, mode: 'TEST' })).toBe(false);
  expect(await receive({ ...transaction, paymentType: 'subscription' })).toBe(false);
  expect(await receive({ ...transaction, pspId: 89 })).toBe(false);
  expect(await receive({ ...transaction, amount: 891 })).toBe(false);
  expect(await receive({ ...transaction, invoice: { ...transaction.invoice, paymentRequestId: 124 } })).toBe(false);
  expect(await receive({ ...transaction, invoice: { ...transaction.invoice, referenceId: randomUUID() } })).toBe(false);
  expect(await receive(transaction)).toBe(true);
  expect(await receive(transaction)).toBe(false);
  expect((await database.query(`SELECT status, ends_at - starts_at = interval '7 days' AS seven_days
    FROM ai_entitlements WHERE payment_reference = $1`, [transaction.referenceId])).rows)
    .toEqual([{ status: 'active', seven_days: true }]);
  expect((await database.query('SELECT kind FROM payrexx_weekly_notices WHERE order_reference = $1', [transaction.referenceId])).rows)
    .toEqual([{ kind: 'paid' }]);
});

it('accepts a matched full refund only and stops the corresponding entitlement', async () => {
  const paid = await sample('weekly-refund');
  await receive(paid);
  const refund = { ...paid, uuid: 'synthetic-refund', originalTransactionUuid: paid.uuid, status: 'refunded', amount: -890 };
  expect(await receive({ ...refund, invoice: { ...paid.invoice, refundedAmount: 100 } })).toBe(false);
  expect(await receive({ ...refund, originalTransactionUuid: 'other-payment', invoice: { ...paid.invoice, refundedAmount: 890 } })).toBe(false);
  await receive({ ...refund, invoice: { ...paid.invoice, refundedAmount: 890 } });
  expect((await database.query('SELECT status FROM payment_orders WHERE reference_id = $1', [paid.referenceId])).rows)
    .toEqual([{ status: 'refunded' }]);
  expect((await database.query('SELECT status FROM ai_entitlements WHERE payment_reference = $1', [paid.referenceId])).rows)
    .toEqual([{ status: 'refunded' }]);
  expect((await database.query('SELECT kind FROM payrexx_weekly_notices WHERE order_reference = $1 ORDER BY kind', [paid.referenceId])).rows)
    .toEqual([{ kind: 'paid' }, { kind: 'refunded' }]);
});

it('revokes a charged-back order only once and rejects later duplicate confirmation', async () => {
  const payment = await sample('weekly-chargeback');
  expect(await receive(payment)).toBe(true);
  const reversal = { ...payment, status: 'chargeback' };
  await receive(reversal);
  await receive(reversal);
  expect(await receive(payment)).toBe(false);
  expect((await database.query('SELECT status FROM payment_orders WHERE reference_id = $1', [payment.referenceId])).rows)
    .toEqual([{ status: 'chargeback' }]);
  const count = await database.query("SELECT count(*)::integer AS count FROM payrexx_weekly_notices WHERE order_reference = $1 AND kind = 'chargeback'", [payment.referenceId]);
  expect(count.rows).toEqual([{ count: 1 }]);
});

it('does not grant credits when a full refund arrives before confirmation', async () => {
  const payment = await sample('weekly-refund-before-confirmation');
  await receive({ ...payment, uuid: 'synthetic-early-refund', originalTransactionUuid: payment.uuid, status: 'refunded',
    amount: -890, invoice: { ...payment.invoice, refundedAmount: 890 } });
  expect(await receive(payment)).toBe(false);
  expect((await database.query('SELECT status FROM payment_orders WHERE reference_id = $1', [payment.referenceId])).rows)
    .toEqual([{ status: 'refunded' }]);
  expect((await database.query('SELECT 1 FROM ai_entitlements WHERE payment_reference = $1', [payment.referenceId])).rows)
    .toEqual([]);
});
