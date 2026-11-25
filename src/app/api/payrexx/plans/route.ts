import { NextResponse } from 'next/server';
import { getPlan } from '@/lib/payrexx';
import { weeklyCheckoutConfiguration } from '@/lib/server/payrexx-checkout-config';
export async function GET() {
  const available = Boolean(weeklyCheckoutConfiguration());
  return NextResponse.json({
    provider: 'Payrexx',
    enabled: available,
    sandboxOnly: available,
    plans: (['weekly', 'monthly', 'yearly'] as const).map(id => ({ ...getPlan(id), available: available && id === 'weekly' })),
    message: available ? 'Nur der Wochenpass ist für Testzahlungen freigeschaltet.' : 'Checkout ist noch nicht freigeschaltet.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
