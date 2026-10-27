import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { payrexxConfiguration, verifyPayrexxWebhook } from '@/lib/payrexx';

export async function POST(request: NextRequest) {
  const config = payrexxConfiguration();
  if (!config.enabled || !config.signingKey)
    return NextResponse.json({ error: 'Payrexx nicht aktiv.' }, { status: 503 });
  if (Number(request.headers.get('content-length') || '0') > 131072)
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  const body = await request.text();
  if (Buffer.byteLength(body, 'utf8') > 131072) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  const signature = request.headers.get('x-webhook-signature') || '';
  if (!verifyPayrexxWebhook(body, signature, config.signingKey))
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  let payload: unknown;
  try { payload = JSON.parse(body); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const reference = payload as { referenceId?: unknown; data?: { referenceId?: unknown } };
  const referenceId = typeof reference.referenceId === 'string' ? reference.referenceId : reference.data?.referenceId;
  if (typeof referenceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(referenceId))
    return NextResponse.json({ error: 'Unrecognized reference' }, { status: 422 });
  const orderRef = adminDb().collection('paymentOrders').doc(referenceId);
  const order = await orderRef.get();
  if (!order.exists) return NextResponse.json({ error: 'Unknown order' }, { status: 404 });
  const eventHash = createHash('sha256').update(body).digest('hex');
  await adminDb().collection('paymentWebhookEvents').doc(eventHash).create({
    referenceId, receivedAt: new Date().toISOString(), provider: 'Payrexx',
    // Never grant premium access solely from unvalidated webhook field conventions.
    reconciliation: 'manual-verification-required',
  }).catch(error => {
    if ((error as { code?: number }).code !== 6) throw error; // ALREADY_EXISTS = idempotent retry.
  });
  return NextResponse.json({ accepted: true, premiumGranted: false });
}
