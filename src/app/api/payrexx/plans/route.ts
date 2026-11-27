import { NextResponse } from 'next/server';
import { creditPackPlans, FREE_PLAN, PLANS } from '@/lib/plans';
import { publicProductApproved } from '@/lib/public-product';
import { creditPackTerms, weeklyCheckoutConfiguration, weeklyLiveCheckoutConfiguration } from '@/lib/server/payrexx-checkout-config';
export async function GET() {
  const sandbox = Boolean(weeklyCheckoutConfiguration());
  const live = Boolean(weeklyLiveCheckoutConfiguration());
  const available = sandbox || live;
  const livePacks = live ? creditPackPlans.filter(plan => creditPackTerms(plan)) : [];
  const plans = publicProductApproved() ? (live ? [PLANS.weekly, ...livePacks.map(plan => PLANS[plan])] : []) : Object.values(PLANS);
  return NextResponse.json({
    provider: 'Payrexx',
    enabled: available,
    sandboxOnly: sandbox,
    free: FREE_PLAN,
    plans: plans.map(plan => ({ ...plan, available: (available && plan.id === 'weekly') || livePacks.some(id => id === plan.id) })),
    message: sandbox ? 'Nur der Wochenpass ist für Testzahlungen freigeschaltet.' :
      live ? 'Der einmalige Wochenpass ist verfügbar.' : 'Checkout ist noch nicht freigeschaltet.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
