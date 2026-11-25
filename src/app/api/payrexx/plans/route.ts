import { NextResponse } from 'next/server';
import { FREE_PLAN, PLANS } from '@/lib/plans';
import { weeklyCheckoutConfiguration } from '@/lib/server/payrexx-checkout-config';
export async function GET() {
  const available = Boolean(weeklyCheckoutConfiguration());
  return NextResponse.json({
    provider: 'Payrexx',
    enabled: available,
    sandboxOnly: available,
    free: FREE_PLAN,
    plans: Object.values(PLANS).map(plan => ({ ...plan, available: available && plan.id === 'weekly' })),
    message: available ? 'Nur der Wochenpass ist für Testzahlungen freigeschaltet.' : 'Checkout ist noch nicht freigeschaltet.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
