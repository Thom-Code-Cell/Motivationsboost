import 'server-only';
import type { PoolClient } from 'pg';
import { chfMicrosPerCredit, oneTimePlans, PLANS, type OneTimePlan } from '../plans';
import { commercialAiBudgetLimit } from './ai-spend-store';

const oneTimeCreditLimits = JSON.stringify(oneTimePlans.map(plan => ({
  plan, credits: PLANS[plan].limit,
})));

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
  return Number(budget.committed_micros) + (Number(balance.outstanding) + PLANS[plan].limit) * chfMicrosPerCredit <= limit;
}
