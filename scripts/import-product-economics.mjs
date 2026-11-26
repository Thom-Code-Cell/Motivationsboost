import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

const inputFile = process.argv[2];
const connectionString = process.env.MOTIVATIONS_ECONOMICS_DATABASE_URL;
if (!inputFile || !connectionString) throw new Error('Provide a JSON posting file and a dedicated economics database connection.');
const entries = JSON.parse(await readFile(inputFile, 'utf8'));
const plans = new Set(['free', 'weekly', 'monthly', 'yearly', 'poweruser', 'credits_small', 'credits_large', 'portfolio']);
const categories = new Set(['net_sales', 'refund', 'chargeback', 'payment_fee', 'acquisition', 'support', 'operations', 'shared_fixed', 'new_paying_customers']);
if (!Array.isArray(entries) || !entries.length || entries.length > 10_000) throw new Error('Expected 1–10,000 postings.');
for (const entry of entries) {
  if (!entry || typeof entry !== 'object' ||
      typeof entry.sourceKey !== 'string' || !/^[A-Za-z0-9:_-]{1,120}$/.test(entry.sourceKey) ||
      typeof entry.month !== 'string' || !/^20\d\d-(0[1-9]|1[0-2])-01$/.test(entry.month) ||
      !plans.has(entry.plan) || !categories.has(entry.category) ||
      !Number.isSafeInteger(entry.amountMicros) || entry.amountMicros < 0 ||
      (entry.category === 'new_paying_customers'
        ? Object.keys(entry).length !== 6 || !Number.isSafeInteger(entry.units) || entry.units < 0 || entry.amountMicros !== 0
        : Object.keys(entry).length !== 5 || Object.hasOwn(entry, 'units'))) throw new Error('Invalid posting.');
}

const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000 });
try {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    let imported = 0;
    for (const { sourceKey, month, plan, category, amountMicros, units = null } of entries) {
      const stored = await db.query(`
        INSERT INTO product_economic_postings (source_key, month, plan, category, amount_micros, units)
        SELECT $1,$2,$3,$4,$5,$6 WHERE NOT EXISTS (SELECT 1 FROM product_economic_closes WHERE month=$2)
        ON CONFLICT DO NOTHING RETURNING 1`, [sourceKey, month, plan, category, amountMicros, units]);
      if (stored.rowCount) {
        imported++;
      } else {
        const same = await db.query(`SELECT 1 FROM product_economic_postings
          WHERE source_key=$1 AND month=$2 AND plan=$3 AND category=$4 AND amount_micros=$5
          AND units IS NOT DISTINCT FROM $6`, [sourceKey, month, plan, category, amountMicros, units]);
        if (!same.rowCount) throw new Error('Conflicting source reference or closed month. Batch rolled back.');
      }
    }
    await db.query('COMMIT');
    console.log(JSON.stringify({ imported, unchanged: entries.length - imported }));
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
} finally {
  await pool.end();
}
