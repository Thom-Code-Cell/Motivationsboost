import { after, NextRequest, NextResponse } from 'next/server';
import { sendNextPayrexxTestNotice } from '@/lib/server/payrexx-test-notices';
import { isRequestOriginAllowed } from '@/lib/security';
import { requireAppSession } from '@/lib/server/app-session';
import { weeklyCheckoutConfiguration } from '@/lib/server/payrexx-checkout-config';
import { reconcileSandboxGateway } from '@/lib/server/payrexx-sandbox-status';

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const config = weeklyCheckoutConfiguration();
  if (!config?.pollingEnabled) return reply({ error: 'Payrexx-Statusprüfung ist nicht freigeschaltet.' }, 503);
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), process.env.NODE_ENV === 'production'))
    return reply({ error: 'Ungültiger Ursprung.' }, 403);
  let userId: string;
  try { userId = (await requireAppSession()).user.id; }
  catch { return reply({ error: 'Bitte anmelden.' }, 401); }
  try {
    await reconcileSandboxGateway(userId, config);
    after(() => sendNextPayrexxTestNotice().catch(() => console.warn('Motivationsboost test notice queue unavailable')));
    return reply({ ok: true });
  } catch (error) {
    console.warn('Payrexx test status check failed', { type: error instanceof Error ? error.name : 'UnknownError' });
    return reply({ error: 'Payrexx konnte den Teststatus gerade nicht bestätigen.' }, 502);
  }
}
