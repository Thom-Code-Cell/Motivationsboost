import 'server-only';

type OutboundEmail = { to: string; subject: string; text: string; idempotencyKey?: string };

export function emailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendTransactionalEmail(message: OutboundEmail) {
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
