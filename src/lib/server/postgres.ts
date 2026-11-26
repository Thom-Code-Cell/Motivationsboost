import 'server-only';
import { Pool } from 'pg';

let pool: Pool | undefined;

export function databaseConnectionConfigured() {
  return Boolean(databaseConnectionString());
}

function databaseConnectionString() {
  if (process.env.VERCEL_ENV === 'production') return process.env.MOTIVATIONS_PRODUCTION_DATABASE_URL;
  if (process.env.VERCEL_ENV === 'preview' && process.env.MOTIVATIONS_NEON_BRANCH_PREVIEW === 'true') {
    // This candidate requires an explicit connection scoped to its isolated
    // branch. Do not fall back to project-wide marketplace or legacy settings.
    return process.env.MOTIVATIONS_NEON_BRANCH_DATABASE_URL;
  }
  return process.env.DATABASE_URL;
}
export function databasePool(): Pool {
  const connectionString = databaseConnectionString();
  if (!connectionString) throw new Error('PostgreSQL ist noch nicht konfiguriert.');
  pool ??= new Pool({ connectionString, max: 4, connectionTimeoutMillis: 5000 });
  return pool;
}
