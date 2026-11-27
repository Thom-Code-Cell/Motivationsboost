import 'server-only';
import type { PoolClient } from 'pg';
import { PLANS, type PlanId } from '@/lib/plans';
import { databasePool } from './postgres';

export class InsufficientCredits extends Error {}

type Bucket = { payment_reference: string; period: number; plan: PlanId; available: number };

const included = JSON.stringify(Object.values(PLANS).map(({ id, amount, limit }) => ({ id, amount, credits: limit })));

async function availableBuckets(db: Pick<PoolClient, 'query'>, userId: string, sandbox: boolean) {
  const { rows: [schema] } = await db.query<{ ready: boolean }>(
    "SELECT to_regclass('payrexx_subscription_periods') IS NOT NULL AS ready",
  );
  const subscriptionWindows = schema?.ready ? `
    UNION ALL
    SELECT cycle.order_reference, order_row.plan, cycle.starts_at, cycle.ends_at
    FROM payrexx_subscription_periods cycle
    JOIN payrexx_subscriptions subscription ON subscription.reference_id = cycle.subscription_reference
    JOIN payment_orders first_order ON first_order.reference_id = subscription.reference_id
    JOIN payment_orders order_row ON order_row.reference_id = cycle.order_reference
    WHERE NOT $2 AND order_row.user_id = $1 AND first_order.user_id = $1
      AND order_row.plan = first_order.plan AND order_row.plan IN ('monthly', 'yearly', 'poweruser')
      AND order_row.live_psp_id = first_order.live_psp_id AND NOT first_order.sandbox
      AND NOT order_row.sandbox AND order_row.provider_confirmed_at IS NOT NULL
  ` : '';
  return (await db.query<Bucket>(`
    WITH verified AS MATERIALIZED (
      SELECT p.reference_id, p.plan, c.credits
      FROM payment_orders p JOIN jsonb_to_recordset($3::jsonb) AS c(id text, amount integer, credits integer)
        ON c.id = p.plan AND c.amount = p.amount
      WHERE p.user_id = $1 AND p.sandbox = $2 AND p.status = 'paid' AND p.currency = 'CHF'
        AND p.payrexx_transaction_id IS NOT NULL AND p.accepted_terms_at IS NOT NULL
      FOR SHARE OF p
    ), active_windows AS (
      SELECT payment_reference, plan, starts_at, ends_at
      FROM ai_entitlements
      WHERE user_id = $1 AND status = 'active'
      ${subscriptionWindows}
    ), buckets AS (
      SELECT v.reference_id, v.plan, v.credits, period.n AS period, e.ends_at AS expiry
      FROM verified v JOIN active_windows e ON e.payment_reference = v.reference_id AND e.plan = v.plan
      CROSS JOIN LATERAL generate_series(0, CASE WHEN v.plan = 'yearly' THEN 11 ELSE 0 END) AS period(n)
      WHERE now() >= e.starts_at AND now() < e.ends_at
        AND (v.plan <> 'yearly' OR
          (now() AT TIME ZONE 'UTC' >= (e.starts_at AT TIME ZONE 'UTC') + make_interval(months => period.n)
          AND now() AT TIME ZONE 'UTC' < (e.starts_at AT TIME ZONE 'UTC') + make_interval(months => period.n + 1)))
      UNION ALL
      SELECT reference_id, plan, credits, 0, NULL FROM verified
      WHERE plan IN ('credits_small', 'credits_large') AND NOT $2
    ), distinct_buckets AS (
      SELECT reference_id, plan, credits, period, min(expiry) AS expiry
      FROM buckets
      GROUP BY reference_id, plan, credits, period
    )
    SELECT b.reference_id AS payment_reference, b.period, b.plan, b.credits - coalesce(u.spent, 0) AS available
    FROM distinct_buckets b LEFT JOIN ai_credit_usage u ON u.payment_reference = b.reference_id AND u.period = b.period
    WHERE b.credits > coalesce(u.spent, 0)
    ORDER BY b.expiry NULLS LAST, b.reference_id`, [userId, sandbox, included])).rows;
}

export async function creditBalance(userId: string, sandbox: boolean) {
  return (await availableBuckets(databasePool(), userId, sandbox)).reduce((total, bucket) => total + bucket.available, 0);
}

export async function reserveCredits(db: PoolClient, userId: string, spendId: string, credits: number, sandbox: boolean) {
  const buckets = await availableBuckets(db, userId, sandbox);
  if (buckets.reduce((sum, bucket) => sum + bucket.available, 0) < credits) throw new InsufficientCredits();
  let left = credits;
  for (const bucket of buckets) {
    if (left === 0) break;
    const used = Math.min(left, bucket.available);
    const capacity = PLANS[bucket.plan].limit;
    const updated = await db.query(`
      INSERT INTO ai_credit_usage (payment_reference, period, spent) VALUES ($1,$2,$3)
      ON CONFLICT (payment_reference, period) DO UPDATE SET spent = ai_credit_usage.spent + excluded.spent
      WHERE ai_credit_usage.spent + excluded.spent <= $4 RETURNING spent`,
    [bucket.payment_reference, bucket.period, used, capacity]);
    if (!updated.rowCount) throw new InsufficientCredits();
    await db.query(`
      INSERT INTO ai_credit_debits (spend_id, payment_reference, period, plan, credits)
      VALUES ($1,$2,$3,$4,$5)`, [spendId, bucket.payment_reference, bucket.period, bucket.plan, used]);
    left -= used;
  }
}

export async function restoreCredits(db: PoolClient, spendId: string) {
  await db.query(`
    UPDATE ai_credit_usage u SET spent = u.spent - d.credits
    FROM ai_credit_debits d
    WHERE d.spend_id = $1 AND u.payment_reference = d.payment_reference AND u.period = d.period`, [spendId]);
}
