import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

export function openTestDatabase() {
  const connectionString = process.env.MOTIVATIONS_E2E_DATABASE_URL;
  const url = connectionString && new URL(connectionString);
  if (!url || url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1' ||
      url.pathname !== '/motivationsboost_e2e') {
    throw new Error('Browser tests require the dedicated loopback motivationsboost_e2e database.');
  }

  return new Pool({ connectionString });
}

export default async function setup() {
  const database = openTestDatabase();
  try {
    for (const file of [
      '000_better_auth.sql',
      '001_app_data.sql',
      '002_payrexx_webhook_events.sql',
      '004_payrexx_orders.sql',
      '005_better_auth_rate_limit.sql',
      '006_better_auth_rate_limit_id.sql',
      '007_ai_spend_reservations.sql',
      '008_payrexx_entitlement_reference.sql',
      '009_payrexx_sandbox_checkout.sql',
      '010_payrexx_sandbox_status.sql',
      '011_payrexx_test_notices.sql',
      '012_credit_and_product_costs.sql',
      '013_transactional_email_attempts.sql',
      '014_payrexx_weekly_production.sql',
      '015_payrexx_credit_packs.sql',
    ]) {
      const migration = await readFile(`migrations/${file}`, 'utf8');
      await database.query(migration);
    }
  } finally {
    await database.end();
  }
}
