import 'server-only';
import { randomUUID } from 'node:crypto';
import { databasePool } from './postgres';

export class AiSpendBlocked extends Error {}
export class DuplicateAiRequest extends Error {}

export async function reserveAiSpend(userId: string, requestId: string, amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10_000_000) throw new AiSpendBlocked();
  const db = await databasePool().connect();
  const id = randomUUID();
  try {
    await db.query('BEGIN');
    const inserted = await db.query(
      `INSERT INTO ai_spend_reservations (id, user_id, request_id, reserved_micros)
       VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, request_id) DO NOTHING RETURNING id`,
      [id, userId, requestId, amount],
    );
    if (!inserted.rowCount) throw new DuplicateAiRequest();
    const reserved = await db.query(
      `UPDATE ai_spend_budget SET committed_micros = committed_micros + $1
       WHERE id = 'internal-test' AND NOT halted AND committed_micros + $1 <= 10000000`,
      [amount],
    );
    if (!reserved.rowCount) throw new AiSpendBlocked();
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
    const reservation = await db.query<{ reserved_micros: number; actual_micros: number | null }>(
      'SELECT reserved_micros, actual_micros FROM ai_spend_reservations WHERE id = $1 FOR UPDATE', [id],
    );
    const row = reservation.rows[0];
    if (row?.actual_micros === null) {
      if (!Number.isSafeInteger(actual) || actual < 0 || actual > row.reserved_micros) {
        await db.query("UPDATE ai_spend_budget SET halted = true WHERE id = 'internal-test'");
      } else {
        await db.query('UPDATE ai_spend_reservations SET actual_micros = $2 WHERE id = $1', [id, actual]);
        await db.query("UPDATE ai_spend_budget SET committed_micros = committed_micros - $1 WHERE id = 'internal-test'", [row.reserved_micros - actual]);
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
