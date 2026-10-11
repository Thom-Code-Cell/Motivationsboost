import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ token: '', verify: vi.fn(), read: vi.fn(), write: vi.fn(), count: 0 }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => mocks.token ? { value: mocks.token } : undefined }) }));
vi.mock('@/lib/server/firebase-admin', () => ({ adminAuth: () => ({ verifyIdToken: mocks.verify }), adminDb: () => ({ doc: (path: string) => path, runTransaction: async (run: (tx: unknown) => Promise<void>) => run({ get: mocks.read, set: mocks.write }) }) }));
import { requireSession, requireAdmin, authorizeAI } from '@/lib/server/session';
import { isRequestOriginAllowed } from '@/lib/security';
beforeEach(() => {
  mocks.token = 'test-token'; mocks.count = 0;
  mocks.verify.mockResolvedValue({ uid: 'alice' });
  mocks.read.mockImplementation(async () => ({ data: () => ({ hour: Math.floor(Date.now() / 3600000), count: mocks.count }) }));
  mocks.write.mockImplementation((_ref, data) => { mocks.count = data.count; });
  vi.stubEnv('GOOGLE_API_KEY', 'test-only-key');
});
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });
describe('server session and shared AI limits', () => {
  it('rejects missing sessions', async () => { mocks.token = ''; await expect(requireSession()).rejects.toThrow('anmelden'); expect(mocks.verify).not.toHaveBeenCalled(); });
  it('verifies token revocation', async () => { await requireSession(); expect(mocks.verify).toHaveBeenCalledWith('test-token', true); });
  it('rejects revoked tokens', async () => { mocks.verify.mockRejectedValueOnce(new Error('revoked')); await expect(requireSession()).rejects.toThrow('abgelaufen'); });
  it('does not infer admin status from a user-controlled profile', async () => { await expect(requireAdmin()).rejects.toThrow('verweigert'); });
  it('accepts a trusted admin claim', async () => { mocks.verify.mockResolvedValueOnce({ uid: 'alice', admin: true }); expect((await requireAdmin()).uid).toBe('alice'); });
  it('uses a server-only admin allowlist', async () => { vi.stubEnv('ALLOWED_ADMIN_UIDS', 'bob, alice'); expect((await requireAdmin()).uid).toBe('alice'); });
  it('rejects AI calls when no provider key exists', async () => { vi.stubEnv('GOOGLE_API_KEY', ''); await expect(authorizeAI({ text: 'test' })).rejects.toThrow('konfiguriert'); expect(mocks.write).not.toHaveBeenCalled(); });
  it('enforces the shared quota on the thirty-first request', async () => { for (let i = 0; i < 30; i++) await authorizeAI({ text: 'test' }); await expect(authorizeAI({ text: 'test' })).rejects.toThrow('Limit'); expect(mocks.count).toBe(30); });
  it('accepts bounded photo payloads above the text limit', async () => { await expect(authorizeAI({ userPhoto: 'x'.repeat(3000000) }, 12_000_000)).resolves.toMatchObject({ uid: 'alice' }); });
  it('rejects oversized photo payloads', async () => await expect(authorizeAI({ userPhoto: 'x'.repeat(12000001) }, 12_000_000)).rejects.toThrow('groß'));
  it('rejects oversized model inputs', async () => await expect(authorizeAI({ text: 'x'.repeat(2000001) })).rejects.toThrow('groß'));
});
describe('host-based CSRF verification behind Next.js', () => {
  it('accepts the real site host and ignores internal URL reconstruction', () => expect(isRequestOriginAllowed('https://app.example', 'app.example', true)).toBe(true));
  it('rejects cross-site or missing origins', () => { expect(isRequestOriginAllowed('https://evil.example', 'app.example', true)).toBe(false); expect(isRequestOriginAllowed(null, 'app.example', true)).toBe(false); });
  it('requires HTTPS in production', () => { expect(isRequestOriginAllowed('http://app.example', 'app.example', true)).toBe(false); expect(isRequestOriginAllowed('http://127.0.0.1:3001', '127.0.0.1:3001', false)).toBe(true); });
});
