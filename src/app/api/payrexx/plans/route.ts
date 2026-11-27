import { NextResponse } from 'next/server';
import { creditPackPlans, FREE_PLAN, PLANS } from '@/lib/plans';
import { publicProductApproved } from '@/lib/public-product';
import { creditPackTerms, weeklyCheckoutConfiguration, weeklyGatewayValidityMinutes, weeklyLiveCheckoutConfiguration } from '@/lib/server/payrexx-checkout-config';
import { availableSubscriptionOffers } from '@/lib/server/payrexx-subscription-renewal';
export async function GET() {
  const sandbox = Boolean(weeklyCheckoutConfiguration());
  const live = Boolean(weeklyLiveCheckoutConfiguration());
  const livePacks = live ? creditPackPlans.filter(plan => creditPackTerms(plan)) : [];
  const liveSubscriptions = publicProductApproved() ? availableSubscriptionOffers(weeklyGatewayValidityMinutes).map(offer => offer.plan) : [];
  const livePlans = [...(live ? ['weekly' as const] : []), ...livePacks, ...liveSubscriptions];
  const available = sandbox || livePlans.length > 0;
  const plans = publicProductApproved() ? livePlans.map(plan => PLANS[plan]) : Object.values(PLANS);
  return NextResponse.json({
    provider: 'Payrexx',
    enabled: available,
    sandboxOnly: sandbox,
    free: FREE_PLAN,
    plans: plans.map(plan => ({ ...plan, available: (sandbox && plan.id === 'weekly') || livePlans.includes(plan.id) })),
    message: sandbox ? 'Nur der Wochenpass ist für Testzahlungen freigeschaltet.' :
      available ? 'Die angezeigten Angebote sind im persönlichen Konto verfügbar.' : 'Checkout ist noch nicht freigeschaltet.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
