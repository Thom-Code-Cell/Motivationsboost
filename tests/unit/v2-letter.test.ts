import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ session: vi.fn(), reserve: vi.fn(), key: vi.fn(), openai: vi.fn() }));
vi.mock('@/lib/server/app-session', () => ({ requireAppSession: mocks.session }));
vi.mock('@/lib/server/ai-quota-store', () => ({ reserveAiAction: mocks.reserve }));
vi.mock('@/lib/server/openai-client', () => ({ getOpenAIKey: mocks.key, callOpenAI: mocks.openai }));
import { POST } from '@/app/api/v2/letter/route';
const body = { cv: 'Erfahrung '.repeat(8), job: 'Stellenanzeige '.repeat(8), motivation: 'Ich arbeite gerne mit Menschen.', example: 'Ich führte ein Team und unterstützte es.', contribution: 'Ich helfe dem Team im Alltag.' };
const request = (data: unknown) => new NextRequest('https://example.com/api/v2/letter', { method: 'POST', headers: { origin: 'https://example.com', host: 'example.com' }, body: JSON.stringify(data) });
beforeEach(() => { mocks.session.mockResolvedValue({ user: { id: 'alice' } }); mocks.key.mockReturnValue('test'); mocks.reserve.mockResolvedValue({ used: 1, limit: 3 }); mocks.openai.mockResolvedValue(new Response(JSON.stringify({ status: 'completed', output_text: 'Guten Tag' }))); });
afterEach(() => vi.resetAllMocks());
describe('authenticated letter generation', () => {
  it('reserves the authenticated user quota before generating', async () => {
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    expect(mocks.reserve).toHaveBeenCalledWith('alice');
    expect(await response.json()).toMatchObject({ letter: 'Guten Tag', quota: { used: 1, limit: 3 } });
  });
  it('does not consume a quota when the key is missing', async () => {
    mocks.key.mockImplementation(() => { throw new Error('missing'); });
    expect((await POST(request(body))).status).toBe(503);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it('does not invoke the provider when quota is exhausted', async () => {
    mocks.reserve.mockRejectedValue(new Error('KI-Limit erreicht'));
    expect((await POST(request(body))).status).toBe(429);
    expect(mocks.openai).not.toHaveBeenCalled();
  });
  it('rejects forged fields and unauthenticated callers', async () => {
    expect((await POST(request({ ...body, userId: 'bob' }))).status).toBe(400);
    mocks.session.mockRejectedValue(new Error('no session'));
    expect((await POST(request(body))).status).toBe(401);
  });
});
