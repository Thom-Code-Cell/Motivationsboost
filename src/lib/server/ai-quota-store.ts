import 'server-only';
import { databasePool } from './postgres';
import { quotaFor } from '@/lib/ai-quota';

// Reserve before making a request. Failed provider requests still count, which
// prevents repeated failing calls from bypassing the quota.
export async function reserveAiAction(userId: string, now = new Date()) {
  const database = databasePool();
  const entitlement = await database.query(
    'SELECT plan, status, starts_at AS start, ends_at AS "end" FROM ai_entitlements WHERE user_id = $1', [userId]);
  const row = entitlement.rows[0];
  const start = row?.start instanceof Date ? row.start.toISOString() : row?.start;
  const end = row?.end instanceof Date ? row.end.toISOString() : row?.end;
  const quota = quotaFor(row ? { plan: row.plan, status: row.status, start, end } : undefined, now);
  const reserved = await database.query(
    `INSERT INTO ai_usage (user_id, period_key, actions) VALUES ($1, $2, 1)
     ON CONFLICT (user_id, period_key) DO UPDATE SET actions = ai_usage.actions + 1
     WHERE ai_usage.actions < $3 RETURNING actions`, [userId, quota.period, quota.limit]);
  if (reserved.rows.length !== 1) throw new Error('KI-Limit für diesen Zeitraum erreicht.');
  return { used: Number(reserved.rows[0].actions), limit: quota.limit };
}
