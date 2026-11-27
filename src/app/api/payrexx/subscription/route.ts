import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { PLANS, recurringPlans } from '@/lib/plans';
import { productLocales } from '@/lib/product-locale';
import { publicProductApproved } from '@/lib/public-product';
import { isRequestOriginAllowed } from '@/lib/security';
import { requireAppSession } from '@/lib/server/app-session';
import { hasCurrentAiApproval } from '@/lib/server/openai-client';
import { payrexxCatalog } from '@/lib/server/payrexx-catalog';
import { payrexxCardMethods } from '@/lib/server/payrexx-margin';
import { termsVersion, weeklyGatewayValidityMinutes } from '@/lib/server/payrexx-checkout-config';
import { trustedSandboxGateway } from '@/lib/server/payrexx-checkout-order';
import { canFundPayrexxSubscriptionPeriod } from '@/lib/server/payrexx-credit-funding';
import { availableSubscriptionOffers, subscriptionPeriodEnd, subscriptionRenewalConfiguration, subscriptionTerms } from '@/lib/server/payrexx-subscription-renewal';
import { databasePool } from '@/lib/server/postgres';

const startSchema = z.object({
  action: z.literal('start'), plan: z.enum(recurringPlans), termsVersion, acceptTerms: z.literal(true), locale: z.enum(productLocales),
}).strict();
const cancellationSchema = z.object({ action: z.literal('cancel') }).strict();
const gatewaySchema = z.object({ id: z.number().int().positive().max(2147483647), link: z.string().url() });

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function subscriptionSchemaReady() {
  const { rows: [schema] } = await databasePool().query<{ ready: boolean }>(
    "SELECT to_regclass('public.payrexx_subscription_periods') IS NOT NULL AS ready",
  );
  return Boolean(schema?.ready);
}

export async function GET() {
  if (!publicProductApproved()) return reply({ offers: [] });
  try {
    const { user } = await requireAppSession();
    if (!('emailVerified' in user) || !user.emailVerified || !await subscriptionSchemaReady()) return reply({ offers: [] });
    const { rows: [current] } = await databasePool().query(`
      SELECT o.plan, o.status, s.renewal_enabled AS "renewalEnabled", s.cancellation_requested_at AS "cancelledAt",
        EXISTS (SELECT 1 FROM payrexx_subscription_periods p JOIN payment_orders cycle ON cycle.reference_id = p.order_reference
          WHERE p.subscription_reference = o.reference_id AND cycle.status = 'pending') AS "paymentPending",
        (SELECT max(p.ends_at) FROM payrexx_subscription_periods p JOIN payment_orders cycle ON cycle.reference_id = p.order_reference
          WHERE p.subscription_reference = o.reference_id AND cycle.status = 'paid' AND p.ends_at > now()) AS "paidUntil"
      FROM payment_orders o LEFT JOIN payrexx_subscriptions s USING (reference_id)
      WHERE o.user_id = $1 AND o.subscription_anchor AND NOT o.sandbox
      ORDER BY o.created_at DESC LIMIT 1`, [user.id]);
    const offers = availableSubscriptionOffers(weeklyGatewayValidityMinutes);
    return reply({ offers, current });
  } catch {
    return reply({ offers: [] });
  }
}

export async function POST(request: NextRequest) {
  if (!publicProductApproved() || !isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), process.env.NODE_ENV === 'production'))
    return reply({ error: 'Ungültiger Ursprung.' }, 403);
  const session = await requireAppSession().catch(() => null);
  if (!session || !('emailVerified' in session.user) || !session.user.emailVerified)
    return reply({ error: 'Bitte anmelden.' }, 401);
  const body = await request.json().catch(() => null);
  const start = startSchema.safeParse(body);
  const cancels = cancellationSchema.safeParse(body).success;
  if (!start.success && !cancels) return reply({ error: 'Ungültige Anfrage.' }, 400);
  if (!await subscriptionSchemaReady().catch(() => false)) return reply({ error: 'Abos sind derzeit nicht verfügbar.' }, 503);

  const pool = databasePool();
  const db = await pool.connect().catch(() => null);
  if (!db) return reply({ error: 'Abos sind derzeit nicht verfügbar.' }, 503);
  const owner = session.user.id;
  const reference = randomUUID();
  const config = start.success ? subscriptionRenewalConfiguration() : null;
  try {
    await db.query('BEGIN');
    if (!(await db.query('SELECT id FROM "user" WHERE id = $1 FOR UPDATE', [owner])).rowCount) throw new Error('Missing owner');
    if (cancels) {
      await db.query(`UPDATE payrexx_subscriptions s
        SET renewal_enabled = false, cancellation_requested_at = COALESCE(s.cancellation_requested_at, now())
        FROM payment_orders anchor WHERE anchor.reference_id = s.reference_id AND anchor.user_id = $1 AND NOT anchor.sandbox`, [owner]);
      await db.query(`UPDATE payment_orders SET status = 'cancelled', gateway_url = NULL, updated_at = now()
        WHERE user_id = $1 AND subscription_anchor AND NOT sandbox AND status IN ('pending', 'gateway-created')`, [owner]);
      await db.query('COMMIT');
      return reply({ cancelled: true });
    }
    if (!start.success || !config || subscriptionTerms(start.data.plan) !== start.data.termsVersion) {
      await db.query('ROLLBACK');
      return reply({ error: 'Abo-Freigabe fehlt.' }, 503);
    }
    const plan = PLANS[start.data.plan];
    const begins = new Date();
    const ends = subscriptionPeriodEnd(plan.id, begins);
    const through = subscriptionPeriodEnd(plan.id, new Date(begins.getTime() + weeklyGatewayValidityMinutes * 60_000));
    if (!hasCurrentAiApproval(through.getTime()) || !await canFundPayrexxSubscriptionPeriod(db, plan.id, begins, ends)) {
      await db.query('ROLLBACK');
      return reply({ error: 'Neue Bestellungen sind wegen des KI-Kostenlimits vorübergehend geschlossen.' }, 503);
    }
    const previous = (await db.query<{ plan: string; gateway_url: string | null; resumable: boolean }>(`
      SELECT a.plan, a.gateway_url, a.gateway_expires_at > now() AS resumable FROM payment_orders a
      WHERE a.user_id = $1 AND NOT a.sandbox AND a.subscription_anchor AND
        (a.status IN ('pending', 'gateway-created') OR EXISTS (
          SELECT 1 FROM payrexx_subscription_periods p JOIN payment_orders cycle ON p.order_reference = cycle.reference_id
          WHERE p.subscription_reference = a.reference_id AND (cycle.status = 'pending' OR (cycle.status = 'paid' AND p.ends_at > now()))
        )) LIMIT 1`, [owner])).rows[0];
    if (previous) {
      await db.query('ROLLBACK');
      if (previous.plan === plan.id && previous.gateway_url && previous.resumable)
        return reply({ url: trustedSandboxGateway(previous.gateway_url, config.instance).toString() });
      return reply({ error: 'Zu deinem Benutzerkonto besteht bereits eine Abo-Bestellung.' }, 409);
    }
    await db.query(`INSERT INTO payment_orders
      (reference_id, user_id, plan, amount, currency, status, sandbox, live_psp_id, accepted_terms_version,
       accepted_terms_at, customer_locale, subscription_anchor)
      VALUES ($1, $2, $3, $4, 'CHF', 'pending', false, $5, $6, now(), $7, true)`,
    [reference, owner, plan.id, plan.amount, config.pspId, start.data.termsVersion, start.data.locale]);
    await db.query('COMMIT');
  } catch {
    await db.query('ROLLBACK').catch(() => {});
    return reply({ error: 'Abo-Bestellung derzeit nicht verfügbar.' }, 503);
  } finally {
    db.release();
  }

  if (!start.success || !config) return reply({ error: 'Abo-Freigabe fehlt.' }, 503);
  const plan = PLANS[start.data.plan];
  try {
    const response = await fetch(`https://api.payrexx.com/v1.19/Gateway/?instance=${encodeURIComponent(config.instance)}`, {
      method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
      headers: { 'X-API-KEY': config.key, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: plan.amount, currency: plan.currency, referenceId: reference, validity: weeklyGatewayValidityMinutes,
        psp: [config.pspId], pm: payrexxCardMethods, purpose: `Motivationsboost ${plan.label}`,
        sku: payrexxCatalog[plan.id].sku, preAuthorization: true, reservation: false, chargeOnAuthorization: false,
        successRedirectUrl: config.origin + '/app?payment=pending',
        cancelRedirectUrl: config.origin + '/app?payment=cancelled',
        failedRedirectUrl: config.origin + '/app?payment=failed',
      }),
    });
    if ([400, 401, 403, 404, 422].includes(response.status)) {
      await pool.query("UPDATE payment_orders SET status = 'gateway-error', updated_at = now() WHERE reference_id = $1 AND status = 'pending'", [reference]);
      return reply({ error: 'Payrexx hat die Abo-Bestellung abgelehnt.' }, 502);
    }
    if (!response.ok) throw new Error('Gateway request not confirmed');
    const result = await response.json() as { data?: unknown };
    const gateway = gatewaySchema.parse(Array.isArray(result.data) ? result.data[0] : result.data);
    const url = trustedSandboxGateway(gateway.link, config.instance).toString();
    const saved = await pool.query(`UPDATE payment_orders SET status = 'gateway-created', gateway_url = $2,
      payrexx_gateway_id = $3, gateway_expires_at = created_at + ($4 * interval '1 minute'), updated_at = now()
      WHERE reference_id = $1 AND status = 'pending'`, [reference, url, gateway.id, weeklyGatewayValidityMinutes]);
    if (!saved.rowCount) return reply({ error: 'Die Abo-Bestellung wurde beendet.' }, 409);
    return reply({ url });
  } catch {
    return reply({ error: 'Payrexx hat die Abo-Bestellung noch nicht eindeutig bestätigt.' }, 502);
  }
}
