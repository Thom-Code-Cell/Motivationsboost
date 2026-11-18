import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Pool } from 'pg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 128 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const globalWithPool = globalThis as typeof globalThis & { payrexxWebhookPool?: Pool };

function databasePool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is missing');
  globalWithPool.payrexxWebhookPool ??= new Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 5000,
  });
  return globalWithPool.payrexxWebhookPool;
}

async function readBody(request: Request): Promise<Buffer | null> {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(new Uint8Array(value));
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return Buffer.from(combined);
}

function isValidSignature(body: Buffer, signature: string | null, key: string | undefined) {
  if (!key || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', key).update(body).digest();
  const supplied = Buffer.from(signature, 'hex');
  return supplied.length === expected.length && timingSafeEqual(expected, supplied);
}

function nested(value: unknown, key: string): unknown {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function referenceId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const source = payload as Record<string, unknown>;
  const transaction = source.transaction;
  const subscription = source.subscription;
  const candidates = [
    source.referenceId,
    nested(transaction, 'referenceId'),
    nested(nested(transaction, 'invoice'), 'referenceId'),
    nested(subscription, 'referenceId'),
    nested(nested(subscription, 'invoice'), 'referenceId'),
    nested(source.invoice, 'referenceId'),
    nested(source.data, 'referenceId'),
  ];
  return candidates.find((value): value is string => typeof value === 'string' && UUID_PATTERN.test(value)) ?? null;
}

function resourceFields(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { type: 'unknown', id: null, status: null } as const;
  }
  const source = payload as Record<string, unknown>;
  const resource = source.transaction ?? source.subscription;
  const type = source.transaction ? 'transaction' : source.subscription ? 'subscription' : 'unknown';
  const id = nested(resource, 'uuid') ?? nested(resource, 'id');
  const status = nested(resource, 'status');
  return {
    type,
    id: typeof id === 'string' || typeof id === 'number' ? String(id).slice(0, 128) : null,
    status: typeof status === 'string' ? status.slice(0, 64) : null,
  } as const;
}

export async function POST(request: Request) {
  if (process.env.PAYREXX_WEBHOOK_ENABLED !== 'true') {
    return Response.json({ error: 'Webhook disabled' }, { status: 503 });
  }
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return Response.json({ error: 'Payload too large' }, { status: 413 });
  }

  let body: Buffer | null;
  try {
    body = await readBody(request);
  } catch {
    return Response.json({ error: 'Unable to read request body' }, { status: 400 });
  }
  if (!body) return Response.json({ error: 'Payload too large' }, { status: 413 });

  if (!isValidSignature(body, request.headers.get('x-webhook-signature'), process.env.PAYREXX_WEBHOOK_SIGNING_KEY)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body.toString('utf8'));
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const resource = resourceFields(payload);
  try {
    const result = await databasePool().query(
      `INSERT INTO payrexx_webhook_events
         (event_hash, reference_id, resource_type, resource_id, resource_status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (event_hash) DO NOTHING
       RETURNING event_hash`,
      [
        createHash('sha256').update(body).digest('hex'),
        referenceId(payload),
        resource.type,
        resource.id,
        resource.status,
      ],
    );
    return Response.json({ accepted: true, duplicate: result.rowCount === 0, premiumGranted: false });
  } catch (error) {
    console.error('Payrexx webhook metadata persistence failed', error instanceof Error ? error.message : 'unknown error');
    return Response.json({ error: 'Webhook persistence unavailable' }, { status: 503 });
  }
}
