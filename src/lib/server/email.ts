import 'server-only';
import { createHash, createHmac } from 'node:crypto';

type OutboundEmail = { to: string; subject: string; text: string; idempotencyKey?: string };

function googleMailer() {
  const secret = process.env.GOOGLE_APPS_SCRIPT_MAIL_SECRET;
  const endpoint = process.env.GOOGLE_APPS_SCRIPT_MAIL_URL;
  if (!endpoint || !secret || !/^[a-f0-9]{64}$/i.test(secret)) return null;
  try {
    const url = new URL(endpoint);
    if (url.origin !== 'https://script.google.com' || !/^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname) ||
        url.search || url.hash || url.username || url.password) return null;
    return { url, secret };
  } catch { return null; }
}

export function emailDeliveryConfigured() {
  if (process.env.EMAIL_TRANSPORT === 'google-workspace') return Boolean(googleMailer());
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

async function sendGoogleEmail(message: OutboundEmail) {
  const relay = googleMailer();
  if (!relay) throw new Error('Google-Workspace-Versand ist nicht konfiguriert.');
  const { to, subject, text } = message;
  const id = createHash('sha256').update(message.idempotencyKey ?? JSON.stringify([to, subject, text])).digest('hex');
  const payload = Buffer.from(JSON.stringify({ id, to, subject, text })).toString('base64url');
  const timestamp = Date.now();
  const signature = createHmac('sha256', relay.secret).update(`${timestamp}.${payload}`).digest('hex');
  const signal = AbortSignal.timeout(12_000);
  let response = await fetch(relay.url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timestamp, payload, signature }), redirect: 'manual', cache: 'no-store', signal,
  });
  if (response.status === 302 || response.status === 303) {
    const redirect = new URL(response.headers.get('location') ?? '', relay.url);
    if (redirect.origin !== 'https://script.googleusercontent.com' || redirect.username || redirect.password) {
      throw new Error('Google-Workspace-Versand hat den Aufruf nicht autorisiert.');
    }
    response = await fetch(redirect, { redirect: 'error', cache: 'no-store', signal });
  }
  const result = await response.json().catch(() => null) as { status?: unknown } | null;
  if (!response.ok || (result?.status !== 'sent' && result?.status !== 'duplicate')) {
    throw new Error('Google-Workspace-Versand hat die Nachricht nicht bestätigt.');
  }
}

export async function sendTransactionalEmail(message: OutboundEmail) {
  if (process.env.EMAIL_TRANSPORT === 'google-workspace') return sendGoogleEmail(message);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const replyTo = process.env.EMAIL_REPLY_TO;
  if (!apiKey || !from) throw new Error('E-Mail-Versand ist nicht konfiguriert.');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(message.idempotencyKey ? { 'Idempotency-Key': message.idempotencyKey } : {}) },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Transaktionale E-Mail konnte nicht zugestellt werden.');
}
