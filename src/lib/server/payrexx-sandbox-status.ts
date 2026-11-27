import 'server-only';
import { z } from 'zod/v3';
import type { OneTimePlan } from '../plans';
import { databasePool } from './postgres';
import { applyWeeklySandboxEvent } from './payrexx-weekly';
import { applyWeeklyLiveEvent } from './payrexx-weekly-live';

const identifier = z.number().int().positive().max(2147483647);
const gatewaySchema = z.object({
  id: identifier,
  invoices: z.array(z.object({ transactions: z.array(z.object({ id: identifier })).default([]) })).default([]),
});
const transactionSchema = z.object({
  id: identifier,
  referenceId: z.string().uuid().nullish(),
  uuid: z.string().min(1).max(128),
  originalTransactionUuid: z.union([z.string().min(1).max(128), z.number().int().positive()]).nullish(),
  status: z.string(),
  amount: z.number().int().optional(),
  mode: z.string(),
  pspId: identifier,
  paymentType: z.string().nullish(),
  invoice: z.object({
    referenceId: z.string().uuid().nullish(),
    paymentRequestId: identifier.nullish(),
    currencyAlpha3: z.string(),
    products: z.array(z.object({ sku: z.string().nullish() })).nullish(),
    totalAmount: z.number().int(),
    originalAmount: z.number().int().positive(),
    refundedAmount: z.number().int().nonnegative().nullish(),
    test: z.union([z.boolean(), z.literal(0), z.literal(1)]).nullish(),
  }),
});

async function payrexxGet(instance: string, key: string, resource: 'Gateway' | 'Transaction', id: number) {
  const version = 'v1.19';
  const response = await fetch(`https://api.payrexx.com/${version}/${resource}/${id}/?instance=${encodeURIComponent(instance)}`, {
    headers: { 'X-API-KEY': key, Accept: 'application/json' },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new Error(`Payrexx ${resource} HTTP ${response.status}`);
  const body: { status?: string; data?: unknown[] | unknown } = await response.json();
  if (body.status !== 'success') throw new Error('Payrexx status unavailable');
  return Array.isArray(body.data) ? body.data[0] : body.data;
}

type GatewayConfiguration = { instance: string; pspId: number; key: string };
type MatchedGateway = { reference_id: string; payrexx_gateway_id: number };
type RestTransaction = z.infer<typeof transactionSchema>;

function normalizeGatewayTransaction(parsed: RestTransaction, order: MatchedGateway, config: GatewayConfiguration, sandbox: boolean) {
  const references = [parsed.referenceId, parsed.invoice.referenceId].filter(value => value != null);
  if (!references.length || references.some(value => value !== order.reference_id) ||
      (parsed.invoice.paymentRequestId != null && parsed.invoice.paymentRequestId !== order.payrexx_gateway_id) ||
      parsed.mode !== (sandbox ? 'TEST' : 'LIVE') || parsed.pspId !== config.pspId ||
      (parsed.invoice.test != null && Boolean(parsed.invoice.test) !== sandbox)) return null;
  return {
    uuid: parsed.uuid,
    ...(!sandbox && { instance: { name: config.instance }, originalTransactionUuid: parsed.originalTransactionUuid }),
    referenceId: parsed.referenceId,
    status: parsed.status,
    mode: parsed.mode,
    pspId: parsed.pspId,
    paymentType: parsed.paymentType,
    amount: parsed.amount ?? parsed.invoice.totalAmount,
    invoice: {
      referenceId: parsed.invoice.referenceId,
      currency: parsed.invoice.currencyAlpha3,
      products: parsed.invoice.products,
      originalAmount: parsed.invoice.originalAmount,
      refundedAmount: parsed.invoice.refundedAmount ?? undefined,
      test: sandbox,
      ...(!sandbox && { paymentRequestId: order.payrexx_gateway_id }),
    },
  };
}

const liveIdentity = z.object({ transaction: z.object({
  id: identifier,
  uuid: z.string().min(1).max(128),
  originalTransactionUuid: z.union([z.string().min(1).max(128), identifier]).nullish(),
  status: z.enum(['confirmed', 'refunded', 'chargeback', 'expired', 'cancelled']),
  mode: z.literal('LIVE'),
  instance: z.object({ name: z.string() }),
  pspId: identifier,
}) });

export async function reconcileLiveGatewayNotification(payload: unknown, order: MatchedGateway, config: GatewayConfiguration) {
  const identity = liveIdentity.safeParse(payload);
  if (!identity.success) return null;
  const event = identity.data.transaction;
  if (event.pspId !== config.pspId || event.instance.name.toLowerCase() !== config.instance.toLowerCase()) return null;
  const current = transactionSchema.parse(await payrexxGet(config.instance, config.key, 'Transaction', event.id));
  if (current.id !== event.id || current.uuid !== event.uuid) return null;
  const normalized = normalizeGatewayTransaction(current, order, config, false);
  if (!normalized) return null;
  if (current.invoice.paymentRequestId == null) {
    const gateway = gatewaySchema.parse(await payrexxGet(config.instance, config.key, 'Gateway', order.payrexx_gateway_id));
    if (gateway.id !== order.payrexx_gateway_id ||
        !gateway.invoices.some(invoice => invoice.transactions.some(transaction => transaction.id === event.id))) return null;
  }
  // The provider can briefly lag behind the signed callback. Preserve the
  // notification for retry instead of recording an eventual refund as handled.
  if ((event.status === 'refunded' || event.status === 'chargeback') &&
      !['refunded', 'chargeback'].includes(current.status)) throw new Error('Payrexx reversal has not propagated yet');
  if (event.status === 'confirmed' && !['confirmed', 'refunded', 'chargeback'].includes(current.status))
    throw new Error('Payrexx confirmation has not propagated yet');
  return { transaction: {
    ...normalized,
    originalTransactionUuid: normalized.originalTransactionUuid ?? event.originalTransactionUuid,
  } };
}

export function reconcileSandboxGateway(userId: string, config: GatewayConfiguration) {
  return reconcileWeeklyGateway(userId, config, true);
}

export function reconcileLiveGateway(userId: string, config: GatewayConfiguration, plan: OneTimePlan = 'weekly') {
  return reconcileWeeklyGateway(userId, config, false, plan);
}

async function reconcileWeeklyGateway(userId: string, config: GatewayConfiguration, sandbox: boolean, plan: OneTimePlan = 'weekly') {
  const pool = databasePool();
  const claim = await pool.query<{ reference_id: string; payrexx_gateway_id: number }>(
    `UPDATE payment_orders SET payrexx_status_checked_at = now()
     WHERE reference_id = (
       SELECT reference_id FROM payment_orders WHERE user_id = $1 AND ${sandbox ? 'sandbox AND sandbox_psp_id' : 'NOT sandbox AND live_psp_id'} = $2
       AND plan = $3 AND status IN ('gateway-created', 'paid') AND payrexx_gateway_id IS NOT NULL
       ORDER BY (status = 'gateway-created') DESC, created_at DESC LIMIT 1
     )
     AND (payrexx_status_checked_at IS NULL OR payrexx_status_checked_at < now() - interval '15 seconds')
     RETURNING reference_id, payrexx_gateway_id`, [userId, config.pspId, plan],
  );
  const order = claim.rows[0];
  if (!order) return;

  const gateway = gatewaySchema.parse(await payrexxGet(config.instance, config.key, 'Gateway', order.payrexx_gateway_id));
  if (gateway.id !== order.payrexx_gateway_id) throw new Error('Gateway identifier mismatch');
  const ids = [...new Set(gateway.invoices.flatMap(invoice => invoice.transactions.map(transaction => transaction.id)))].slice(-5);
  if (!ids.length) {
    if (sandbox) console.info('Payrexx test gateway has no transaction IDs', { invoiceCount: gateway.invoices.length });
    return;
  }
  const transactions = await Promise.all(ids.map(async id => {
    const body = await payrexxGet(config.instance, config.key, 'Transaction', id);
    const parsed = transactionSchema.parse(body);
    return parsed.id === id ? normalizeGatewayTransaction(parsed, order, config, sandbox) : null;
  }));

  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    for (const transaction of transactions) {
      if (!transaction) {
        if (sandbox) console.info('Payrexx test transaction did not match the order reference');
        continue;
      }
      if (sandbox) {
        const activated = await applyWeeklySandboxEvent(connection, { transaction }, config);
        if (!activated) console.info('Payrexx test transaction did not activate a pass');
      } else {
        await applyWeeklyLiveEvent(connection, { transaction }, config);
      }
    }
    await connection.query('COMMIT');
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}
