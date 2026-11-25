import 'server-only';
import type { PoolClient } from 'pg';
import { z } from 'zod/v3';

const eventSchema = z.object({
  transaction: z.object({
    uuid: z.union([z.string().min(1).max(128), z.number().int().positive()]).transform(String),
    referenceId: z.string().uuid().nullish(),
    status: z.enum(['confirmed', 'refunded', 'expired']),
    mode: z.literal('TEST'),
    pspId: z.number().int().positive(),
    paymentType: z.literal('one-time').nullish(),
    instance: z.object({ name: z.string() }).optional(),
    amount: z.number().int().nonnegative(),
    invoice: z.object({
      referenceId: z.string().uuid().nullish(),
      originalAmount: z.number().int().positive(),
      refundedAmount: z.number().int().nonnegative().optional(),
      currency: z.literal('CHF'),
      test: z.union([z.literal(true), z.literal(1)]),
    }).passthrough(),
  }).passthrough(),
}).passthrough();

export function weeklySandboxEnabled() {
  const isolatedEnvironment = process.env.VERCEL_ENV === 'preview' ||
    (!process.env.VERCEL && process.env.VERCEL_ENV !== 'production' && process.env.NODE_ENV !== 'production');
  return isolatedEnvironment &&
    process.env.PAYREXX_WEEKLY_SANDBOX_ENTITLEMENTS_ENABLED === 'true';
}

async function enqueueTestNotice(db: PoolClient, reference: string, kind: 'paid' | 'refunded') {
  await db.query('INSERT INTO payrexx_test_notices (order_reference, kind) VALUES ($1, $2) ON CONFLICT DO NOTHING', [reference, kind]);
}

export async function applyWeeklySandboxEvent(db: PoolClient, payload: unknown, expected: { instance: string; pspId: number }) {
  const parsed = eventSchema.safeParse(payload);
  if (!parsed.success) return false;
  const { transaction } = parsed.data;
  if (transaction.pspId !== expected.pspId ||
      (transaction.instance && transaction.instance.name.toLowerCase() !== expected.instance.toLowerCase())) return false;
  const { invoice } = transaction;
  const reference = transaction.referenceId ?? invoice.referenceId;
  if (!reference || (transaction.referenceId && invoice.referenceId && transaction.referenceId !== invoice.referenceId)) return false;

  const found = await db.query<{ user_id: string; status: string; amount: number; payrexx_transaction_id: string | null }>(
    `SELECT user_id, status, amount, payrexx_transaction_id FROM payment_orders
     WHERE reference_id = $1 AND sandbox AND sandbox_psp_id = $2 AND plan = 'weekly' AND currency = 'CHF' FOR UPDATE`, [reference, expected.pspId],
  );
  const order = found.rows[0];
  if (!order || order.amount !== invoice.originalAmount) return false;
  if (transaction.status === 'expired') {
    await db.query(
      `UPDATE payment_orders SET status = 'cancelled', updated_at = now()
       WHERE reference_id = $1 AND status = 'gateway-created' AND gateway_expires_at <= now()`,
      [reference],
    );
    return false;
  }
  if (transaction.status === 'refunded') {
    if (order.status !== 'paid' || order.payrexx_transaction_id !== transaction.uuid ||
        invoice.refundedAmount !== order.amount) return false;
    await db.query("UPDATE ai_entitlements SET status = 'refunded' WHERE payment_reference = $1 AND user_id = $2", [reference, order.user_id]);
    await db.query("UPDATE payment_orders SET status = 'refunded', updated_at = now() WHERE reference_id = $1", [reference]);
    await enqueueTestNotice(db, reference, 'refunded');
    return false;
  }
  if (order.status !== 'gateway-created' || transaction.amount !== order.amount || invoice.refundedAmount) return false;

  // Serialize separate payments for the same account and preserve other active entitlements.
  await db.query('SELECT id FROM "user" WHERE id = $1 FOR UPDATE', [order.user_id]);
  const existing = await db.query("SELECT 1 FROM ai_entitlements WHERE user_id = $1 AND status = 'active' AND ends_at > now()", [order.user_id]);
  if (existing.rowCount) return false;
  await db.query(
    `INSERT INTO ai_entitlements (user_id, plan, starts_at, ends_at, status, payment_reference)
     VALUES ($1, 'weekly', now(), now() + interval '7 days', 'active', $2)
     ON CONFLICT (user_id) DO UPDATE SET plan = excluded.plan, starts_at = excluded.starts_at,
       ends_at = excluded.ends_at, status = excluded.status, payment_reference = excluded.payment_reference`,
    [order.user_id, reference],
  );
  await db.query(
    "UPDATE payment_orders SET status = 'paid', payrexx_transaction_id = $2, updated_at = now() WHERE reference_id = $1",
    [reference, transaction.uuid],
  );
  await enqueueTestNotice(db, reference, 'paid');
  return true;
}
