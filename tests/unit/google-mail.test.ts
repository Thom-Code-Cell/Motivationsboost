import { createHash, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emailDeliveryConfigured, sendTransactionalEmail } from '@/lib/server/email';
import { accountEmail } from '@/lib/account-email-copy';
import { productLanguageHeader } from '@/lib/product-locale';

const secret = 'a'.repeat(64);
const endpoint = 'https://script.google.com/macros/s/test-id/exec';
const message = { to: 'test@example.com', subject: 'Bestätige deine Adresse', text: 'Hallo', idempotencyKey: 'sandbox-notice' };

it('localizes account messages and preserves the account link in the message body', () => {
  const url = 'https://example.com/account?token=synthetic';
  const request = new Request(url, { headers: { [productLanguageHeader]: 'fr', 'accept-language': 'en-US,en;q=0.9' } });
  const verification = accountEmail('verification', message.to, url, request);
  expect(verification.subject).toContain('Confirmez');
  expect(verification.text.split('\n\n')[1]).toBe(url);
  const preferred = new Request(url, { headers: { 'accept-language': 'en;q=0.2,it-CH;q=0.9,de;q=0' } });
  expect(accountEmail('reset', message.to, url, preferred).subject).toContain('Reimposta');
  expect(accountEmail('deletion', message.to, url).subject).toContain('Kontolöschung');
  const english = new Request(url, { headers: { [productLanguageHeader]: 'en' } });
  expect(accountEmail('deletion', message.to, url, english).subject).toContain('Confirm deletion');
});

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'preview');
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

function googleScript() {
  const content = readFileSync('scripts/google-workspace-mail/Code.gs', 'utf8');
  const send = vi.fn();
  const values = new Map([['MAIL_RELAY_SECRET', secret], ['MAIL_RELAY_MODE', 'preview']]);
  const store = {
    getProperty: (key: string) => values.get(key),
    setProperty: (key: string, value: string) => values.set(key, value),
    getProperties: () => Object.fromEntries(values),
    deleteProperty: (key: string) => values.delete(key),
    setProperties: (properties: Record<string, string>) => Object.entries(properties).forEach(([key, value]) => values.set(key, value)),
  };
  const post = runInNewContext(content + '\ndoPost', {
    ContentService: { MimeType: { JSON: 'JSON' }, createTextOutput: (text: string) => ({ setMimeType: () => JSON.parse(text) }) },
    Utilities: {
      Charset: { UTF_8: 'UTF-8' },
      computeHmacSha256Signature: (value: string, key: string) => [...createHmac('sha256', key).update(value).digest()],
      base64DecodeWebSafe: (value: string) => Buffer.from(value, 'base64url'),
      base64Encode: (value: string) => Buffer.from(value).toString('base64'),
      base64EncodeWebSafe: (value: string) => Buffer.from(value).toString('base64url'),
      newBlob: (value: string | Uint8Array) => {
        const bytes = typeof value === 'string' ? Buffer.from(value) : Buffer.from(value);
        return { getBytes: () => bytes, getDataAsString: () => bytes.toString() };
      },
      formatDate: (date: Date) => date.toISOString().slice(0, 10),
    },
    Gmail: { Users: { Messages: { send } } },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    PropertiesService: { getScriptProperties: () => store },
  }) as (request: { postData: { contents: string } }) => { status: string };
  const request = (to = 'thhullin+mb-check@gmail.com', timestamp = Date.now(), key = secret, subject = message.subject) => {
    const id = createHash('sha256').update('fixed-test-request').digest('hex');
    const payload = Buffer.from(JSON.stringify({ ...message, id, to, subject })).toString('base64url');
    const signature = createHmac('sha256', key).update(`${timestamp}.${payload}`).digest('hex');
    return post({ postData: { contents: JSON.stringify({ timestamp, payload, signature }) } });
  };
  return { request, send };
}

it('rejects wrong signatures, old timestamps, other recipients and header injection in the preview script', () => {
  const script = googleScript();
  expect(script.request(undefined, Date.now(), 'b'.repeat(64))).toEqual({ status: 'denied' });
  expect(script.request(undefined, Date.now() - 300_000)).toEqual({ status: 'denied' });
  expect(script.request('unrelated@example.com')).toEqual({ status: 'denied' });
  expect(script.request(undefined, Date.now(), secret, 'Subject\r\nBcc: unrelated@example.com')).toEqual({ status: 'denied' });
  expect(script.send).not.toHaveBeenCalled();
});

it('uses the fixed alias and avoids sending the same message again', () => {
  const { request, send } = googleScript();
  expect(request()).toEqual({ status: 'sent' });
  expect(request()).toEqual({ status: 'duplicate' });
  expect(send).toHaveBeenCalledTimes(1);
  expect(Buffer.from(send.mock.calls[0][0].raw, 'base64url').toString()).toContain('From: Motivationsboost <motivationsboost@th-analytica.com>');
});

it('holds an ambiguous send without retrying it blindly', () => {
  const { request, send } = googleScript();
  send.mockImplementation(() => { throw new Error('uncertain provider response'); });
  expect(request()).toEqual({ status: 'uncertain' });
  expect(request()).toEqual({ status: 'uncertain' });
  expect(send).toHaveBeenCalledTimes(1);
});
