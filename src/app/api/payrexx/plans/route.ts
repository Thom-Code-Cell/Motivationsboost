import { NextResponse } from 'next/server';
import { getPlan, payrexxConfiguration } from '@/lib/payrexx';
export async function GET() {
  const cfg = payrexxConfiguration();
  const available = cfg.enabled && cfg.instance && cfg.key && cfg.signingKey && cfg.origin;
  return NextResponse.json({
    provider: 'Payrexx',
    enabled: Boolean(available),
    plans: (['weekly', 'monthly', 'yearly'] as const).map(id => getPlan(id)),
    message: available ? 'Checkout technically configured; final business acceptance is required.' : 'Checkout ist noch nicht freigeschaltet.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
