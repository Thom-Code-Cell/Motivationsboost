import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { emailDeliveryConfigured, sendTransactionalEmail } from '@/lib/server/email';

const database = new PGlite();
const query = async (sql: string, params?: unknown[]) => {
  const result = await database.query(sql, params);
  return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
};
vi.mock('@/lib/server/postgres', () => ({
  databaseConnectionConfigured: () => true,
  databasePool: () => ({ query, connect: async () => ({ query, release() {} }) }),
}));

const draft = { to: 'applicant@example.test', subject: 'Confirmez votre adresse', text: 'Message synthétique' };

beforeAll(async () => {
  await database.exec(readFileSync('migrations/013_transactional_email_attempts.sql', 'utf8'));
});
beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('EMAIL_TRANSPORT', 'gmail-api');
  vi.stubEnv('GMAIL_API_CLIENT_ID', 'test-client-id');
  vi.stubEnv('GMAIL_API_CLIENT_SECRET', 'test-client-secret');
  vi.stubEnv('GMAIL_API_REFRESH_TOKEN', 'test-refresh-token');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
afterAll(async () => { await database.close(); });

it('keeps Google Preview and Gmail Production credentials bound to their environments', async () => {
  vi.stubEnv('VERCEL_ENV', 'preview');
  expect(emailDeliveryConfigured()).toBe(false);
  await expect(sendTransactionalEmail(draft)).rejects.toThrow('nicht konfiguriert');
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('EMAIL_TRANSPORT', 'google-workspace');
  vi.stubEnv('GOOGLE_APPS_SCRIPT_MAIL_URL', 'https://script.google.com/macros/s/test/exec');
  vi.stubEnv('GOOGLE_APPS_SCRIPT_MAIL_SECRET', 'a'.repeat(64));
  expect(emailDeliveryConfigured()).toBe(false);
  await expect(sendTransactionalEmail(draft)).rejects.toThrow('nicht konfiguriert');
});

it('rejects a Gmail token with wider permissions before attempting to send', async () => {
  const fetch = vi.fn().mockResolvedValue(
    Response.json({ access_token: 'test-token', token_type: 'Bearer', expires_in: 3600, scope: 'https://mail.google.com/' }),
  );
  vi.stubGlobal('fetch', fetch);
  await expect(sendTransactionalEmail({ ...draft, idempotencyKey: 'wide-scope' })).rejects.toThrow('reinen Versandzugriff');
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('sends the fixed From and Reply-To once and charges the sending cap across retries', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({
      access_token: 'test-token', token_type: 'Bearer', expires_in: 3600, scope: 'https://www.googleapis.com/auth/gmail.send',
    }))
    .mockResolvedValueOnce(Response.json({ id: 'gmail-synthetic-id' }));
  vi.stubGlobal('fetch', fetch);
  await sendTransactionalEmail(draft);
  await sendTransactionalEmail(draft);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[1][0]).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
  const mime = Buffer.from(JSON.parse(fetch.mock.calls[1][1].body).raw, 'base64url').toString('utf8');
  expect(mime).toContain('From: Motivationsboost <motivationsboost@th-analytica.com>');
  expect(mime).toContain('Reply-To: motivationsboost@th-analytica.com');
  expect(mime).toContain('To: applicant@example.test');

  await database.exec("INSERT INTO transactional_email_attempts (id) SELECT lpad(to_hex(n), 64, '0') FROM generate_series(1, 250) AS n");
  await expect(sendTransactionalEmail({ ...draft, idempotencyKey: 'past-daily-limit' })).rejects.toThrow('Tageslimit');
  expect(fetch).toHaveBeenCalledTimes(2);
});
