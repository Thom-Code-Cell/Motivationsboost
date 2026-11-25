import 'server-only';
import { createHash } from 'node:crypto';
import { productSupportEmail } from '@/lib/public-product';
import { databaseConnectionConfigured, databasePool } from './postgres';
import type { OutboundEmail } from './email';

const gmailSendScope = 'https://www.googleapis.com/auth/gmail.send';
const maximumDailyAttempts = 250;
const addressPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i;

export function productionGmailConfiguration() {
  const clientId = process.env.GMAIL_API_CLIENT_ID;
  const clientSecret = process.env.GMAIL_API_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_API_REFRESH_TOKEN;
  if (process.env.VERCEL_ENV !== 'production' || !clientId || !clientSecret ||
      !refreshToken || !databaseConnectionConfigured()) return null;
  return { clientId, clientSecret, refreshToken };
}

let cachedAccessToken: { token: string; expiresAt: number } | undefined;

async function gmailAccessToken(config: NonNullable<ReturnType<typeof productionGmailConfiguration>>) {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) return cachedAccessToken.token;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', body: new URLSearchParams({
      grant_type: 'refresh_token', client_id: config.clientId,
      client_secret: config.clientSecret, refresh_token: config.refreshToken,
    }), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000),
  });
  const data = await response.json().catch(() => null) as {
    access_token?: unknown; token_type?: unknown; expires_in?: unknown; scope?: unknown;
  } | null;
  if (!response.ok || typeof data?.access_token !== 'string' || typeof data.token_type !== 'string' ||
      data.token_type.toLowerCase() !== 'bearer' ||
      data.scope !== gmailSendScope || typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in)) {
    throw new Error('Gmail konnte den reinen Versandzugriff nicht bestätigen.');
  }
  cachedAccessToken = { token: data.access_token, expiresAt: Date.now() + Math.max(0, data.expires_in - 60) * 1000 };
  return data.access_token;
}

function encodeMime(message: OutboundEmail, id: string) {
  const { to, subject, text } = message;
  if (!subject || subject.length > 180 || /[\r\n]/.test(subject) || !text || text.length > 14000 ||
      to.length > 254 || !addressPattern.test(to)) throw new Error('Ungültige Transaktionsmail.');
  const words: string[] = [];
  let chunk = '';
  for (const character of subject) {
    if (Buffer.byteLength(chunk + character) > 42) {
      words.push(chunk);
      chunk = '';
    }
    chunk += character;
  }
  words.push(chunk);
  const encodedSubject = words.map(word => '=?UTF-8?B?' + Buffer.from(word).toString('base64') + '?=').join('\r\n ');
  const body = Buffer.from(text).toString('base64').match(/.{1,76}/g)?.join('\r\n');
  const mime = [
    'From: Motivationsboost <' + productSupportEmail + '>', 'Reply-To: ' + productSupportEmail,
    'To: ' + to, 'Subject: ' + encodedSubject,
    'Message-ID: <' + id + '@th-analytica.com>', 'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', body,
  ].join('\r\n');
  return Buffer.from(mime).toString('base64url');
}

async function reserveSend(id: string) {
  const db = await databasePool().connect();
  try {
    await db.query('BEGIN');
    // Keep the quota and duplicate check atomic across all production instances.
    await db.query('SELECT pg_advisory_xact_lock(77528, 1)');
    await db.query("DELETE FROM transactional_email_attempts WHERE attempted_at < now() - interval '48 hours'");
    const existing = await db.query<{ sent: boolean }>('SELECT sent FROM transactional_email_attempts WHERE id = $1', [id]);
    if (existing.rows[0]?.sent === false) throw new Error('Der Zustellversuch muss abgeglichen werden.');
    if (!existing.rows.length) {
      const inserted = await db.query(
        `INSERT INTO transactional_email_attempts (id)
         SELECT $1 WHERE (SELECT count(*) FROM transactional_email_attempts
           WHERE attempted_at >= date_trunc('day', now(), 'Europe/Zurich')) < $2`, [id, maximumDailyAttempts]);
      if (!inserted.rowCount) throw new Error('Tageslimit für den E-Mail-Versand erreicht.');
    }
    await db.query('COMMIT');
    return !existing.rows.length;
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}

export async function sendProductionGmail(message: OutboundEmail) {
  const config = productionGmailConfiguration();
  if (!config) throw new Error('Gmail-Produktionsversand ist nicht konfiguriert.');
  const id = createHash('sha256').update(message.idempotencyKey ?? JSON.stringify([message.to, message.subject, message.text])).digest('hex');
  const raw = encodeMime(message, id);
  const token = await gmailAccessToken(config);
  if (!await reserveSend(id)) return;

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000),
  });
  const result = await response.json().catch(() => null) as { id?: unknown } | null;
  // Ambiguous results remain reserved so a retry cannot silently duplicate the email.
  if (!response.ok || typeof result?.id !== 'string' || !result.id) throw new Error('Gmail hat den Versand nicht bestätigt.');
  await databasePool().query('UPDATE transactional_email_attempts SET sent = true WHERE id = $1', [id]);
}
