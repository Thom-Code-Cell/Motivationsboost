import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emailDeliveryConfigured, sendTransactionalEmail } from '@/lib/server/email';

const secret = 'a'.repeat(64);
const endpoint = 'https://script.google.com/macros/s/test-id/exec';
const message = { to: 'test@example.com', subject: 'Bestätige deine Adresse', text: 'Hallo', idempotencyKey: 'sandbox-notice' };

beforeEach(() => {
  vi.stubEnv('EMAIL_TRANSPORT', 'google-workspace');
  vi.stubEnv('GOOGLE_APPS_SCRIPT_MAIL_URL', endpoint);
  vi.stubEnv('GOOGLE_APPS_SCRIPT_MAIL_SECRET', secret);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('signs the message and follows only the Google Content Service redirect', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://script.googleusercontent.com/macros/echo' } }))
    .mockResolvedValueOnce(Response.json({ status: 'sent' }));
  vi.stubGlobal('fetch', fetch);
  expect(emailDeliveryConfigured()).toBe(true);
  await sendTransactionalEmail(message);
  const envelope = JSON.parse(fetch.mock.calls[0][1].body);
  expect(envelope.signature).toBe(createHmac('sha256', secret).update(`${envelope.timestamp}.${envelope.payload}`).digest('hex'));
  const parsed = JSON.parse(Buffer.from(envelope.payload, 'base64url').toString());
  expect(parsed).toMatchObject({ id: expect.stringMatching(/^[a-f0-9]{64}$/), to: message.to, subject: message.subject, text: message.text });
  expect(fetch.mock.calls[1][0].origin).toBe('https://script.googleusercontent.com');
  expect(fetch.mock.calls[1][1].body).toBeUndefined();
});

it('rejects redirect to login and rejects unconfirmed delivery', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://accounts.google.com/' } }))
    .mockResolvedValueOnce(Response.json({ status: 'uncertain' }));
  vi.stubGlobal('fetch', fetch);
  await expect(sendTransactionalEmail(message)).rejects.toThrow('nicht autorisiert');
  expect(fetch).toHaveBeenCalledTimes(1);
  await expect(sendTransactionalEmail(message)).rejects.toThrow('nicht bestätigt');
});

it('fails closed for an invalid or missing relay endpoint', async () => {
  vi.stubEnv('GOOGLE_APPS_SCRIPT_MAIL_URL', 'https://script.google.com.evil.example/macros/s/test/exec');
  expect(emailDeliveryConfigured()).toBe(false);
  await expect(sendTransactionalEmail(message)).rejects.toThrow('nicht konfiguriert');
});
