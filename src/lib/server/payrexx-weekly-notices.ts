import 'server-only';
import { isProductLocale } from '@/lib/product-locale';
import { PLANS } from '@/lib/plans';
import { databasePool } from './postgres';
import { emailDeliveryConfigured, sendTransactionalEmail } from './email';

const price = `CHF ${(PLANS.weekly.amount / 100).toFixed(2)}`;
const noticeCopy = {
  de: {
    paid: ['Zahlung für deinen Wochenpass bestätigt', `Payrexx hat deine Zahlung von ${price} bestätigt. Dein Wochenpass mit 20 Credits ist sieben Tage gültig. Er verlängert sich nicht automatisch.`],
    refunded: ['Rückerstattung für deinen Wochenpass bestätigt', `Payrexx hat die Rückerstattung von ${price} bestätigt. Der Wochenpass ist beendet.`],
    chargeback: ['Zahlung für deinen Wochenpass zurückbelastet', 'Payrexx hat eine Rückbelastung gemeldet. Der Wochenpass ist beendet. Bei Fragen antworte auf diese E-Mail.'],
  },
  en: {
    paid: ['Weekly pass payment confirmed', `Payrexx confirmed your payment of ${price}. Your weekly pass includes 20 credits and is valid for seven days. It does not renew automatically.`],
    refunded: ['Weekly pass refund confirmed', `Payrexx confirmed your refund of ${price}. The weekly pass has ended.`],
    chargeback: ['Weekly pass payment reversed', 'Payrexx reported a chargeback. The weekly pass has ended. Reply to this email if you have questions.'],
  },
  fr: {
    paid: ['Paiement du pass hebdomadaire confirmé', `Payrexx a confirmé votre paiement de ${price}. Votre pass de 20 crédits est valable sept jours. Il ne se renouvelle pas automatiquement.`],
    refunded: ['Remboursement du pass hebdomadaire confirmé', `Payrexx a confirmé le remboursement de ${price}. Le pass hebdomadaire a pris fin.`],
    chargeback: ['Paiement du pass hebdomadaire annulé', 'Payrexx a signalé une rétrofacturation. Le pass a pris fin. Pour toute question, répondez à cet e-mail.'],
  },
  it: {
    paid: ['Pagamento del pass settimanale confermato', `Payrexx ha confermato il pagamento di ${price}. Il pass con 20 crediti è valido per sette giorni. Non si rinnova automaticamente.`],
    refunded: ['Rimborso del pass settimanale confermato', `Payrexx ha confermato il rimborso di ${price}. Il pass settimanale è terminato.`],
    chargeback: ['Storno del pagamento del pass settimanale', 'Payrexx ha segnalato uno storno. Il pass settimanale è terminato. Per domande, rispondi a questa e-mail.'],
  },
} as const;

type WeeklyNotice = {
  order_reference: string;
  kind: keyof typeof noticeCopy.de;
  attempts: number;
  email: string;
  customer_locale: string | null;
};

export async function sendNextPayrexxWeeklyNotice() {
  if (process.env.VERCEL_ENV !== 'production' || process.env.EMAIL_TRANSPORT !== 'gmail-api' || !emailDeliveryConfigured()) return;
  const db = databasePool();
  const result = await db.query<WeeklyNotice>(`
    WITH next_notice AS (
      SELECT n.order_reference, n.kind, u.email, p.customer_locale
      FROM payrexx_weekly_notices n
      JOIN payment_orders p ON p.reference_id = n.order_reference
      JOIN "user" u ON u.id = p.user_id AND u."emailVerified" = true
      WHERE NOT p.sandbox AND p.plan = 'weekly' AND p.live_psp_id IS NOT NULL
        AND n.sent_at IS NULL AND n.attempts < 8 AND n.next_attempt_at <= now()
        AND n.queued_at > now() - interval '24 hours'
      ORDER BY n.queued_at, n.order_reference
      FOR UPDATE OF n SKIP LOCKED LIMIT 1
    )
    UPDATE payrexx_weekly_notices n SET attempts = n.attempts + 1, next_attempt_at = now() + interval '15 minutes'
    FROM next_notice x WHERE n.order_reference = x.order_reference AND n.kind = x.kind
    RETURNING n.order_reference, n.kind, n.attempts, x.email, x.customer_locale`);
  const notice = result.rows[0];
  if (!notice) return;
  const locale = notice.customer_locale && isProductLocale(notice.customer_locale) ? notice.customer_locale : 'de';
  const [subject, text] = noticeCopy[locale][notice.kind];
  try {
    await sendTransactionalEmail({
      to: notice.email, subject: `Motivationsboost · ${subject}`, text,
      idempotencyKey: `motivationsboost-weekly/${notice.order_reference}/${notice.kind}`,
    });
    await db.query(`UPDATE payrexx_weekly_notices SET sent_at = now()
      WHERE order_reference = $1 AND kind = $2 AND attempts = $3 AND sent_at IS NULL`, [notice.order_reference, notice.kind, notice.attempts]);
  } catch {
    console.warn('Motivationsboost weekly payment notice requires retry or reconciliation');
  }
}
