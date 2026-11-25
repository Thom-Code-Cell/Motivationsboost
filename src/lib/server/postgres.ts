import 'server-only';
import { Pool } from 'pg';

let pool: Pool | undefined;

export function databaseConnectionConfigured() {
  return Boolean(databaseConnectionString());
}

function databaseConnectionString() {
  if (process.env.VERCEL_ENV === 'preview' && process.env.MOTIVATIONS_NEON_BRANCH_PREVIEW === 'true') {
    // Vercel's Neon integration injects the branch-aware pooled URL. Ignore the
    // manually added project-wide DATABASE_URL when this preview opts in.
    return process.env.POSTGRES_URL;
  }
  return process.env.DATABASE_URL;
}
export function databasePool(): Pool {
  const connectionString = databaseConnectionString();
  if (!connectionString) throw new Error('PostgreSQL ist noch nicht konfiguriert.');
  pool ??= new Pool({ connectionString, max: 4, connectionTimeoutMillis: 5000 });
  return pool;
}
