import 'server-only';
import { randomUUID } from 'node:crypto';
import { databasePool } from './postgres';
import { reserveCredits, restoreCredits } from './ai-credits';
import { chfMicrosPerCredit } from '@/lib/plans';

export class AiSpendBlocked extends Error {}
export class DuplicateAiRequest extends Error {}

export function commercialAiBudgetLimit() {
  const raw = process.env.MOTIVATIONS_PRODUCT_AI_MONTHLY_LIMIT_MICROS;
  const limit = raw && /^\d+$/.test(raw) ? Number(raw) : 0;
  return Number.isSafeInteger(limit) && limit > 0 ? limit : 0;
}

export async function reserveAiSpend(userId: string, requestId: string, amount: number, charge?: { credits: number; sandbox: boolean }) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10_000_000) throw new AiSpendBlocked();
  if (charge && (!Number.isSafeInteger(charge.credits) || charge.credits <= 0 || amount > charge.credits * chfMicrosPerCredit)) {
    throw new AiSpendBlocked();
  }
  const commercial = charge && !charge.sandbox;
  const limit = commercial ? commercialAiBudgetLimit() : 10_000_000;
  if (limit < amount) throw new AiSpendBlocked();
  const db = await databasePool().connect();
  const id = randomUUID();
  try {
    await db.query('BEGIN');
    let productMonth: string | null = null;
    if (commercial) {
      const result = await db.query<{ month: string }>("SELECT date_trunc('month', now() AT TIME ZONE 'Europe/Zurich')::date::text AS month");
      productMonth = result.rows[0].month;
      await db.query('INSERT INTO ai_product_spend (month) VALUES ($1) ON CONFLICT DO NOTHING', [productMonth]);
    }
    const inserted = await db.query(
      `INSERT INTO ai_spend_reservations (id, user_id, request_id, reserved_micros, product_month)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, request_id) DO NOTHING RETURNING id`,
      [id, userId, requestId, amount, productMonth],
    );
    if (!inserted.rowCount) throw new DuplicateAiRequest();
    const reserved = productMonth ? await db.query(
      `UPDATE ai_product_spend SET committed_micros = committed_micros + $1
       WHERE month = $2 AND NOT halted AND committed_micros + $1 <= $3`, [amount, productMonth, limit],
    ) : await db.query(
      `UPDATE ai_spend_budget SET committed_micros = committed_micros + $1
       WHERE id = 'internal-test' AND NOT halted AND committed_micros + $1 <= 10000000`,
      [amount],
    );
    if (!reserved.rowCount) throw new AiSpendBlocked();
    if (charge) await reserveCredits(db, userId, id, charge.credits, charge.sandbox);
    await db.query('COMMIT');
    return id;
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}

export async function settleAiSpend(id: string, actual: number) {
  const db = await databasePool().connect();
  try {
    await db.query('BEGIN');
    const reservation = await db.query<{ reserved_micros: number; actual_micros: number | null; product_month: string | null }>(
      'SELECT reserved_micros, actual_micros, product_month::text FROM ai_spend_reservations WHERE id = $1 FOR UPDATE', [id],
    );
    const row = reservation.rows[0];
    if (row?.actual_micros === null) {
      if (!Number.isSafeInteger(actual) || actual < 0 || actual > row.reserved_micros) {
        if (row.product_month) await db.query('UPDATE ai_product_spend SET halted = true WHERE month = $1', [row.product_month]);
        else await db.query("UPDATE ai_spend_budget SET halted = true WHERE id = 'internal-test'");
      } else {
        const release = row.reserved_micros - actual;
        if (row.product_month) await db.query('UPDATE ai_product_spend SET committed_micros = committed_micros - $1 WHERE month = $2', [release, row.product_month]);
        else await db.query("UPDATE ai_spend_budget SET committed_micros = committed_micros - $1 WHERE id = 'internal-test'", [release]);
        if (actual === 0) await restoreCredits(db, id);
        await db.query('UPDATE ai_spend_reservations SET actual_micros = $2 WHERE id = $1', [id, actual]);
      }
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}
