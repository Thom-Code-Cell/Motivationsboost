import 'server-only';
import type { PoolClient } from 'pg';
import { z } from 'zod/v3';
import { PLANS, recurringPlans, type RecurringPlan } from '../plans';
import { payrexxCatalog } from './payrexx-catalog';

const id = z.number().int().positive().max(2147483647);
const reference = z.string().uuid();
const transactionId = z.union([z.string().min(1).max(128), id]).transform(String);
const subscriptionTransaction = z.object({
  transaction: z.object({
    id,
    uuid: transactionId,
    instance: z.object({ name: z.string() }),
    mode: z.literal('LIVE'),
    pspId: id,
    type: z.literal('E-Commerce').optional(),
    paymentType: z.enum(['authorization', 'one-time', 'subscription']).nullish(),
    preAuthorizationId: id.nullish(),
    originalTransactionUuid: transactionId.nullish(),
    referenceId: reference.nullish(),
    amount: z.number().int(),
    status: z.enum(['authorized', 'confirmed', 'declined', 'refunded', 'chargeback']),
    invoice: z.object({
      referenceId: reference.nullish(),
      paymentRequestId: id.nullish(),
      currency: z.literal('CHF'),
      test: z.union([z.literal(0), z.literal(false)]),
      originalAmount: z.number().int().positive(),
      refundedAmount: z.number().int().nonnegative().nullish(),
      products: z.array(z.object({ sku: z.string().nullish() })).nullish(),
    }),
  }),
});
type SubscriptionTransaction = z.infer<typeof subscriptionTransaction>['transaction'];
type LiveSubscription = { instance: string; pspId: number };

export async function applyLiveSubscriptionTransaction(
  db: PoolClient, payload: unknown, config: LiveSubscription,
): Promise<{ matched: boolean; granted: boolean; authorizedReference?: string }> {
  const ignored = { matched: false, granted: false };
  const parsed = subscriptionTransaction.safeParse(payload);
  if (!parsed.success) return ignored;
  const event = parsed.data.transaction;
  const orderReference = event.referenceId ?? event.invoice.referenceId;
  if (!orderReference || event.pspId !== config.pspId ||
      event.instance.name.toLowerCase() !== config.instance.toLowerCase()) return ignored;

  const { rows: [order] } = await db.query<{ user_id: string; plan: RecurringPlan; amount: number }>(
    `SELECT user_id, plan, amount FROM payment_orders
     WHERE reference_id = $1 AND NOT sandbox AND live_psp_id = $2 AND plan = ANY($3::text[])
       AND currency = 'CHF' AND accepted_terms_version IS NOT NULL AND accepted_terms_at IS NOT NULL`,
    [orderReference, config.pspId, [...recurringPlans]],
  );
  if (!order || order.amount !== PLANS[order.plan].amount || order.amount !== event.invoice.originalAmount ||
      event.invoice.products?.some(product => product.sku && product.sku !== payrexxCatalog[order.plan].sku)) return ignored;
  const { rows: [schema] } = await db.query<{ ready: boolean }>(
    "SELECT to_regclass('public.payrexx_subscription_periods') IS NOT NULL AS ready",
  );
  if (!schema?.ready) return ignored;
  if (!(await db.query('SELECT id FROM "user" WHERE id = $1 FOR UPDATE', [order.user_id])).rowCount) return ignored;

  return event.status === 'authorized' ? bindTokenization(db, orderReference, event)
    : settleSubscriptionPeriod(db, orderReference, order.user_id, order.plan, event);
}

async function bindTokenization(db: PoolClient, orderReference: string, event: SubscriptionTransaction) {
  const ignored = { matched: false, granted: false };
  if (event.paymentType !== 'authorization' || event.preAuthorizationId !== event.id ||
      !event.invoice.paymentRequestId ||
      (event.invoice.referenceId && event.invoice.referenceId !== orderReference)) return ignored;

  const { rows: [checkout] } = await db.query<{ status: string; payrexx_gateway_id: number | null }>(
    'SELECT status, payrexx_gateway_id FROM payment_orders WHERE reference_id = $1 AND subscription_anchor FOR UPDATE', [orderReference],
  );
  // Keep response retryable if the signed token arrived before the gateway response.
  if (checkout?.status === 'pending') throw new Error('Subscription gateway has not been bound yet');
  if (checkout?.status !== 'gateway-created' || checkout.payrexx_gateway_id !== event.invoice.paymentRequestId) return ignored;

  const bound = await db.query(`
    INSERT INTO payrexx_subscriptions (reference_id, tokenization_id) VALUES ($1, $2)
    ON CONFLICT (reference_id) DO NOTHING`, [orderReference, event.id]);
  if (!bound.rowCount) {
    const duplicate = await db.query(
      'SELECT 1 FROM payrexx_subscriptions WHERE reference_id = $1 AND tokenization_id = $2', [orderReference, event.id],
    );
    if (!duplicate.rowCount) return ignored;
  }
  await db.query('UPDATE payment_orders SET gateway_url = NULL, updated_at = now() WHERE reference_id = $1', [orderReference]);
  return { matched: true, granted: false, authorizedReference: orderReference };
}

async function settleSubscriptionPeriod(db: PoolClient, orderReference: string, owner: string,
  plan: RecurringPlan, event: SubscriptionTransaction) {
  const ignored = { matched: false, granted: false };
  const { rows: [cycle] } = await db.query<{
    status: string; payrexx_transaction_id: string | null; subscription_reference: string; tokenization_id: number;
  }>(`
    SELECT payment.status, payment.payrexx_transaction_id, p.subscription_reference, s.tokenization_id
    FROM payrexx_subscription_periods p
    JOIN payrexx_subscriptions s ON s.reference_id = p.subscription_reference
    JOIN payment_orders anchor ON anchor.reference_id = s.reference_id
    JOIN payment_orders payment ON payment.reference_id = p.order_reference
    WHERE p.order_reference = $1 AND p.charge_requested_at IS NOT NULL
      AND anchor.user_id = $2 AND anchor.plan = $3 AND anchor.live_psp_id = payment.live_psp_id
      AND NOT anchor.sandbox
    FOR UPDATE OF payment, s`, [orderReference, owner, plan]);
  if (!cycle || (event.invoice.referenceId && event.invoice.referenceId !== orderReference &&
      event.invoice.referenceId !== cycle.subscription_reference)) return ignored;

  const reversed = event.status === 'refunded' || event.status === 'chargeback';
  const matchesOriginal = Boolean(cycle.payrexx_transaction_id &&
    (event.originalTransactionUuid ?? event.uuid) === cycle.payrexx_transaction_id);
  if (event.preAuthorizationId !== cycle.tokenization_id && !(reversed && matchesOriginal)) return ignored;

  if (reversed) {
    if ((cycle.payrexx_transaction_id && !matchesOriginal) ||
        (event.status === 'refunded' && event.invoice.refundedAmount !== PLANS[plan].amount)) return ignored;
    const reversedPayment = event.originalTransactionUuid ?? event.uuid;
    const updated = await db.query(`UPDATE payment_orders
      SET status = $2, payrexx_transaction_id = COALESCE(payrexx_transaction_id, $3), updated_at = now()
      WHERE reference_id = $1 AND status IN ('pending', 'paid')`, [orderReference, event.status, reversedPayment]);
    if (updated.rowCount) {
      await pauseRenewal(db, cycle.subscription_reference);
      await queueNotice(db, orderReference, event.status === 'refunded' ? 'refunded' : 'chargeback');
    }
    return { matched: true, granted: false };
  }

  if (event.status === 'declined') {
    const updated = await db.query(`UPDATE payment_orders SET status = 'gateway-error', updated_at = now()
      WHERE reference_id = $1 AND status = 'pending'`, [orderReference]);
    if (updated.rowCount) await pauseRenewal(db, cycle.subscription_reference);
    return { matched: true, granted: false };
  }
  if (event.status !== 'confirmed' || event.amount !== PLANS[plan].amount || event.invoice.refundedAmount) return ignored;
  const paid = await db.query(`
    UPDATE payment_orders SET status = 'paid', payrexx_transaction_id = $2,
      provider_confirmed_at = now(), updated_at = now()
    WHERE reference_id = $1 AND status = 'pending'`, [orderReference, event.uuid]);
  if (paid.rowCount) await queueNotice(db, orderReference, 'paid');
  return { matched: true, granted: Boolean(paid.rowCount) };
}

async function queueNotice(db: PoolClient, reference: string, kind: 'paid' | 'refunded' | 'chargeback') {
  await db.query('INSERT INTO payrexx_weekly_notices (order_reference, kind) VALUES ($1, $2) ON CONFLICT DO NOTHING', [reference, kind]);
}

async function pauseRenewal(db: PoolClient, reference: string) {
  await db.query(`UPDATE payrexx_subscriptions SET renewal_enabled = false,
    renewal_paused_at = COALESCE(renewal_paused_at, now()) WHERE reference_id = $1`, [reference]);
}
