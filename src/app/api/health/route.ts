import { NextResponse } from 'next/server';
import { databasePool } from '@/lib/server/postgres';
export async function GET() {
  let database = false;
  try { await databasePool().query('SELECT 1'); database = true; } catch { /* report status without leaking connection details */ }
  const checks = { database, emailPasswordAuth: Boolean(process.env.BETTER_AUTH_SECRET && (process.env.BETTER_AUTH_URL || process.env.APP_URL || process.env.VERCEL_URL)), aiProvider: Boolean(process.env.OPENAI_API_KEY) };
  const ready = database && checks.emailPasswordAuth;
  return NextResponse.json({ status: ready ? 'configured' : 'degraded', checks, liveServicesVerified: false }, { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
