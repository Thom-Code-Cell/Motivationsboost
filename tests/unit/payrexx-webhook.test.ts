import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/lib/server/postgres', () => ({ databasePool: () => ({ query: mocks.query }) }));
import { POST } from '@/app/api/payrexx/webhook/route';

const signingKey = 'a'.repeat(64);
const payload = JSON.stringify({
  transaction: {
    uuid: 'payrexx-transaction-123',
    status: 'confirmed',
    invoice: { referenceId: '550e8400-e29b-41d4-a716-446655440000', email: 'must-not-be-stored@example.test' },
  },
});
const signature = (body: string) => createHmac('sha256', signingKey).update(body, 'utf8').digest('hex');
const request = (body = payload, signed = true) => new NextRequest('https://example.vercel.app/api/payrexx/webhook', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-webhook-signature': signed ? signature(body) : '0'.repeat(64) },
  body,
});

beforeEach(() => {
  process.env.PAYREXX_WEBHOOK_ENABLED = 'true';
  process.env.PAYREXX_WEBHOOK_SIGNING_KEY = signingKey;
  process.env.DATABASE_URL = 'postgres://test.invalid/test';
  mocks.query.mockResolvedValue({ rowCount: 1, rows: [{ event_hash: 'hash' }] });
});
afterEach(() => {
  delete process.env.PAYREXX_WEBHOOK_ENABLED;
  delete process.env.PAYREXX_WEBHOOK_SIGNING_KEY;
  delete process.env.DATABASE_URL;
  vi.clearAllMocks();
});

describe('Payrexx webhook receiver', () => {
  it('stores only minimal metadata after verifying the signature', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ accepted: true, duplicate: false, premiumGranted: false });
    expect(mocks.query).toHaveBeenCalledOnce();
    const [sql, values] = mocks.query.mock.calls[0];
    expect(sql).toContain('ON CONFLICT (event_hash) DO NOTHING');
    expect(values).toContain('550e8400-e29b-41d4-a716-446655440000');
    expect(values).not.toContain('must-not-be-stored@example.test');
  });

  it('treats repeated delivery as an acknowledged duplicate', async () => {
    mocks.query.mockResolvedValue({ rowCount: 0, rows: [] });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ accepted: true, duplicate: true, premiumGranted: false });
  });

  it('rejects invalid signatures without touching the database', async () => {
    expect((await POST(request(payload, false))).status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('leaves the receiver disabled without the separate webhook flag or durable database', async () => {
    process.env.PAYREXX_WEBHOOK_ENABLED = 'false';
    expect((await POST(request())).status).toBe(503);
    process.env.PAYREXX_WEBHOOK_ENABLED = 'true';
    delete process.env.DATABASE_URL;
    expect((await POST(request())).status).toBe(503);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
