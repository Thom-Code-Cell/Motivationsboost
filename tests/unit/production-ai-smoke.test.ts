import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ session: vi.fn(), reserve: vi.fn(), settle: vi.fn(), openai: vi.fn() }));
vi.mock('@/lib/server/app-session', () => ({ requireAppSession: mocks.session }));
vi.mock('@/lib/server/ai-spend-store', () => ({
  reserveProductionAiSmoke: mocks.reserve, settleAiSpend: mocks.settle, DuplicateAiRequest: class DuplicateAiRequest extends Error {},
}));
vi.mock('@/lib/server/openai-client', () => ({
  callOpenAI: mocks.openai, getOpenAIKey: () => 'synthetic-fixture', hasCurrentAiApproval: () => true,
  OpenAIRequestError: class OpenAIRequestError extends Error {},
}));
import { POST } from '@/app/api/v2/acceptance/production/route';

const origin = 'https://motivationsboost.th-analytica.com';
function request(from = origin) {
  return new NextRequest(origin + '/api/v2/acceptance/production', {
    method: 'POST', headers: { origin: from, host: 'motivationsboost.th-analytica.com' },
  });
}

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('MOTIVATIONS_PRODUCTION_SMOKE_EMAIL', 'operator@example.test');
  vi.stubEnv('MOTIVATIONS_PRODUCTION_SMOKE_UNTIL', new Date(Date.now() + 120_000).toISOString());
  mocks.session.mockResolvedValue({ user: { email: 'operator@example.test', emailVerified: true, id: 'controlled-user' } });
  mocks.reserve.mockResolvedValue('synthetic-reservation');
  mocks.openai.mockImplementation(async () => Response.json({
    status: 'completed', usage: { input_tokens: 100, output_tokens: 25 },
    output: [{ type: 'message', content: [{ type: 'output_text', text: '{"chosen":"invoice-1"}' }] }],
  }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

it('requires the configured, verified operator on a same-origin production request', async () => {
  expect((await POST(request('https://another.example.test'))).status).toBe(403);
  mocks.session.mockResolvedValueOnce({ user: { email: 'somebody@example.test', emailVerified: true } });
  expect((await POST(request())).status).toBe(404);
  vi.stubEnv('VERCEL_ENV', 'preview');
  expect((await POST(request())).status).toBe(404);
  expect(mocks.reserve).not.toHaveBeenCalled();
  expect(mocks.openai).not.toHaveBeenCalled();
});

it('reserves bounded production spend, verifies the structured output and settles only measured usage', async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ok: true, model: 'gpt-6-luna', costChfMicros: 28 });
  expect(mocks.reserve.mock.calls[0][2]).toBeLessThan(10000);
  expect(mocks.openai.mock.calls[0][1]).toMatchObject({ model: 'gpt-6-luna', store: false, max_output_tokens: 64 });
  expect(mocks.settle).toHaveBeenCalledWith('synthetic-reservation', 28);
});
