import { after, NextRequest, NextResponse } from 'next/server';
import { sendNextPayrexxTestNotice } from '@/lib/server/payrexx-test-notices';
import { sendNextPayrexxWeeklyNotice } from '@/lib/server/payrexx-weekly-notices';
import { isRequestOriginAllowed } from '@/lib/security';
import { requireAppSession } from '@/lib/server/app-session';
import { weeklyCheckoutConfiguration, weeklyLiveCheckoutConfiguration, weeklyLiveWebhookConfiguration } from '@/lib/server/payrexx-checkout-config';
import { reconcileLiveGateway, reconcileSandboxGateway } from '@/lib/server/payrexx-sandbox-status';

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const sandbox = weeklyCheckoutConfiguration();
  if (!sandbox?.pollingEnabled && !weeklyLiveWebhookConfiguration()) return reply({ error: 'Payrexx-Statusprüfung ist nicht freigeschaltet.' }, 503);
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), process.env.NODE_ENV === 'production'))
    return reply({ error: 'Ungültiger Ursprung.' }, 403);
  let user;
  try { user = (await requireAppSession()).user; }
  catch { return reply({ error: 'Bitte anmelden.' }, 401); }
  const live = 'emailVerified' in user && user.emailVerified ? weeklyLiveCheckoutConfiguration(user.email) : null;
  if (!sandbox?.pollingEnabled && !live) return reply({ error: 'Payrexx-Statusprüfung ist nicht freigeschaltet.' }, 503);
  try {
    if (sandbox?.pollingEnabled) {
      await reconcileSandboxGateway(user.id, sandbox);
      after(() => sendNextPayrexxTestNotice().catch(() => console.warn('Motivationsboost test notice queue unavailable')));
    } else if (live) {
      await reconcileLiveGateway(user.id, live);
      after(() => sendNextPayrexxWeeklyNotice().catch(() => console.warn('Motivationsboost weekly notice queue unavailable')));
    }
    return reply({ ok: true });
  } catch (error) {
    console.warn('Payrexx weekly status check failed', { type: error instanceof Error ? error.name : 'UnknownError' });
    return reply({ error: sandbox ? 'Payrexx konnte den Teststatus gerade nicht bestätigen.' :
      'Payrexx konnte den Zahlungsstatus gerade nicht bestätigen.' }, 502);
  }
}
