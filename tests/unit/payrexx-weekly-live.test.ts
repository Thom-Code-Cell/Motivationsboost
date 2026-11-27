import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { PoolClient } from 'pg';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { creditBalance, InsufficientCredits, reserveCredits } from '@/lib/server/ai-credits';
import { canFundOneTimePayrexxOrder } from '@/lib/server/payrexx-credit-funding';
import { applyWeeklyLiveEvent } from '@/lib/server/payrexx-weekly-live';

const database = new PGlite();
const merchant = { instance: 'isolated-motivationsboost', pspId: 88 };
const client = {
  async query(sql: string, values?: unknown[]) {
    const result = await database.query(sql, values);
    return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
  },
} as PoolClient;

vi.mock('@/lib/server/postgres', () => ({ databasePool: () => client }));

beforeAll(async () => {
  await database.exec('CREATE TABLE "user" (id text PRIMARY KEY)');
  for (const migration of [
    '001_app_data.sql', '004_payrexx_orders.sql', '007_ai_spend_reservations.sql', '008_payrexx_entitlement_reference.sql',
    '009_payrexx_sandbox_checkout.sql', '010_payrexx_sandbox_status.sql', '012_credit_and_product_costs.sql',
    '014_payrexx_weekly_production.sql', '015_payrexx_credit_packs.sql',
  ]) await database.exec(readFileSync(`migrations/${migration}`, 'utf8'));
});
afterAll(async () => { await database.close(); });

async function sample(user: string, plan = 'weekly', amount = 890) {
  const reference = randomUUID();
  await database.query('INSERT INTO "user" VALUES ($1)', [user]);
  await database.query(`INSERT INTO payment_orders
    (reference_id, user_id, plan, amount, currency, status, accepted_terms_version, accepted_terms_at, live_psp_id, payrexx_gateway_id)
    VALUES ($1,$2,$3,$4,'CHF','gateway-created','synthetic-v1',now(),88,123)`, [reference, user, plan, amount]);
  return {
    uuid: 'synthetic-' + user, referenceId: reference, instance: { name: merchant.instance }, mode: 'LIVE',
    pspId: merchant.pspId, paymentType: 'one-time', status: 'confirmed', amount,
    invoice: { referenceId: reference, paymentRequestId: 123, currency: 'CHF', test: false, originalAmount: amount, refundedAmount: 0 },
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

it('grants 20 credits once and closes the balance on refund without undoing recorded use', async () => {
  const user = 'weekly-credit-refund';
  const payment = await sample(user);
  expect(await creditBalance(user, false)).toBe(0);
  expect(await receive({ ...payment, status: 'declined' })).toBe(false);
  expect(await creditBalance(user, false)).toBe(0);
  expect(await receive(payment)).toBe(true);
  expect(await creditBalance(user, false)).toBe(20);
  expect(await creditBalance(user, true)).toBe(0);

  const spendId = randomUUID();
  await database.query(`INSERT INTO ai_spend_reservations
    (id, user_id, request_id, reserved_micros, actual_micros) VALUES ($1, $2, $3, 30000, 1000)`,
  [spendId, user, randomUUID()]);
  await reserveCredits(client, user, spendId, 3, false);
  expect(await creditBalance(user, false)).toBe(17);
  expect(await receive(payment)).toBe(false);
  expect(await creditBalance(user, false)).toBe(17);

  await receive({ ...payment, uuid: 'synthetic-credit-refund', originalTransactionUuid: payment.uuid,
    status: 'refunded', amount: -890, invoice: { ...payment.invoice, refundedAmount: 890 } });
  expect(await creditBalance(user, false)).toBe(0);
  await expect(reserveCredits(client, user, randomUUID(), 1, false)).rejects.toBeInstanceOf(InsufficientCredits);
  expect((await database.query('SELECT credits FROM ai_credit_debits WHERE spend_id = $1', [spendId])).rows)
    .toEqual([{ credits: 3 }]);
});

it('expires unused weekly credits while keeping the payment settled', async () => {
  const user = 'weekly-credit-expiry';
  const payment = await sample(user);
  expect(await receive(payment)).toBe(true);
  expect(await creditBalance(user, false)).toBe(20);

  await database.query(`UPDATE ai_entitlements SET starts_at = now() - interval '7 days', ends_at = now()
    WHERE payment_reference = $1`, [payment.referenceId]);
  expect(await creditBalance(user, false)).toBe(0);
  expect(await receive(payment)).toBe(false);
  expect(await creditBalance(user, false)).toBe(0);
  expect((await database.query('SELECT status FROM payment_orders WHERE reference_id = $1', [payment.referenceId])).rows)
    .toEqual([{ status: 'paid' }]);
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

it.each([['credits_small', 990, 40], ['credits_large', 1990, 100]])(
  'credits %s to its order owner just once and revokes it on a matching full refund',
  async (plan, amount, credits) => {
    const user = 'customer-' + plan;
    const payment = await sample(user, plan, amount);
    expect(await receive({ ...payment, mode: 'TEST' })).toBe(false);
    expect(await receive(payment)).toBe(true);
    expect(await receive(payment)).toBe(false);
    expect(await creditBalance(user, false)).toBe(credits);
    expect(await creditBalance('other-user', false)).toBe(0);
    expect(await creditBalance(user, true)).toBe(0);

    const refund = { ...payment, uuid: 'refund-' + plan, originalTransactionUuid: payment.uuid,
      status: 'refunded', amount: -amount, invoice: { ...payment.invoice, refundedAmount: amount } };
    await receive({ ...refund, invoice: { ...refund.invoice, refundedAmount: amount - 1 } });
    expect(await creditBalance(user, false)).toBe(credits);
    await receive(refund);
    expect(await creditBalance(user, false)).toBe(0);
    expect(await receive(payment)).toBe(false);
  },
);

it('reserves both open orders and outstanding sold credits against the monthly spend ceiling', async () => {
  // Isolate the fixture from other tests through a transaction and rollback.
  await database.exec('BEGIN');
  try {
    await database.exec("UPDATE payment_orders SET status = 'cancelled' WHERE status IN ('paid', 'gateway-created')");
    const paid = await sample('funded-pack', 'credits_large', 1990);
    await receive(paid);
    await sample('open-pack', 'credits_small', 990);
    vi.stubEnv('MOTIVATIONS_PRODUCT_AI_MONTHLY_LIMIT_MICROS', '1600000');
    expect(await canFundOneTimePayrexxOrder(client, 'weekly')).toBe(true);
    vi.stubEnv('MOTIVATIONS_PRODUCT_AI_MONTHLY_LIMIT_MICROS', '1599999');
    expect(await canFundOneTimePayrexxOrder(client, 'weekly')).toBe(false);
    await database.exec("UPDATE ai_product_spend SET halted = true");
    expect(await canFundOneTimePayrexxOrder(client, 'weekly')).toBe(false);
  } finally {
    vi.unstubAllEnvs();
    await database.exec('ROLLBACK');
  }
});

it('restores a synthetic backup containing payment and credit records', async () => {
  const backup = await database.dumpDataDir();
  const restored = await PGlite.create({ loadDataDir: backup });
  try {
    expect((await restored.query("SELECT to_regclass('payment_orders_open_live_credit_pack') IS NOT NULL AS ready")).rows)
      .toEqual([{ ready: true }]);
    expect((await restored.query('SELECT count(*)::int AS orders FROM payment_orders')).rows)
      .toEqual((await database.query('SELECT count(*)::int AS orders FROM payment_orders')).rows);
    expect((await restored.query('SELECT count(*)::int AS entries FROM ai_credit_debits')).rows)
      .toEqual((await database.query('SELECT count(*)::int AS entries FROM ai_credit_debits')).rows);
  } finally {
    await restored.close();
  }
});
