import 'server-only';
import type { PoolClient } from 'pg';
import { z } from 'zod/v3';
import { PLANS, oneTimePlans, type OneTimePlan } from '@/lib/plans';

const transactionId = z.union([z.string().min(1).max(128), z.number().int().positive()]).transform(String);
const liveEvent = z.object({
  transaction: z.object({
    uuid: transactionId,
    originalTransactionUuid: transactionId.nullish(),
    referenceId: z.string().uuid().nullish(),
    instance: z.object({ name: z.string() }),
    type: z.literal('E-Commerce').optional(),
    mode: z.literal('LIVE'),
    pspId: z.number().int().positive(),
    paymentType: z.literal('one-time').nullish(),
    status: z.enum(['confirmed', 'refunded', 'chargeback', 'expired', 'cancelled']),
    amount: z.number().int(),
    invoice: z.object({
      referenceId: z.string().uuid().nullish(),
      paymentRequestId: z.number().int().positive().nullish(),
      currency: z.literal('CHF'),
      test: z.union([z.literal(false), z.literal(0)]),
      originalAmount: z.number().int().positive(),
      refundedAmount: z.number().int().nonnegative().nullish(),
    }),
  }),
});

type WeeklyOrder = {
  user_id: string;
  plan: OneTimePlan;
  status: string;
  payrexx_gateway_id: number;
  payrexx_transaction_id: string | null;
};

export async function applyWeeklyLiveEvent(db: PoolClient, payload: unknown, expected: { instance: string; pspId: number }) {
  const parsed = liveEvent.safeParse(payload);
  if (!parsed.success) return false;
  const { transaction } = parsed.data;
  const { invoice } = transaction;
  const reference = transaction.referenceId ?? invoice.referenceId;
  if (!reference || (transaction.referenceId && invoice.referenceId && transaction.referenceId !== invoice.referenceId) ||
      transaction.pspId !== expected.pspId || transaction.instance.name.toLowerCase() !== expected.instance.toLowerCase() ||
      !oneTimePlans.some(plan => PLANS[plan].amount === invoice.originalAmount)) return false;

  const orderMatch = `reference_id = $1 AND NOT sandbox AND plan = ANY($4::text[]) AND live_psp_id = $2
    AND amount = $3 AND currency = 'CHF' AND accepted_terms_at IS NOT NULL AND accepted_terms_version IS NOT NULL
    AND payrexx_gateway_id IS NOT NULL`;
  const identifiers = [reference, expected.pspId, invoice.originalAmount, [...oneTimePlans]];
  const owner = (await db.query<{ user_id: string }>(`SELECT user_id FROM payment_orders WHERE ${orderMatch}`, identifiers)).rows[0];
  if (!owner) return false;
  // Checkout and fulfilment both acquire the account lock before changing an order.
  if (!(await db.query('SELECT id FROM "user" WHERE id = $1 FOR UPDATE', [owner.user_id])).rows.length) return false;
  const { rows: [order] } = await db.query<WeeklyOrder>(
    `SELECT user_id, plan, status, payrexx_gateway_id, payrexx_transaction_id FROM payment_orders
     WHERE ${orderMatch} AND user_id = $5 FOR UPDATE`, [...identifiers, owner.user_id],
  );
  if (!order || PLANS[order.plan].amount !== invoice.originalAmount || (invoice.paymentRequestId != null && invoice.paymentRequestId !== order.payrexx_gateway_id)) return false;

  if (transaction.status === 'expired' || transaction.status === 'cancelled') {
    if (invoice.paymentRequestId !== order.payrexx_gateway_id) return false;
    await db.query(
      `UPDATE payment_orders SET status = 'cancelled', gateway_url = NULL, updated_at = now()
       WHERE reference_id = $1 AND status = 'gateway-created' AND gateway_expires_at <= now()`, [reference],
    );
    return false;
  }

  if (transaction.status === 'refunded' || transaction.status === 'chargeback') {
    const paymentId = transaction.originalTransactionUuid ?? transaction.uuid;
    const matchesSettledPayment = order.status === 'paid' && paymentId === order.payrexx_transaction_id;
    const matchesUnsettledGateway = order.status === 'gateway-created' && invoice.paymentRequestId === order.payrexx_gateway_id;
    if (!(matchesSettledPayment || matchesUnsettledGateway) ||
        (transaction.status === 'refunded' && invoice.refundedAmount !== PLANS[order.plan].amount)) return false;
    await db.query("UPDATE ai_entitlements SET status = 'refunded' WHERE user_id = $1 AND payment_reference = $2", [order.user_id, reference]);
    await db.query(`UPDATE payment_orders SET status = $2, gateway_url = NULL,
      payrexx_transaction_id = COALESCE(payrexx_transaction_id, $3), updated_at = now() WHERE reference_id = $1`,
    [reference, transaction.status, paymentId]);
    await db.query('INSERT INTO payrexx_weekly_notices (order_reference, kind) VALUES ($1, $2) ON CONFLICT DO NOTHING', [reference, transaction.status]);
    return false;
  }

  if (order.status !== 'gateway-created' || invoice.paymentRequestId !== order.payrexx_gateway_id ||
      transaction.amount !== PLANS[order.plan].amount || invoice.refundedAmount) return false;
  if (order.plan === 'weekly') {
    const active = await db.query("SELECT 1 FROM ai_entitlements WHERE user_id = $1 AND status = 'active' AND ends_at > now()", [order.user_id]);
    if (active.rows.length) {
      // Roll back the webhook receipt to retain provider retries and operator visibility.
      throw new Error('Confirmed weekly order would overlap an existing entitlement.');
    }
    await db.query(
      `INSERT INTO ai_entitlements (user_id, plan, starts_at, ends_at, status, payment_reference)
       VALUES ($1, 'weekly', now(), now() + interval '7 days', 'active', $2)
       ON CONFLICT (user_id) DO UPDATE SET plan = excluded.plan, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
         status = excluded.status, payment_reference = excluded.payment_reference`, [order.user_id, reference],
    );
  }
  await db.query(
    `UPDATE payment_orders SET status = 'paid', payrexx_transaction_id = $2, gateway_url = NULL,
       provider_confirmed_at = now(), updated_at = now() WHERE reference_id = $1`, [reference, transaction.uuid],
  );
  await db.query("INSERT INTO payrexx_weekly_notices (order_reference, kind) VALUES ($1, 'paid') ON CONFLICT DO NOTHING", [reference]);
  return true;
}
