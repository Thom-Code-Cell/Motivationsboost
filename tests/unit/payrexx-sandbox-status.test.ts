import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  claim: vi.fn(), connect: vi.fn(), query: vi.fn(), release: vi.fn(), apply: vi.fn(),
}));
vi.mock('@/lib/server/postgres', () => ({ databasePool: () => ({ query: mocks.claim, connect: mocks.connect }) }));
vi.mock('@/lib/server/payrexx-weekly', () => ({ applyWeeklySandboxEvent: mocks.apply }));
import { reconcileSandboxGateway } from '@/lib/server/payrexx-sandbox-status';

const config = { instance: 'shared-live', pspId: 27, key: 'test-only' };
const reference = 'ba8e2438-f702-4cd5-8ce2-aec7af504cf1';
const external = vi.fn();
const reply = (value: unknown) => new Response(JSON.stringify({ status: 'success', data: [value] }));
const order = { reference_id: reference, payrexx_gateway_id: 101 };
const payment = {
  id: 301, uuid: 'eda04158', status: 'confirmed', mode: 'TEST', pspId: 27, paymentType: 'one-time',
  referenceId: reference,
  invoice: { paymentRequestId: 101, currencyAlpha3: 'CHF', totalAmount: 890, originalAmount: 890, refundedAmount: 0 },
};

beforeEach(() => {
  vi.stubGlobal('fetch', external);
  mocks.claim.mockResolvedValue({ rows: [order] });
  mocks.connect.mockResolvedValue({ query: mocks.query, release: mocks.release });
  external.mockResolvedValueOnce(reply({ id: 101, invoices: [{ transactions: [{ id: 301 }, { id: 301 }] }] }));
  external.mockResolvedValueOnce(reply(payment));
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); });

it('surveys only a claimed owned gateway and submits a matching provider transaction to sandbox verification', async () => {
  await reconcileSandboxGateway('user-1', config);
  expect(mocks.claim.mock.calls[0][1]).toEqual(['user-1', 27, 'weekly']);
  expect(mocks.claim.mock.calls[0][0]).toContain("interval '15 seconds'");
  expect(external.mock.calls.map(([url]) => url)).toEqual([
    'https://api.payrexx.com/v1.19/Gateway/101/?instance=shared-live',
    'https://api.payrexx.com/v1.19/Transaction/301/?instance=shared-live',
  ]);
  expect(mocks.apply).toHaveBeenCalledOnce();
  expect(mocks.apply.mock.calls[0][1]).toEqual({ transaction: {
    uuid: 'eda04158', referenceId: reference, status: 'confirmed', mode: 'TEST', pspId: 27,
    paymentType: 'one-time', amount: 890,
    invoice: { currency: 'CHF', originalAmount: 890, refundedAmount: 0, test: true },
  } });
});

it('does not contact Payrexx without a claimed order', async () => {
  mocks.claim.mockResolvedValue({ rows: [] });
  await reconcileSandboxGateway('user-2', config);
  expect(external).not.toHaveBeenCalled();
});

it('refuses to read transactions from a different gateway', async () => {
  external.mockReset().mockResolvedValueOnce(reply({ id: 102, invoices: [] }));
  await expect(reconcileSandboxGateway('user-1', config)).rejects.toThrow('Gateway identifier mismatch');
  expect(external).toHaveBeenCalledOnce();
  expect(mocks.apply).not.toHaveBeenCalled();
});

it('does not settle transactions linked to a different order', async () => {
  external.mockReset()
    .mockResolvedValueOnce(reply({ id: 101, invoices: [{ transactions: [{ id: 301 }] }] }))
    .mockResolvedValueOnce(reply({ ...payment, invoice: { ...payment.invoice, paymentRequestId: 999 } }));
  await reconcileSandboxGateway('user-1', config);
  expect(mocks.apply).not.toHaveBeenCalled();
});

it('never translates a live transaction into a sandbox event', async () => {
  external.mockReset()
    .mockResolvedValueOnce(reply({ id: 101, invoices: [{ transactions: [{ id: 301 }] }] }))
    .mockResolvedValueOnce(reply({ ...payment, mode: 'LIVE' }));
  await reconcileSandboxGateway('user-1', config);
  expect(mocks.apply).not.toHaveBeenCalled();
});
