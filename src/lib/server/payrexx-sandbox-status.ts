import 'server-only';
import { z } from 'zod/v3';
import { databasePool } from './postgres';
import { applyWeeklySandboxEvent } from './payrexx-weekly';

const identifier = z.number().int().positive().max(2147483647);
const gatewaySchema = z.object({
  id: identifier,
  invoices: z.array(z.object({ transactions: z.array(z.object({ id: identifier })).default([]) })).default([]),
});
const transactionSchema = z.object({
  id: identifier,
  referenceId: z.string().uuid().nullish(),
  invoice: z.object({ referenceId: z.string().uuid().nullish(), paymentRequestId: identifier.nullish() }),
}).passthrough();

async function payrexxGet(instance: string, key: string, resource: 'Gateway' | 'Transaction', id: number) {
  const version = resource === 'Gateway' ? 'v1.17' : 'v1.18';
  const response = await fetch(`https://api.payrexx.com/${version}/${resource}/${id}/?instance=${encodeURIComponent(instance)}`, {
    headers: { 'X-API-KEY': key, Accept: 'application/json' },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new Error('Payrexx status unavailable');
  const body: { status?: string; data?: unknown[] | unknown } = await response.json();
  if (body.status !== 'success') throw new Error('Payrexx status unavailable');
  return Array.isArray(body.data) ? body.data[0] : body.data;
}

export async function reconcileSandboxGateway(userId: string, config: { instance: string; pspId: number; key: string }) {
  const pool = databasePool();
  const claim = await pool.query<{ reference_id: string; payrexx_gateway_id: number }>(
    `UPDATE payment_orders SET payrexx_status_checked_at = now()
     WHERE reference_id = (
       SELECT reference_id FROM payment_orders WHERE user_id = $1 AND sandbox AND sandbox_psp_id = $2
       AND plan = 'weekly' AND status IN ('gateway-created', 'paid') AND payrexx_gateway_id IS NOT NULL
       ORDER BY (status = 'gateway-created') DESC, created_at DESC LIMIT 1
     )
     AND (payrexx_status_checked_at IS NULL OR payrexx_status_checked_at < now() - interval '15 seconds')
     RETURNING reference_id, payrexx_gateway_id`, [userId, config.pspId],
  );
  const order = claim.rows[0];
  if (!order) return;

  const gateway = gatewaySchema.parse(await payrexxGet(config.instance, config.key, 'Gateway', order.payrexx_gateway_id));
  if (gateway.id !== order.payrexx_gateway_id) throw new Error('Gateway identifier mismatch');
  const ids = [...new Set(gateway.invoices.flatMap(invoice => invoice.transactions.map(transaction => transaction.id)))].slice(-5);
  if (!ids.length) return;
  const transactions = await Promise.all(ids.map(async id => {
    const body = await payrexxGet(config.instance, config.key, 'Transaction', id);
    const parsed = transactionSchema.parse(body);
    if (parsed.id !== id || (parsed.referenceId ?? parsed.invoice.referenceId) !== order.reference_id ||
        (parsed.invoice.paymentRequestId != null && parsed.invoice.paymentRequestId !== order.payrexx_gateway_id)) return null;
    // Keep the provider invoice fields needed by the existing signed-event validator.
    return body;
  }));

  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    for (const transaction of transactions) {
      if (transaction) await applyWeeklySandboxEvent(connection, { transaction }, config);
    }
    await connection.query('COMMIT');
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}
