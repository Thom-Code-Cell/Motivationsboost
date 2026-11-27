import { createHash } from 'node:crypto';
import { after, NextRequest, NextResponse } from 'next/server';
import { sendNextPayrexxTestNotice } from '@/lib/server/payrexx-test-notices';
import { sendNextPayrexxWeeklyNotice } from '@/lib/server/payrexx-weekly-notices';
import { databaseConnectionConfigured, databasePool } from '@/lib/server/postgres';
import { payrexxConfiguration, verifyPayrexxWebhook } from '@/lib/payrexx';
import { oneTimePlans } from '@/lib/plans';
import { payrexxReferenceId } from '@/lib/payrexx-reference';
import { weeklyCheckoutConfiguration, weeklyLiveWebhookConfiguration } from '@/lib/server/payrexx-checkout-config';
import { applyWeeklySandboxEvent } from '@/lib/server/payrexx-weekly';
import { applyWeeklyLiveEvent } from '@/lib/server/payrexx-weekly-live';
import { applyLiveSubscriptionTransaction } from '@/lib/server/payrexx-subscriptions';
import { reconcileLiveGatewayNotification } from '@/lib/server/payrexx-sandbox-status';
import { requestNextPayrexxSubscriptionCharge, subscriptionRenewalConfiguration } from '@/lib/server/payrexx-subscription-renewal';

function recordFields(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const source = payload as Record<string, unknown>;
  const nested = (value: unknown, key: string): unknown =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)[key]
      : undefined;
  const resource = source.transaction ?? source.subscription;
  const type = source.transaction ? 'transaction' : source.subscription ? 'subscription' : 'unknown';
  const id = nested(resource, 'uuid');
  const status = nested(resource, 'status');
  return {
    resourceType: type,
    resourceId: typeof id === 'string' ? id.slice(0, 128) : null,
    resourceStatus: typeof status === 'string' ? status.slice(0, 64) : null,
  };
}

export async function POST(request: NextRequest) {
  const config = payrexxConfiguration();
  const checkout = weeklyCheckoutConfiguration();
  const sandbox = checkout?.signingKey ? checkout : undefined;
  const live = weeklyLiveWebhookConfiguration();
  const signingKey = sandbox?.signingKey ?? live?.signingKey ?? config.signingKey;
  if (!config.webhookEnabled || !signingKey || !databaseConnectionConfigured() ||
      (process.env.VERCEL_ENV === 'production' && !live))
    return NextResponse.json({ error: 'Payrexx nicht aktiv.' }, { status: 503 });
  if (Number(request.headers.get('content-length') || '0') > 131072)
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  const body = await request.text();
  if (Buffer.byteLength(body, 'utf8') > 131072) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  const signature = request.headers.get('x-webhook-signature') || '';
  if (!verifyPayrexxWebhook(body, signature, signingKey))
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  let payload: unknown;
  try { payload = JSON.parse(body); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const referenceId = payrexxReferenceId(payload);
  const eventHash = createHash('sha256').update(body).digest('hex');
  const fields = recordFields(payload);
  let connection;
  try {
    if (!sandbox && !live) {
      const result = await recordEvent(databasePool());
      return NextResponse.json({ accepted: true, duplicate: result.rowCount === 0, premiumGranted: false });
    }
    let confirmedPayment: Awaited<ReturnType<typeof reconcileLiveGatewayNotification>> = null;
    if (live) {
      const order = referenceId && fields.resourceType === 'transaction' ? (await databasePool().query<{
        reference_id: string; status: string; payrexx_gateway_id: number | null;
      }>(`SELECT reference_id, status, payrexx_gateway_id FROM payment_orders WHERE reference_id = $1
        AND NOT sandbox AND live_psp_id = $2 AND plan = ANY($3::text[])`,
      [referenceId, live.pspId, [...oneTimePlans]])).rows[0] : undefined;
      if (!order) {
        connection = await databasePool().connect();
        await connection.query('BEGIN');
        const subscription = await applyLiveSubscriptionTransaction(connection, payload, live);
        const receipt = subscription.matched ? await recordEvent(connection) : null;
        await connection.query('COMMIT');
        if (subscription.matched) {
          after(() => sendNextPayrexxWeeklyNotice().catch(() => console.warn('Motivationsboost payment notice queue unavailable')));
        }
        if (receipt?.rowCount && subscription.authorizedReference) {
          const renewal = subscriptionRenewalConfiguration();
          const anchor = subscription.authorizedReference;
          if (renewal) after(() => requestNextPayrexxSubscriptionCharge(renewal, anchor)
            .then(() => undefined).catch(() => console.warn('Motivationsboost first payment requires reconciliation')));
        }
        return NextResponse.json({
          accepted: true, ignored: !subscription.matched, duplicate: receipt?.rowCount === 0, premiumGranted: subscription.granted,
        });
      }
      // A provider event can arrive before the Gateway identifier is written.
      if (order.status === 'pending') throw new Error('Matching gateway has not been bound yet');
      if (order.payrexx_gateway_id) {
        if (!config.key || config.key === process.env.PAYREXX_SANDBOX_API_KEY) throw new Error('Production Payrexx key is unavailable');
        confirmedPayment = await reconcileLiveGatewayNotification(payload,
          { ...order, payrexx_gateway_id: order.payrexx_gateway_id }, { ...live, key: config.key });
      }
      if (!confirmedPayment)
        return NextResponse.json({ accepted: true, ignored: true, premiumGranted: false });
    }
    connection = await databasePool().connect();
    await connection.query('BEGIN');
    const result = await recordEvent(connection);
    const premiumGranted = result.rowCount !== 0 &&
      (sandbox ? await applyWeeklySandboxEvent(connection, payload, sandbox) :
        live && confirmedPayment ? await applyWeeklyLiveEvent(connection, confirmedPayment, live) : false);
    await connection.query('COMMIT');
    if (sandbox) {
      after(() => sendNextPayrexxTestNotice().catch(() => console.warn('Motivationsboost test notice queue unavailable')));
    } else if (live) {
      after(() => sendNextPayrexxWeeklyNotice().catch(() => console.warn('Motivationsboost weekly notice queue unavailable')));
    }
    return NextResponse.json({ accepted: true, duplicate: result.rowCount === 0, premiumGranted });
  } catch {
    await connection?.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ error: 'Webhook konnte nicht dauerhaft gespeichert werden.' }, { status: 503 });
  } finally {
    connection?.release();
  }

  function recordEvent(database: Pick<ReturnType<typeof databasePool>, 'query'>) {
    return database.query(
      `INSERT INTO payrexx_webhook_events
         (event_hash, reference_id, resource_type, resource_id, resource_status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (event_hash) DO NOTHING
       RETURNING event_hash`,
      [eventHash, referenceId, fields.resourceType ?? 'unknown', fields.resourceId ?? null, fields.resourceStatus ?? null],
    );
  }
}
