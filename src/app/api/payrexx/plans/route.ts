import { NextResponse } from 'next/server';
import { FREE_PLAN, PLANS } from '@/lib/plans';
import { publicProductApproved } from '@/lib/public-product';
import { weeklyCheckoutConfiguration, weeklyLiveCheckoutConfiguration } from '@/lib/server/payrexx-checkout-config';
export async function GET() {
  const sandbox = Boolean(weeklyCheckoutConfiguration());
  const live = Boolean(weeklyLiveCheckoutConfiguration());
  const available = sandbox || live;
  const plans = publicProductApproved() ? (live ? [PLANS.weekly] : []) : Object.values(PLANS);
  return NextResponse.json({
    provider: 'Payrexx',
    enabled: available,
    sandboxOnly: sandbox,
    free: FREE_PLAN,
    plans: plans.map(plan => ({ ...plan, available: available && plan.id === 'weekly' })),
    message: sandbox ? 'Nur der Wochenpass ist für Testzahlungen freigeschaltet.' :
      live ? 'Der einmalige Wochenpass ist verfügbar.' : 'Checkout ist noch nicht freigeschaltet.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
