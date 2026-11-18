import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { getPlan, payrexxConfiguration } from '@/lib/payrexx';
import { databasePool } from '@/lib/server/postgres';
import { requireAppSession } from '@/lib/server/app-session';

const bodySchema = z.object({ plan: z.enum(['weekly', 'monthly', 'yearly']) }).strict();

export async function POST(request: NextRequest) {
  const cfg = payrexxConfiguration();
  if (!cfg.enabled || !cfg.instance || !cfg.key || !cfg.signingKey || !cfg.origin)
    return NextResponse.json({ error: 'Payrexx-Zahlungen sind noch nicht freigeschaltet.' }, { status: 503 });
  let userId: string;
  try { userId = (await requireAppSession()).user.id; }
  catch { return NextResponse.json({ error: 'Bitte anmelden.' }, { status: 401 }); }
  const data = bodySchema.safeParse(await request.json().catch(() => null));
  if (!data.success) return NextResponse.json({ error: 'Unbekannter Plan.' }, { status: 400 });
  const plan = getPlan(data.data.plan);
  if (!plan) return NextResponse.json({ error: 'Preis nicht konfiguriert.' }, { status: 503 });

  const referenceId = randomUUID();
  // No user-supplied amounts, prices, redirects, currencies or customer IDs.
  const database = databasePool();
  await database.query('INSERT INTO payment_orders (reference_id, user_id, plan, amount, currency, status) VALUES ($1, $2, $3, $4, $5, $6)',
    [referenceId, userId, plan.id, plan.amount, plan.currency, 'pending']);
  const endpoint = `https://api.payrexx.com/v1.18/Gateway/?instance=${encodeURIComponent(cfg.instance)}`;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'X-API-KEY': cfg.key, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        amount: plan.amount, currency: plan.currency,
        purpose: 'Motivationsboost ' + plan.label,
        referenceId,
        ...(plan.interval ? { subscriptionState: true, subscriptionInterval: plan.interval, subscriptionPeriod: plan.interval } : {}),
        successRedirectUrl: cfg.origin + '/?payment=pending',
        cancelRedirectUrl: cfg.origin + '/?payment=cancelled',
        failedRedirectUrl: cfg.origin + '/?payment=failed',
      }),
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Payment gateway rejected request');
    const result: unknown = await response.json();
    const record = result as { data?: Array<{ link?: string }> | { link?: string } };
    const link = Array.isArray(record.data) ? record.data[0]?.link : record.data?.link;
    const linkUrl = new URL(link || '');
    if (linkUrl.protocol !== 'https:' || !linkUrl.hostname.endsWith('.payrexx.com'))
      throw new Error('Unexpected gateway URL');
    await database.query('UPDATE payment_orders SET status = $1, updated_at = now() WHERE reference_id = $2', ['gateway-created', referenceId]);
    return NextResponse.json({ url: linkUrl.toString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    await database.query('UPDATE payment_orders SET status = $1, updated_at = now() WHERE reference_id = $2', ['gateway-error', referenceId]).catch(() => undefined);
    return NextResponse.json({ error: 'Payrexx-Verbindung konnte nicht hergestellt werden.' }, { status: 502 });
  }
}
