import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod/v3';
import { payrexxConfiguration } from '../payrexx';
import { chfMicrosPerCredit, PLANS, recurringPlans, type RecurringPlan } from '../plans';
import { commercialAiBudgetLimit } from './ai-spend-store';
import { hasCurrentAiApproval, openAIKeyConfigured } from './openai-client';
import { termsVersion, weeklyLiveWebhookConfiguration } from './payrexx-checkout-config';
import { canFundPayrexxSubscriptionPeriod } from './payrexx-credit-funding';
import { databasePool } from './postgres';
import { applyLiveSubscriptionTransaction } from './payrexx-subscriptions';

type DueSubscription = {
  reference_id: string;
  user_id: string;
  plan: RecurringPlan;
  tokenization_id: number;
  accepted_terms_version: string;
  accepted_terms_at: Date;
  customer_locale: string | null;
  due: boolean;
};

const unsignedInteger = z.string().regex(/^\d{1,6}$/).transform(Number);

export function subscriptionTerms(plan: RecurringPlan) {
  const enabled = {
    monthly: process.env.PAYREXX_MONTHLY_ENABLED,
    yearly: process.env.PAYREXX_YEARLY_ENABLED,
    poweruser: process.env.PAYREXX_POWERUSER_ENABLED,
  }[plan];
  const terms = termsVersion.safeParse(process.env.PAYREXX_SUBSCRIPTION_TERMS_VERSION);
  return enabled === 'true' && terms.success && canMeetSubscriptionMargin(plan) ? terms.data : undefined;
}

function canMeetSubscriptionMargin(plan: RecurringPlan) {
  const rate = unsignedInteger.safeParse(process.env.PAYREXX_SUBSCRIPTION_MAX_FEE_BPS);
  const fixed = unsignedInteger.safeParse(process.env.PAYREXX_SUBSCRIPTION_MAX_FEE_CENTS);
  if (!rate.success || !fixed.success) return false;
  const { amount, limit, interval } = PLANS[plan];
  const credits = limit * (interval === 'P1Y' ? 12 : 1);
  const fees = Math.ceil(amount * rate.data / 10_000) + fixed.data;
  const maxCostMicros = fees * 10_000 + credits * chfMicrosPerCredit;
  return maxCostMicros * 5 <= amount * 10_000;
}

export function subscriptionRenewalConfiguration() {
  const live = weeklyLiveWebhookConfiguration();
  const billing = payrexxConfiguration();
  if (process.env.PAYREXX_SUBSCRIPTION_RENEWAL_ENABLED !== 'true' || !live || !billing.enabled ||
      !billing.key || billing.key === process.env.PAYREXX_SANDBOX_API_KEY ||
      !commercialAiBudgetLimit() || !openAIKeyConfigured() || !hasCurrentAiApproval()) return null;
  return { ...live, key: billing.key };
}

export function subscriptionPeriodEnd(plan: RecurringPlan, startsAt: Date) {
  const months = PLANS[plan].interval === 'P1Y' ? 12 : 1;
  const endsAt = new Date(Date.UTC(startsAt.getUTCFullYear(), startsAt.getUTCMonth() + months, 1,
    startsAt.getUTCHours(), startsAt.getUTCMinutes(), startsAt.getUTCSeconds(), startsAt.getUTCMilliseconds()));
  const lastDay = new Date(Date.UTC(endsAt.getUTCFullYear(), endsAt.getUTCMonth() + 1, 0)).getUTCDate();
  endsAt.setUTCDate(Math.min(startsAt.getUTCDate(), lastDay));
  return endsAt;
}

async function claimDueSubscription(pspId: number) {
  const pool = databasePool();
  const { rows: candidates } = await pool.query<{ reference_id: string; user_id: string }>(`
    SELECT s.reference_id, anchor.user_id
    FROM payrexx_subscriptions s JOIN payment_orders anchor ON anchor.reference_id = s.reference_id
    WHERE s.renewal_enabled AND anchor.live_psp_id = $1 AND NOT anchor.sandbox
      AND NOT EXISTS (
        SELECT 1 FROM payrexx_subscription_periods p JOIN payment_orders o ON o.reference_id = p.order_reference
        WHERE p.subscription_reference = s.reference_id AND
          (o.status = 'pending' OR (o.status = 'paid' AND p.ends_at > now()))
      )
    ORDER BY s.authorized_at, s.reference_id LIMIT 12`, [pspId]);

  for (const candidate of candidates) {
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      const owner = await db.query('SELECT id FROM "user" WHERE id = $1 AND "emailVerified" = true FOR UPDATE', [candidate.user_id]);
      const { rows: [current] } = await db.query<DueSubscription>(`
        SELECT s.reference_id, o.user_id, o.plan, s.tokenization_id, o.accepted_terms_version,
          o.accepted_terms_at, o.customer_locale, NOT EXISTS (
            SELECT 1 FROM payrexx_subscription_periods p JOIN payment_orders existing ON existing.reference_id = p.order_reference
            WHERE p.subscription_reference = s.reference_id AND
              (existing.status = 'pending' OR (existing.status = 'paid' AND p.ends_at > now()))
          ) AS due
        FROM payrexx_subscriptions s JOIN payment_orders o ON o.reference_id = s.reference_id
        WHERE s.reference_id = $1 AND o.user_id = $2 AND s.renewal_enabled AND NOT o.sandbox
          AND o.live_psp_id = $3 AND o.plan = ANY($4::text[]) AND o.currency = 'CHF'
        FOR UPDATE OF s`, [candidate.reference_id, candidate.user_id, pspId, [...recurringPlans]]);
      if (!owner.rowCount || !current?.due || subscriptionTerms(current.plan) !== current.accepted_terms_version) {
        await db.query('ROLLBACK');
        continue;
      }

      const startsAt = new Date();
      const plan = PLANS[current.plan];
      const endsAt = subscriptionPeriodEnd(current.plan, startsAt);
      if (!hasCurrentAiApproval(endsAt.getTime()) ||
          !await canFundPayrexxSubscriptionPeriod(db, current.plan, startsAt, endsAt)) {
        await db.query('ROLLBACK');
        continue;
      }

      const reference = randomUUID();
      await db.query(`INSERT INTO payment_orders (reference_id, user_id, plan, amount, currency, status, sandbox,
        live_psp_id, accepted_terms_version, accepted_terms_at, customer_locale)
        VALUES ($1, $2, $3, $4, 'CHF', 'pending', false, $5, $6, $7, $8)`,
      [reference, current.user_id, current.plan, plan.amount, pspId,
        current.accepted_terms_version, current.accepted_terms_at, current.customer_locale]);
      await db.query(`INSERT INTO payrexx_subscription_periods (order_reference, subscription_reference,
        starts_at, ends_at, charge_requested_at) VALUES ($1, $2, $3, $4, now())`,
      [reference, current.reference_id, startsAt, endsAt]);
      await db.query('COMMIT');
      return { reference, anchor: current.reference_id, owner: current.user_id, token: current.tokenization_id, plan };
    } catch (error) {
      await db.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      db.release();
    }
  }
}

export async function requestNextPayrexxSubscriptionCharge(config: NonNullable<ReturnType<typeof subscriptionRenewalConfiguration>>) {
  const cycle = await claimDueSubscription(config.pspId);
  if (!cycle) return 'none';
  // referenceId is a reconciliation identifier. Payrexx does not document it as
  // an idempotency key here, so an uncertain submission must never be replayed.
  const target = new URL(`https://api.payrexx.com/v1.19/Transaction/${cycle.token}/`);
  target.searchParams.set('instance', config.instance);
  const db = await databasePool().connect();
  try {
    await db.query('BEGIN');
    const owner = await db.query('SELECT id FROM "user" WHERE id = $1 AND "emailVerified" = true FOR UPDATE', [cycle.owner]);
    const active = owner.rowCount && (await db.query(`
      SELECT 1 FROM payrexx_subscriptions s
      JOIN payrexx_subscription_periods p ON p.subscription_reference = s.reference_id
      JOIN payment_orders o ON o.reference_id = p.order_reference
      WHERE s.reference_id = $1 AND s.renewal_enabled AND o.reference_id = $2 AND o.status = 'pending'
      FOR UPDATE OF s`, [cycle.anchor, cycle.reference])).rowCount;
    if (!active) {
      await db.query("UPDATE payment_orders SET status = 'cancelled', updated_at = now() WHERE reference_id = $1 AND status = 'pending'", [cycle.reference]);
      await db.query('COMMIT');
      return 'cancelled';
    }
    const response = await fetch(target, {
      method: 'POST',
      headers: { 'X-API-KEY': config.key, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: cycle.plan.amount, purpose: `Motivationsboost ${cycle.plan.label}`, referenceId: cycle.reference }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    await db.query('COMMIT');
    return response.ok ? 'submitted' : 'requires-reconciliation';
  } catch {
    await db.query('ROLLBACK').catch(() => {});
    return 'requires-reconciliation';
  } finally {
    db.release();
  }
}

export async function reconcilePendingPayrexxSubscription(config: NonNullable<ReturnType<typeof subscriptionRenewalConfiguration>>) {
  const pool = databasePool();
  const { rows: [cycle] } = await pool.query<{ reference_id: string }>(`
    UPDATE payment_orders o SET payrexx_status_checked_at = now()
    WHERE o.reference_id = (
      SELECT p.order_reference FROM payrexx_subscription_periods p
      JOIN payment_orders pending ON pending.reference_id = p.order_reference
      WHERE NOT pending.sandbox AND pending.live_psp_id = $1 AND pending.status = 'pending'
        AND p.charge_requested_at < now() - interval '30 seconds'
        AND (pending.payrexx_status_checked_at IS NULL OR pending.payrexx_status_checked_at < now() - interval '1 hour')
      ORDER BY pending.payrexx_status_checked_at NULLS FIRST, p.charge_requested_at LIMIT 1
      FOR UPDATE OF pending SKIP LOCKED)
    RETURNING o.reference_id`, [config.pspId]);
  if (!cycle) return;
  const url = new URL('https://api.payrexx.com/v1.19/Transaction/');
  url.search = new URLSearchParams({
    instance: config.instance, filterMyTransactionsOnly: '1', filterReference: cycle.reference_id, limit: '20',
  }).toString();
  const response = await fetch(url, { headers: { 'X-API-KEY': config.key, Accept: 'application/json' },
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Payrexx renewal status unavailable');
  const result = z.object({ status: z.literal('success'), data: z.array(z.object({
    referenceId: z.string().uuid().nullish(),
    id: z.number().int().positive(), uuid: z.union([z.string(), z.number()]), status: z.string(),
    originalTransactionUuid: z.union([z.string(), z.number()]).nullish(),
    mode: z.literal('LIVE'), pspId: z.number().int().positive(), preAuthorizationId: z.number().int().positive().nullish(),
    invoice: z.object({
      referenceId: z.string().uuid().nullish(), currencyAlpha3: z.literal('CHF'),
      totalAmount: z.number().int(), originalAmount: z.number().int().positive(),
      refundedAmount: z.number().int().nonnegative().nullish(),
      test: z.union([z.literal(0), z.literal(false)]).nullish(),
    }),
  })) }).safeParse(await response.json());
  if (!result.success) throw new Error('Unrecognized Payrexx renewal status');
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    for (const transaction of result.data.data) {
      if ((transaction.referenceId ?? transaction.invoice.referenceId) !== cycle.reference_id) continue;
      await applyLiveSubscriptionTransaction(db, { transaction: {
        ...transaction, instance: { name: config.instance }, amount: transaction.invoice.totalAmount,
        invoice: { ...transaction.invoice, currency: 'CHF', test: false },
      } }, config);
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}
