import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  session: vi.fn(), query: vi.fn(), connect: vi.fn(), checkoutQuery: vi.fn(), release: vi.fn(),
}));
vi.mock('@/lib/server/app-session', () => ({ requireAppSession: mocks.session }));
vi.mock('@/lib/server/postgres', () => ({ databasePool: () => ({ query: mocks.query, connect: mocks.connect }) }));
import { GET, POST } from '@/app/api/payrexx/checkout/route';

const origin = 'https://preview.example.test';
const external = vi.fn();
function request(body: object = { plan: 'weekly', termsVersion: 'sandbox-1', acceptTerms: true }, from = origin) {
  return new NextRequest(origin + '/api/payrexx/checkout', {
    method: 'POST',
    headers: { origin: from, host: 'preview.example.test', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('PAYREXX_WEBHOOK_ENABLED', 'true');
  vi.stubEnv('PAYREXX_WEEKLY_SANDBOX_ENTITLEMENTS_ENABLED', 'true');
  vi.stubEnv('PAYREXX_INSTANCE', 'shared-live');
  vi.stubEnv('PAYREXX_SANDBOX_PSP_ID', '27');
  vi.stubEnv('PAYREXX_SANDBOX_API_KEY', 'test-key');
  vi.stubEnv('PAYREXX_SANDBOX_WEBHOOK_SIGNING_KEY', 'test-signing-key');
  vi.stubEnv('PAYREXX_SANDBOX_TERMS_VERSION', 'sandbox-1');
  vi.stubEnv('DATABASE_URL', 'postgres://database.invalid/preview');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', origin);
  vi.stubGlobal('fetch', external);
  mocks.session.mockResolvedValue({ user: { id: 'verified-test-user' } });
  mocks.connect.mockResolvedValue({ query: mocks.checkoutQuery, release: mocks.release });
  mocks.query.mockImplementation(async (sql: string) => ({
    rows: [], rowCount: sql.includes('UPDATE payment_orders') ? 1 : 0,
  }));
  mocks.checkoutQuery.mockImplementation(async (sql: string) => ({
    rows: [], rowCount: /SELECT id FROM|INSERT INTO/.test(sql) ? 1 : 0,
  }));
  external.mockResolvedValue(new Response(JSON.stringify({ data: [{ link: 'https://shared-live.payrexx.com/pay/test' }] })));
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('isolated Payrexx checkout', () => {
  it('restricts checkout to the selected test provider with a server-side price and reference', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: 'https://shared-live.payrexx.com/pay/test' });
    const [endpoint, options] = external.mock.calls[0];
    expect(endpoint).toBe('https://api.payrexx.com/v1.19/Gateway/?instance=shared-live');
    expect(options.headers['X-API-KEY']).toBe('test-key');
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({ amount: 890, currency: 'CHF', psp: [27] });
    expect(body).not.toHaveProperty('subscriptionState');
    expect(mocks.checkoutQuery.mock.calls.find(([sql]) => sql.includes('INSERT INTO'))?.[1])
      .toEqual([body.referenceId, 'verified-test-user', 'weekly', 890, 'CHF', 'sandbox-1', 27]);
  });

  it('keeps unrestricted gateways and production closed', async () => {
    vi.stubEnv('PAYREXX_SANDBOX_PSP_ID', '');
    expect((await POST(request())).status).toBe(503);
    vi.stubEnv('PAYREXX_SANDBOX_PSP_ID', '44,27');
    expect((await POST(request())).status).toBe(503);
    vi.stubEnv('PAYREXX_SANDBOX_PSP_ID', '27');
    vi.stubEnv('VERCEL_ENV', 'production');
    expect((await POST(request())).status).toBe(503);
    expect(external).not.toHaveBeenCalled();
  });

  it('checks the origin, active session, plan, and exact terms version before starting a payment', async () => {
    expect((await POST(request(undefined, 'https://unrelated.example.test'))).status).toBe(403);
    expect((await POST(request({ plan: 'monthly', termsVersion: 'sandbox-1', acceptTerms: true }))).status).toBe(400);
    expect((await POST(request({ plan: 'weekly', termsVersion: 'sandbox-0', acceptTerms: true }))).status).toBe(400);
    mocks.session.mockRejectedValue(new Error('Signed out'));
    expect((await POST(request())).status).toBe(401);
    expect((await GET()).status).toBe(401);
    expect(external).not.toHaveBeenCalled();
  });

  it('only returns account-owned status without exposing gateway URLs or order identifiers', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ reference_id: 'private', status: 'paid', gateway_url: 'private' }], rowCount: 1 });
    mocks.query.mockResolvedValueOnce({ rows: [{}], rowCount: 1 });
    expect(await (await GET()).json()).toEqual({ enabled: true, orderStatus: 'paid', active: true, canResume: false, termsVersion: 'sandbox-1' });
    expect(mocks.query.mock.calls.every(([, args]) => args[0] === 'verified-test-user')).toBe(true);
  });

  it('resumes only an unexpired checkout for the same account and avoids creating a duplicate', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{
      reference_id: 'private', status: 'gateway-created', gateway_url: 'https://shared-live.payrexx.com/pay/existing',
      gateway_expires_at: new Date(Date.now() + 60000), sandbox_psp_id: 27,
    }], rowCount: 1 });
    expect(await (await POST(request())).json()).toEqual({ url: 'https://shared-live.payrexx.com/pay/existing' });
    mocks.checkoutQuery.mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rowCount: 0 });
    expect((await POST(request())).status).toBe(409);
    expect(external).not.toHaveBeenCalled();
  });

  it('rejects a checkout link from a different merchant and leaves ambiguous orders for review', async () => {
    external.mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ link: 'https://other-merchant.payrexx.com/pay/live' }] })));
    expect((await POST(request())).status).toBe(502);
    expect(mocks.query.mock.calls.some(([sql]) => sql.includes('UPDATE payment_orders'))).toBe(false);
  });
});
