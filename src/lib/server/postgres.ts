import 'server-only';
import { Pool } from 'pg';

let pool: Pool | undefined;
export function databasePool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error('PostgreSQL ist noch nicht konfiguriert.');
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 4, connectionTimeoutMillis: 5000 });
  return pool;
}
