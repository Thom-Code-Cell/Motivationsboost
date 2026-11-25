import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ session: vi.fn(), reserve: vi.fn(), spend: vi.fn(), settle: vi.fn(), key: vi.fn(), openai: vi.fn() }));
vi.mock('@/lib/server/app-session', () => ({ requireAppSession: mocks.session }));
vi.mock('@/lib/server/ai-quota-store', () => ({ reserveAiAction: mocks.reserve }));
vi.mock('@/lib/server/ai-spend-store', () => ({ AiSpendBlocked: class extends Error {}, DuplicateAiRequest: class extends Error {}, reserveAiSpend: mocks.spend, settleAiSpend: mocks.settle }));
vi.mock('@/lib/server/openai-client', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/server/openai-client')>(), getOpenAIKey: mocks.key, getTextModel: () => 'gpt-6.1-terra', callOpenAI: mocks.openai }));
import { POST } from '@/app/api/v2/letter/route';
const body = { cv: 'Erfahrung '.repeat(8), job: 'Stellenanzeige '.repeat(8), motivation: 'Ich arbeite gerne mit Menschen.', example: 'Ich führte ein Team und unterstützte es.', contribution: 'Ich helfe dem Team im Alltag.', allowExternalProcessing: true };
const requestId = '39efda86-ae0b-48c7-b7fa-953ee479fa82';
const request = (data: unknown) => new NextRequest('https://example.com/api/v2/letter', { method: 'POST', headers: { origin: 'https://example.com', host: 'example.com', 'Idempotency-Key': requestId }, body: JSON.stringify(data) });
beforeEach(() => {
  vi.stubEnv('MOTIVATIONS_PAID_AI_ENABLED', 'true');
  vi.stubEnv('MOTIVATIONS_AI_PRICE_APPROVED_UNTIL', '2099-12-31T00:00:00Z');
  mocks.session.mockResolvedValue({ user: { id: 'alice' } });
  mocks.key.mockReturnValue('test');
  mocks.reserve.mockResolvedValue({ used: 1, limit: 3 });
  mocks.spend.mockResolvedValue('receipt');
  mocks.settle.mockResolvedValue(undefined);
  mocks.openai.mockResolvedValue(new Response(JSON.stringify({ status: 'completed', output_text: JSON.stringify({ evidenceIds: ['e1'] }), usage: { input_tokens: 1000, output_tokens: 1000 } })));
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });
describe('authenticated letter generation', () => {
  it('reserves the authenticated user quota before generating', async () => {
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    expect(mocks.reserve).toHaveBeenCalledWith('alice');
    expect(mocks.spend).toHaveBeenCalledWith('alice', requestId, expect.any(Number));
    expect(mocks.spend.mock.invocationCallOrder[0]).toBeLessThan(mocks.openai.mock.invocationCallOrder[0]);
    expect(mocks.openai.mock.calls[0][1].input).not.toContain(body.cv);
    expect(mocks.openai.mock.calls[0][1].input).not.toContain(body.contribution);
    expect(mocks.settle).toHaveBeenCalledWith('receipt', 6600);
    expect(await response.json()).toMatchObject({ letter: expect.stringContaining(body.example), mode: 'evidence-selection', quota: { used: 1, limit: 3 } });
  });
  it('returns a clearly labelled guided draft without consuming AI quota when the key is missing', async () => {
    mocks.key.mockImplementation(() => { throw new Error('missing'); });
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ mode: 'guided-template' });
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it('does not invoke the provider when quota is exhausted', async () => {
    mocks.reserve.mockRejectedValue(new Error('KI-Limit erreicht'));
    expect((await POST(request(body))).status).toBe(429);
    expect(mocks.openai).not.toHaveBeenCalled();
    expect(mocks.settle).toHaveBeenCalledWith('receipt', 0);
  });
  it('keeps the template available without external processing consent or a current price approval', async () => {
    expect(await (await POST(request({ ...body, allowExternalProcessing: false }))).json()).toMatchObject({ mode: 'guided-template' });
    vi.stubEnv('MOTIVATIONS_AI_PRICE_APPROVED_UNTIL', '2000-01-01T00:00:00Z');
    expect(await (await POST(request(body))).json()).toMatchObject({ mode: 'guided-template' });
    expect(mocks.openai).not.toHaveBeenCalled();
    expect(mocks.spend).not.toHaveBeenCalled();
  });
  it('discards model prose and disallowed references before returning a template', async () => {
    mocks.openai.mockResolvedValue(new Response(JSON.stringify({ output_text: JSON.stringify({
      evidenceIds: ['e2'],
      letter: 'Ich erkenne Materialengpässe früh.',
    }) })));
    const output = await (await POST(request(body))).json();
    expect(output).toMatchObject({ mode: 'evidence-template' });
    expect(output.letter).toContain(body.contribution);
    expect(output.letter).not.toContain('Ich erkenne Materialengpässe früh.');
  });
  it('rejects forged fields and unauthenticated callers', async () => {
    expect((await POST(request({ ...body, userId: 'bob' }))).status).toBe(400);
    mocks.session.mockRejectedValue(new Error('no session'));
    expect((await POST(request(body))).status).toBe(401);
  });
});
