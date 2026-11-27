import { timingSafeEqual } from 'node:crypto';
import { after, NextRequest, NextResponse } from 'next/server';
import { reconcilePendingPayrexxSubscription, requestNextPayrexxSubscriptionCharge, subscriptionRenewalConfiguration } from '@/lib/server/payrexx-subscription-renewal';
import { sendNextPayrexxWeeklyNotice } from '@/lib/server/payrexx-weekly-notices';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = secret ? Buffer.from(`Bearer ${secret}`) : undefined;
  if (!expected || supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const config = subscriptionRenewalConfiguration();
  if (!config) return NextResponse.json({ enabled: false });
  try {
    await reconcilePendingPayrexxSubscription(config).catch(() => console.warn('Motivationsboost renewal requires reconciliation'));
    const status = await requestNextPayrexxSubscriptionCharge(config);
    after(() => sendNextPayrexxWeeklyNotice().catch(() => console.warn('Motivationsboost payment notice queue unavailable')));
    return NextResponse.json({ status });
  } catch {
    return NextResponse.json({ error: 'Renewal unavailable' }, { status: 503 });
  }
}
