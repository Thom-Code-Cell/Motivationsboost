import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { payrexxCatalog } from '@/lib/server/payrexx-catalog';
import { payrexxCardMethods } from '@/lib/server/payrexx-margin';
import { getPlan } from '@/lib/payrexx';
import { oneTimePlans } from '@/lib/plans';
import { canFundOneTimePayrexxOrder } from '@/lib/server/payrexx-credit-funding';
import { databasePool } from '@/lib/server/postgres';
import { requireAppSession } from '@/lib/server/app-session';
import { isRequestOriginAllowed } from '@/lib/security';
import { productLocales } from '@/lib/product-locale';
import { creditPackTerms, termsVersion, weeklyCheckoutConfiguration, weeklyGatewayValidityMinutes, weeklyLiveCheckoutConfiguration, weeklyLiveWebhookConfiguration } from '@/lib/server/payrexx-checkout-config';
import { latestLiveOrder, latestSandboxOrder, resumableSandboxGateway, trustedSandboxGateway } from '@/lib/server/payrexx-checkout-order';

const bodySchema = z.object({ plan: z.enum(oneTimePlans), termsVersion, acceptTerms: z.literal(true), locale: z.enum(productLocales).optional() }).strict();
const gatewayData = z.object({ link: z.string().url(), id: z.number().int().positive().max(2147483647).optional() });

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function checkoutForUser(user: Awaited<ReturnType<typeof requireAppSession>>['user']) {
  const sandbox = weeklyCheckoutConfiguration();
  if (sandbox) return sandbox;
  if (!('emailVerified' in user) || user.emailVerified !== true) return null;
  return weeklyLiveCheckoutConfiguration(user.email);
}

export async function GET(request: NextRequest) {
  const selected = z.enum(oneTimePlans).safeParse(request.nextUrl.searchParams.get('plan') ?? 'weekly');
  if (!selected.success) return reply({ enabled: false });
  if (!weeklyCheckoutConfiguration() && !weeklyLiveWebhookConfiguration()) return reply({ enabled: false });
  let user;
  try { user = (await requireAppSession()).user; }
  catch { return reply({ error: 'Bitte anmelden.' }, 401); }
  const config = checkoutForUser(user);
  if (!config) return reply({ enabled: false });
  const plan = selected.data;
  const approvedTerms = plan === 'weekly' ? config.termsVersion : !config.sandbox && !config.acceptanceOnly && creditPackTerms(plan);
  if (!approvedTerms) return reply({ enabled: false });

  try {
    const order = await (config.sandbox ? latestSandboxOrder(user.id) : latestLiveOrder(user.id, plan));
    const url = resumableSandboxGateway(order, config);
    const active = plan === 'weekly' && await databasePool().query(
      "SELECT 1 FROM ai_entitlements WHERE user_id = $1 AND status = 'active' AND ends_at > now()", [user.id],
    );
    return reply({ enabled: true, ...(!config.sandbox && { sandbox: false }), termsVersion: approvedTerms, orderStatus: order?.status,
      active: Boolean(active && active.rowCount), canResume: Boolean(url),
      canReconcile: config.pollingEnabled && (order?.status === 'gateway-created' || order?.status === 'paid') });
  } catch {
    return reply({ error: 'Zahlungsstatus derzeit nicht verfügbar.' }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!weeklyCheckoutConfiguration() && !weeklyLiveWebhookConfiguration())
    return reply({ error: 'Payrexx-Zahlungen sind noch nicht freigeschaltet.' }, 503);
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), process.env.NODE_ENV === 'production'))
    return reply({ error: 'Ungültiger Ursprung.' }, 403);

  let user;
  try { user = (await requireAppSession()).user; }
  catch { return reply({ error: 'Bitte anmelden.' }, 401); }
  const config = checkoutForUser(user);
  if (!config) return reply({ error: 'Payrexx-Zahlungen sind noch nicht freigeschaltet.' }, 503);
  const userId = user.id;

  const data = bodySchema.safeParse(await request.json().catch(() => null));
  const requestedPlan = data.success ? data.data.plan : 'weekly';
  const approvedTerms = requestedPlan === 'weekly' ? config.termsVersion : !config.sandbox && !config.acceptanceOnly && creditPackTerms(requestedPlan);
  if (!data.success || !approvedTerms || data.data.termsVersion !== approvedTerms)
    return reply({ error: config.sandbox ? 'Bitte bestätige die gültigen Testbedingungen und wähle den Wochenpass.' :
      'Bitte bestätige die gültigen Bedingungen und wähle den Wochenpass.' }, 400);

  const previous = await (config.sandbox ? latestSandboxOrder(userId) : latestLiveOrder(userId, requestedPlan)).catch(() => null);
  if (previous === null) return reply({ error: 'Zahlungsstatus derzeit nicht verfügbar.' }, 503);
  const previousUrl = resumableSandboxGateway(previous, config);
  if (previousUrl) return reply({ url: previousUrl });

  const plan = getPlan(requestedPlan);
  const referenceId = randomUUID();
  const database = databasePool();
  const started = await database.connect().catch(() => null);
  if (!started) return reply({ error: 'Bestellung derzeit nicht verfügbar.' }, 503);
  try {
    await started.query('BEGIN');
    const owner = await started.query('SELECT id FROM "user" WHERE id = $1 FOR UPDATE', [userId]);
    if (!owner.rowCount) throw new Error('Order owner unavailable');
    const active = requestedPlan === 'weekly' && await started.query(
      "SELECT 1 FROM ai_entitlements WHERE user_id = $1 AND status = 'active' AND ends_at > now()", [userId],
    );
    if (active && active.rowCount) {
      await started.query('ROLLBACK');
      return reply({ error: 'Du hast bereits einen aktiven Zugang.' }, 409);
    }
    if (!config.sandbox && config.acceptanceOnly) {
      const completed = await started.query(`SELECT 1 FROM payment_orders
        WHERE user_id = $1 AND NOT sandbox AND plan = 'weekly'
        AND live_psp_id = $2 AND status IN ('paid', 'refunded', 'chargeback') LIMIT 1`, [userId, config.pspId]);
      if (completed.rowCount) {
        await started.query('ROLLBACK');
        return reply({ error: 'Die Live-Abnahme wurde bereits durchgeführt.' }, 409);
      }
    }
    if (!config.sandbox && !await canFundOneTimePayrexxOrder(started, requestedPlan)) {
      await started.query('ROLLBACK');
      return reply({ error: 'Neue Bestellungen sind wegen des KI-Kostenlimits vorübergehend geschlossen.' }, 503);
    }
    const orderValues = [referenceId, userId, plan.id, plan.amount, plan.currency, approvedTerms, config.pspId];
    const inserted = config.sandbox ? await started.query(
      `INSERT INTO payment_orders (reference_id, user_id, plan, amount, currency, status, accepted_terms_version, accepted_terms_at, sandbox, sandbox_psp_id)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, now(), true, $7)
       ON CONFLICT DO NOTHING RETURNING reference_id`, orderValues,
    ) : await started.query(
      `INSERT INTO payment_orders (reference_id, user_id, plan, amount, currency, status, accepted_terms_version, accepted_terms_at, sandbox, live_psp_id, customer_locale)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, now(), false, $7, $8)
       ON CONFLICT DO NOTHING RETURNING reference_id`, [...orderValues, data.data.locale ?? 'de'],
    );
    await started.query('COMMIT');
    if (!inserted.rowCount) return reply({ error: config.sandbox ? 'Eine Testbestellung ist bereits offen. Bitte aktualisiere den Zahlungsstatus.' :
      'Eine Bestellung ist bereits offen. Bitte aktualisiere den Zahlungsstatus.' }, 409);
  } catch {
    await started.query('ROLLBACK').catch(() => {});
    return reply({ error: 'Bestellung derzeit nicht verfügbar.' }, 503);
  } finally {
    started.release();
  }

  try {
    const endpoint = `https://api.payrexx.com/v1.19/Gateway/?instance=${encodeURIComponent(config.instance)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'X-API-KEY': config.key, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        amount: plan.amount, currency: plan.currency, referenceId, validity: weeklyGatewayValidityMinutes,
        psp: [config.pspId],
        ...(!config.sandbox && { pm: config.acceptanceOnly ? ['twint'] : [...payrexxCardMethods, 'twint'] }),
        purpose: config.sandbox ? 'Motivationsboost Wochenpass (Test)' : `Motivationsboost ${plan.label}`,
        ...(!config.sandbox && { sku: payrexxCatalog[plan.id].sku, preAuthorization: false, reservation: false }),
        successRedirectUrl: config.origin + '/app?payment=pending',
        cancelRedirectUrl: config.origin + '/app?payment=cancelled',
        failedRedirectUrl: config.origin + '/app?payment=failed',
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });
    if ([400, 401, 403, 404, 422].includes(response.status)) {
      await database.query("UPDATE payment_orders SET status = 'gateway-error', updated_at = now() WHERE reference_id = $1 AND status = 'pending'", [referenceId]);
      return reply({ error: config.sandbox ? 'Payrexx hat die Testbestellung abgelehnt.' : 'Payrexx hat die Bestellung abgelehnt.' }, 502);
    }
    if (!response.ok) throw new Error('Unconfirmed gateway result');
    const result = await response.json() as { data?: unknown };
    const gateway = gatewayData.parse(Array.isArray(result.data) ? result.data[0] : result.data);
    if ((!config.sandbox || config.pollingEnabled) && !gateway.id) throw new Error('Gateway ID missing');
    const url = trustedSandboxGateway(gateway.link, config.instance);
    const saved = await database.query(
      `UPDATE payment_orders SET status = 'gateway-created', gateway_url = $2,
       gateway_expires_at = created_at + ($3 * interval '1 minute'), payrexx_gateway_id = $4, updated_at = now()
       WHERE reference_id = $1 AND status = 'pending' RETURNING reference_id`,
      [referenceId, url.toString(), weeklyGatewayValidityMinutes, gateway.id ?? null],
    );
    if (!saved.rowCount) throw new Error('Gateway was not saved');
    return reply({ url: url.toString() });
  } catch {
    // A timeout or invalid response does not prove Payrexx failed to create the gateway.
    return reply({ error: 'Payrexx hat den Auftrag noch nicht eindeutig bestätigt. Bitte wende dich an den Support.' }, 502);
  }
}
