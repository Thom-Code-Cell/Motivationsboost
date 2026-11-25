import 'server-only';
import { databasePool } from './postgres';
import { emailDeliveryConfigured, sendTransactionalEmail } from './email';

export async function sendNextPayrexxTestNotice() {
  const recipient = process.env.PAYREXX_SANDBOX_NOTICE_RECIPIENT;
  if (process.env.VERCEL_ENV !== 'preview' || !recipient || !emailDeliveryConfigured()) return;
  const db = databasePool();
  const result = await db.query<{ order_reference: string; kind: 'paid' | 'refunded'; attempts: number }>(`
    WITH next_notice AS (
      SELECT n.order_reference, n.kind
      FROM payrexx_test_notices n
      JOIN payment_orders o ON o.reference_id = n.order_reference
      WHERE o.sandbox AND n.sent_at IS NULL AND n.attempts < 8
        AND n.retry_at <= now() AND (n.lease_until IS NULL OR n.lease_until < now())
        AND n.queued_at > now() - interval '20 hours'
      ORDER BY n.queued_at
      FOR UPDATE OF n SKIP LOCKED LIMIT 1
    )
    UPDATE payrexx_test_notices n SET lease_until = now() + interval '2 minutes', attempts = n.attempts + 1
    FROM next_notice x
    WHERE n.order_reference = x.order_reference AND n.kind = x.kind
    RETURNING n.order_reference, n.kind, n.attempts`);
  const notice = result.rows[0];
  if (!notice) return;
  const args = [notice.order_reference, notice.kind, notice.attempts];
  try {
    const paid = notice.kind === 'paid';
    await sendTransactionalEmail({
      to: recipient,
      subject: paid ? 'Motivationsboost · Testzahlung bestätigt' : 'Motivationsboost · Testrückerstattung bestätigt',
      text: paid
        ? 'Payrexx hat die simulierte Zahlung bestätigt und der Testzugang wurde freigeschaltet.'
        : 'Payrexx hat die vollständige Rückerstattung der simulierten Zahlung bestätigt.',
      idempotencyKey: 'motivationsboost-test/' + notice.order_reference + '/' + notice.kind,
    });
    await db.query(`UPDATE payrexx_test_notices SET sent_at = now(), lease_until = NULL
      WHERE order_reference = $1 AND kind = $2 AND attempts = $3 AND sent_at IS NULL`, args);
  } catch {
    await db.query(`UPDATE payrexx_test_notices SET retry_at = now() + interval '15 minutes', lease_until = NULL
      WHERE order_reference = $1 AND kind = $2 AND attempts = $3 AND sent_at IS NULL`, args);
    console.warn('Motivationsboost test payment notice postponed');
  }
}
