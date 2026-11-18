import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { databasePool } from '@/lib/server/postgres';
import { payrexxConfiguration, verifyPayrexxWebhook } from '@/lib/payrexx';
import { payrexxReferenceId } from '@/lib/payrexx-reference';

function recordFields(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const source = payload as Record<string, unknown>;
  const nested = (value: unknown, key: string): unknown =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)[key]
      : undefined;
  const resource = source.transaction ?? source.subscription;
  const type = source.transaction ? 'transaction' : source.subscription ? 'subscription' : 'unknown';
  const id = nested(resource, 'uuid');
  const status = nested(resource, 'status');
  return {
    resourceType: type,
    resourceId: typeof id === 'string' ? id.slice(0, 128) : null,
    resourceStatus: typeof status === 'string' ? status.slice(0, 64) : null,
  };
}

export async function POST(request: NextRequest) {
  const config = payrexxConfiguration();
  if (!config.webhookEnabled || !config.signingKey || !process.env.DATABASE_URL)
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
  const referenceId = payrexxReferenceId(payload);
  const eventHash = createHash('sha256').update(body).digest('hex');
  const fields = recordFields(payload);
  try {
    const result = await databasePool().query(
      `INSERT INTO payrexx_webhook_events
         (event_hash, reference_id, resource_type, resource_id, resource_status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (event_hash) DO NOTHING
       RETURNING event_hash`,
      [eventHash, referenceId, fields.resourceType ?? 'unknown', fields.resourceId ?? null, fields.resourceStatus ?? null],
    );
    // Only verified event metadata is persisted. No raw payload, PII, or entitlement changes.
    return NextResponse.json({ accepted: true, duplicate: result.rowCount === 0, premiumGranted: false });
  } catch {
    return NextResponse.json({ error: 'Webhook konnte nicht dauerhaft gespeichert werden.' }, { status: 503 });
  }
}
