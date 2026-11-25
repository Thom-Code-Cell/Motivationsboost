import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { databasePool } from '@/lib/server/postgres';
import { payrexxConfiguration, verifyPayrexxWebhook } from '@/lib/payrexx';
import { payrexxReferenceId } from '@/lib/payrexx-reference';
import { weeklyCheckoutConfiguration } from '@/lib/server/payrexx-checkout-config';
import { applyWeeklySandboxEvent } from '@/lib/server/payrexx-weekly';

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
  const sandbox = weeklyCheckoutConfiguration();
  const signingKey = sandbox?.signingKey ?? config.signingKey;
  if (!config.webhookEnabled || !signingKey || !process.env.DATABASE_URL)
    return NextResponse.json({ error: 'Payrexx nicht aktiv.' }, { status: 503 });
  if (Number(request.headers.get('content-length') || '0') > 131072)
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  const body = await request.text();
  if (Buffer.byteLength(body, 'utf8') > 131072) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  const signature = request.headers.get('x-webhook-signature') || '';
  if (!verifyPayrexxWebhook(body, signature, signingKey))
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  let payload: unknown;
  try { payload = JSON.parse(body); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const referenceId = payrexxReferenceId(payload);
  const eventHash = createHash('sha256').update(body).digest('hex');
  const fields = recordFields(payload);
  let connection;
  try {
    if (!sandbox) {
      const result = await recordEvent(databasePool());
      return NextResponse.json({ accepted: true, duplicate: result.rowCount === 0, premiumGranted: false });
    }
    connection = await databasePool().connect();
    await connection.query('BEGIN');
    const result = await recordEvent(connection);
    const premiumGranted = result.rowCount !== 0 && await applyWeeklySandboxEvent(connection, payload, sandbox);
    await connection.query('COMMIT');
    return NextResponse.json({ accepted: true, duplicate: result.rowCount === 0, premiumGranted });
  } catch {
    await connection?.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ error: 'Webhook konnte nicht dauerhaft gespeichert werden.' }, { status: 503 });
  } finally {
    connection?.release();
  }

  function recordEvent(database: Pick<ReturnType<typeof databasePool>, 'query'>) {
    return database.query(
      `INSERT INTO payrexx_webhook_events
         (event_hash, reference_id, resource_type, resource_id, resource_status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (event_hash) DO NOTHING
       RETURNING event_hash`,
      [eventHash, referenceId, fields.resourceType ?? 'unknown', fields.resourceId ?? null, fields.resourceStatus ?? null],
    );
  }
}
