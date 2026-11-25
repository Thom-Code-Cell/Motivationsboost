import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ session: vi.fn(), query: vi.fn(), posting: vi.fn() }));
vi.mock('@/lib/server/app-session', () => ({ requireAppSession: mocks.session }));
vi.mock('@/lib/server/postgres', () => ({ databasePool: () => ({ query: mocks.query }) }));
vi.mock('@/lib/server/job-posting', () => ({ getJobPosting: mocks.posting }));
import { POST } from '@/app/api/v2/job-posting/route';

const origin = 'https://preview.example.test';
const posting = 'https://jobs.example.test/valid';
const request = (url = posting, from = origin) => new NextRequest(origin + '/api/v2/job-posting', { method: 'POST',
  headers: { origin: from, host: 'preview.example.test', 'content-type': 'application/json' },
  body: JSON.stringify({ url }),
});
beforeEach(() => {
  mocks.session.mockResolvedValue({ user: { id: 'test-user' } });
  mocks.query.mockResolvedValue({ rowCount: 1 });
  mocks.posting.mockResolvedValue('Erfahrung in Projektleitung und Planung.');
});
afterEach(() => vi.resetAllMocks());

it('only imports over HTTPS for a same-origin authenticated request', async () => {
  expect((await POST(request(posting, 'https://other.example.test'))).status).toBe(403);
  expect((await POST(request('http://jobs.example.test/valid'))).status).toBe(400);
  mocks.session.mockRejectedValueOnce(new Error('Signed out'));
  expect((await POST(request())).status).toBe(401);
  expect(mocks.posting).not.toHaveBeenCalled();
  expect(mocks.query).not.toHaveBeenCalled();
});

it('applies a persistent account limit and caps text to the supported draft size', async () => {
  mocks.posting.mockResolvedValueOnce('a'.repeat(12500));
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect((await response.json()).text).toHaveLength(12000);
  expect(mocks.query.mock.calls[0][1][0]).toBe('motivationsboost:job-import:test-user');
  mocks.query.mockResolvedValueOnce({ rowCount: 0 });
  expect((await POST(request())).status).toBe(429);
  expect(mocks.posting).toHaveBeenCalledTimes(1);
});

it('offers manual entry when an ad cannot be fetched', async () => {
  mocks.posting.mockRejectedValueOnce(new Error('Connection failed'));
  const response = await POST(request());
  expect(response.status).toBe(422);
  expect((await response.json()).error).toContain('Text direkt ein');
});
