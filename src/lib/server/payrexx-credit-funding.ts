import 'server-only';
import type { PoolClient } from 'pg';
import { chfMicrosPerCredit, oneTimePlans, PLANS, recurringPlans, type OneTimePlan, type RecurringPlan } from '../plans';
import { commercialAiBudgetLimit } from './ai-spend-store';

const oneTimeCreditLimits = JSON.stringify(oneTimePlans.map(plan => ({
  plan, credits: PLANS[plan].limit,
})));
const subscriptionCreditLimits = JSON.stringify(recurringPlans.map(plan => ({
  plan, credits: PLANS[plan].limit,
})));

export async function canFundPayrexxSubscriptionPeriod(db: Pick<PoolClient, 'query'>, plan: RecurringPlan,
  startsAt: Date, endsAt: Date) {
  const limit = commercialAiBudgetLimit();
  if (!limit) return false;
  const { rows: months } = await db.query<{ month: string }>(`
    SELECT month::date::text AS month
    FROM generate_series(
      date_trunc('month', now() AT TIME ZONE 'Europe/Zurich'),
      date_trunc('month', ($1::timestamptz - interval '1 microsecond') AT TIME ZONE 'Europe/Zurich'),
      interval '1 month'
    ) AS months(month) ORDER BY month`, [endsAt]);
  if (!months.length) return false;
  for (const { month } of months) {
    await db.query('INSERT INTO ai_product_spend (month) VALUES ($1) ON CONFLICT DO NOTHING', [month]);
    const { rows: [budget] } = await db.query<{ committed_micros: string; halted: boolean }>(
      'SELECT committed_micros, halted FROM ai_product_spend WHERE month = $1 FOR UPDATE', [month],
    );
    if (!budget || budget.halted) return false;
    const { rows: [liabilities] } = await db.query<{ credits: string }>(`
      WITH bounds AS (
        SELECT GREATEST(now(), $1::date::timestamp AT TIME ZONE 'Europe/Zurich') AS begins,
          (($1::date + interval '1 month') AT TIME ZONE 'Europe/Zurich') AS ends
      ), recurring AS (
        SELECT orders.reference_id, orders.plan, orders.status, cycle.starts_at, cycle.ends_at, limits.credits
        FROM payrexx_subscription_periods cycle
        JOIN payment_orders orders ON orders.reference_id = cycle.order_reference
        JOIN jsonb_to_recordset($2::jsonb) AS limits(plan text, credits integer) ON limits.plan = orders.plan
        WHERE NOT orders.sandbox AND orders.live_psp_id IS NOT NULL AND orders.status IN ('paid', 'pending')
        UNION ALL
        SELECT NULL::uuid, $4::text, 'pending', $5::timestamptz, $6::timestamptz, $7::integer
      ), recurring_balance AS (
        SELECT GREATEST(0, r.credits - CASE WHEN r.status = 'paid' THEN COALESCE(u.spent, 0) ELSE 0 END) AS credits
        FROM recurring r CROSS JOIN bounds
        CROSS JOIN LATERAL generate_series(0, CASE WHEN r.plan = 'yearly' THEN 11 ELSE 0 END) AS period(n)
        LEFT JOIN ai_credit_usage u ON u.payment_reference = r.reference_id AND u.period = period.n
        WHERE ((r.starts_at AT TIME ZONE 'UTC') + make_interval(months => period.n)) AT TIME ZONE 'UTC' < bounds.ends
          AND LEAST(r.ends_at, CASE WHEN r.plan = 'yearly' THEN
            ((r.starts_at AT TIME ZONE 'UTC') + make_interval(months => period.n + 1)) AT TIME ZONE 'UTC'
            ELSE r.ends_at END) > bounds.begins
      ), one_time_balance AS (
        SELECT GREATEST(0, limits.credits - CASE WHEN p.status = 'paid' THEN COALESCE(u.spent, 0) ELSE 0 END) AS credits
        FROM payment_orders p
        JOIN jsonb_to_recordset($3::jsonb) AS limits(plan text, credits integer) ON limits.plan = p.plan
        LEFT JOIN ai_credit_usage u ON u.payment_reference = p.reference_id AND u.period = 0
        LEFT JOIN ai_entitlements e ON p.plan = 'weekly' AND e.payment_reference = p.reference_id AND e.user_id = p.user_id
        CROSS JOIN bounds
        WHERE NOT p.sandbox AND p.live_psp_id IS NOT NULL AND (
          p.status IN ('pending', 'gateway-created') OR
          (p.status = 'paid' AND (p.plan <> 'weekly' OR (e.status = 'active' AND e.ends_at > bounds.begins)))
        )
      )
      SELECT (SELECT COALESCE(SUM(credits), 0) FROM recurring_balance)
        + (SELECT COALESCE(SUM(credits), 0) FROM one_time_balance) AS credits`,
    [month, subscriptionCreditLimits, oneTimeCreditLimits, plan, startsAt, endsAt, PLANS[plan].limit]);
    if (Number(budget.committed_micros) + Number(liabilities.credits) * chfMicrosPerCredit > limit) return false;
  }
  return true;
}

export async function canFundOneTimePayrexxOrder(db: Pick<PoolClient, 'query'>, plan: OneTimePlan) {
  const limit = commercialAiBudgetLimit();
  if (!limit) return false;
  if (plan !== 'weekly') {
    const { rows: [schema] } = await db.query<{ ready: boolean }>(`SELECT
      to_regclass('payment_orders_open_live_credit_pack') IS NOT NULL
      AND to_regclass('payment_orders_live_one_time_transaction') IS NOT NULL AS ready`);
    if (!schema?.ready) return false;
  }
  const { rows: [period] } = await db.query<{ month: string }>(
    "SELECT date_trunc('month', now() AT TIME ZONE 'Europe/Zurich')::date::text AS month",
  );
  await db.query('INSERT INTO ai_product_spend (month) VALUES ($1) ON CONFLICT DO NOTHING', [period.month]);
  // Serialize admission with other sales and commercial AI reservations for this month.
  const { rows: [budget] } = await db.query<{ committed_micros: string; halted: boolean }>(
    'SELECT committed_micros, halted FROM ai_product_spend WHERE month = $1 FOR UPDATE', [period.month],
  );
  if (!budget || budget.halted) return false;
  const { rows: [balance] } = await db.query<{ outstanding: string }>(`
    SELECT COALESCE(SUM(CASE WHEN p.status = 'paid' THEN GREATEST(0, t.credits - COALESCE(u.spent, 0))
      ELSE t.credits END), 0) AS outstanding
    FROM payment_orders p
    JOIN jsonb_to_recordset($1::jsonb) AS t(plan text, credits integer) ON t.plan = p.plan
    LEFT JOIN ai_credit_usage u ON u.payment_reference = p.reference_id AND u.period = 0
    LEFT JOIN ai_entitlements e ON p.plan = 'weekly' AND e.user_id = p.user_id AND e.payment_reference = p.reference_id
    WHERE NOT p.sandbox AND p.live_psp_id IS NOT NULL AND (
      p.status IN ('pending', 'gateway-created') OR
      (p.status = 'paid' AND (p.plan <> 'weekly' OR (e.status = 'active' AND e.ends_at > now())))
    )`, [oneTimeCreditLimits]);
  const { rows: [subscriptionSchema] } = await db.query<{ ready: boolean }>(
    "SELECT to_regclass('public.payrexx_subscription_periods') IS NOT NULL AS ready",
  );
  let outstanding = Number(balance.outstanding);
  if (subscriptionSchema?.ready) {
    const { rows: [subscriptions] } = await db.query<{ outstanding: string }>(`
      SELECT COALESCE(SUM(GREATEST(0, limits.credits - COALESCE(usage.spent, 0))), 0) AS outstanding
      FROM payrexx_subscription_periods cycle
      JOIN payment_orders orders ON orders.reference_id = cycle.order_reference
      JOIN jsonb_to_recordset($1::jsonb) AS limits(plan text, credits integer) ON limits.plan = orders.plan
      CROSS JOIN LATERAL generate_series(0, CASE WHEN orders.plan = 'yearly' THEN 11 ELSE 0 END) AS period(n)
      LEFT JOIN ai_credit_usage usage ON usage.payment_reference = orders.reference_id AND usage.period = period.n
      WHERE NOT orders.sandbox AND orders.live_psp_id IS NOT NULL AND orders.status IN ('paid', 'pending')
        AND LEAST(cycle.ends_at, CASE WHEN orders.plan = 'yearly' THEN
          ((cycle.starts_at AT TIME ZONE 'UTC') + make_interval(months => period.n + 1)) AT TIME ZONE 'UTC'
          ELSE cycle.ends_at END) > now()
        AND ((cycle.starts_at AT TIME ZONE 'UTC') + make_interval(months => period.n)) AT TIME ZONE 'UTC'
          < ($2::date + interval '1 month') AT TIME ZONE 'Europe/Zurich'
    `, [subscriptionCreditLimits, period.month]);
    outstanding += Number(subscriptions.outstanding);
    // A new non-expiring pack can displace an already committed subscription in
    // any future month. Refuse the sale if even the conservative full-credit
    // reservation for those periods leaves insufficient room.
    const { rows: [future] } = await db.query<{ credits: string; committed: string; halted: boolean }>(`
      WITH future_month AS (
        SELECT m.month, m.committed_micros, m.halted,
          (m.month::timestamp AT TIME ZONE 'Europe/Zurich') AS begins,
          ((m.month + interval '1 month') AT TIME ZONE 'Europe/Zurich') AS ends
        FROM ai_product_spend m WHERE m.month > $2::date
      ), coverage AS (
        SELECT m.month, m.committed_micros, m.halted, SUM(limits.credits) AS credits
        FROM future_month m
        JOIN payrexx_subscription_periods cycle ON cycle.starts_at < m.ends AND cycle.ends_at > m.begins
        JOIN payment_orders orders ON orders.reference_id = cycle.order_reference
        JOIN jsonb_to_recordset($1::jsonb) AS limits(plan text, credits integer) ON limits.plan = orders.plan
        CROSS JOIN LATERAL generate_series(0, CASE WHEN orders.plan = 'yearly' THEN 11 ELSE 0 END) AS period(n)
        WHERE NOT orders.sandbox AND orders.live_psp_id IS NOT NULL AND orders.status IN ('paid', 'pending')
          AND ((cycle.starts_at AT TIME ZONE 'UTC') + make_interval(months => period.n)) AT TIME ZONE 'UTC' < m.ends
          AND LEAST(cycle.ends_at, CASE WHEN orders.plan = 'yearly' THEN
            ((cycle.starts_at AT TIME ZONE 'UTC') + make_interval(months => period.n + 1)) AT TIME ZONE 'UTC'
            ELSE cycle.ends_at END) > m.begins
        GROUP BY m.month, m.committed_micros, m.halted
      )
      SELECT COALESCE(MAX(credits), 0) AS credits, COALESCE(MAX(committed_micros), 0) AS committed,
        COALESCE(bool_or(halted), false) AS halted FROM coverage`, [subscriptionCreditLimits, period.month]);
    if (future.halted || Number(future.committed) +
      (Number(future.credits) + Number(balance.outstanding) + PLANS[plan].limit) * chfMicrosPerCredit > limit) return false;
  }
  return Number(budget.committed_micros) + (outstanding + PLANS[plan].limit) * chfMicrosPerCredit <= limit;
}
