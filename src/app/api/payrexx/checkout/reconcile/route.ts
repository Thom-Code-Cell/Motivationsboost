import { z } from 'zod/v3';
import { oneTimePlans } from '@/lib/plans';
import { after, NextRequest, NextResponse } from 'next/server';
import { sendNextPayrexxTestNotice } from '@/lib/server/payrexx-test-notices';
import { sendNextPayrexxWeeklyNotice } from '@/lib/server/payrexx-weekly-notices';
import { isRequestOriginAllowed } from '@/lib/security';
import { requireAppSession } from '@/lib/server/app-session';
import { livePayrexxReconciliationConfiguration, weeklyCheckoutConfiguration } from '@/lib/server/payrexx-checkout-config';
import { reconcileLiveGateway, reconcileSandboxGateway } from '@/lib/server/payrexx-sandbox-status';

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const selected = z.enum(oneTimePlans).safeParse(request.nextUrl.searchParams.get('plan') ?? 'weekly');
  if (!selected.success) return reply({ error: 'Unbekanntes Angebot.' }, 400);
  const plan = selected.data;
  const sandbox = plan === 'weekly' ? weeklyCheckoutConfiguration() : null;
  const live = livePayrexxReconciliationConfiguration();
  if (!sandbox?.pollingEnabled && !live) return reply({ error: 'Payrexx-Statusprüfung ist nicht freigeschaltet.' }, 503);
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), process.env.NODE_ENV === 'production'))
    return reply({ error: 'Ungültiger Ursprung.' }, 403);
  let user;
  try { user = (await requireAppSession()).user; }
  catch { return reply({ error: 'Bitte anmelden.' }, 401); }
  if (!sandbox?.pollingEnabled && (!('emailVerified' in user) || user.emailVerified !== true))
    return reply({ error: 'Bitte bestätige deine E-Mail-Adresse.' }, 403);
  try {
    if (sandbox?.pollingEnabled) {
      await reconcileSandboxGateway(user.id, sandbox);
      after(() => sendNextPayrexxTestNotice().catch(() => console.warn('Motivationsboost test notice queue unavailable')));
    } else if (live) {
      await reconcileLiveGateway(user.id, live, plan);
      after(() => sendNextPayrexxWeeklyNotice().catch(() => console.warn('Motivationsboost weekly notice queue unavailable')));
    }
    return reply({ ok: true });
  } catch (error) {
    console.warn('Payrexx weekly status check failed', { type: error instanceof Error ? error.name : 'UnknownError' });
    return reply({ error: sandbox ? 'Payrexx konnte den Teststatus gerade nicht bestätigen.' :
      'Payrexx konnte den Zahlungsstatus gerade nicht bestätigen.' }, 502);
  }
}
