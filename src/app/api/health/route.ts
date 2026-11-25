import { NextResponse } from 'next/server';
import { databasePool } from '@/lib/server/postgres';
import { emailDeliveryConfigured } from '@/lib/server/email';
export async function GET() {
  let database = false;
  let schema = false;
  try {
    const result = await databasePool().query(`SELECT
      to_regclass('"user"') IS NOT NULL AS users,
      to_regclass('"session"') IS NOT NULL AS sessions,
      to_regclass('"account"') IS NOT NULL AS accounts,
      to_regclass('verification') IS NOT NULL AS verifications,
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
        AND table_name = 'rateLimit' AND column_name = 'id') AS rate_limits,
      to_regclass('applications') IS NOT NULL AS applications,
      to_regclass('applicant_profiles') IS NOT NULL AS profiles,
      to_regclass('ai_usage') IS NOT NULL AS ai_usage,
      to_regclass('ai_entitlements') IS NOT NULL AS ai_entitlements`);
    database = true;
    schema = Object.values(result.rows[0] as Record<string, boolean>).every(Boolean);
  } catch { /* report status without leaking connection details */ }
  const production = process.env.VERCEL_ENV === 'production' || (process.env.NODE_ENV === 'production' && !process.env.VERCEL);
  const emailVerificationRequired = process.env.NODE_ENV === 'production' || process.env.BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION === 'true';
  const checks = {
    database,
    databaseSchema: schema,
    emailPasswordAuth: Boolean(process.env.BETTER_AUTH_SECRET && Buffer.byteLength(process.env.BETTER_AUTH_SECRET, 'utf8') >= 32 && (production ? (process.env.BETTER_AUTH_URL || process.env.APP_URL) : (process.env.BETTER_AUTH_URL || process.env.APP_URL || process.env.VERCEL_URL)) && (!production || /^https:\/\//.test(process.env.BETTER_AUTH_URL || process.env.APP_URL || ''))),
    transactionalEmail: emailDeliveryConfigured() && (!production || process.env.NEXT_PUBLIC_TRANSACTIONAL_EMAIL_ENABLED === 'true'),
    emailVerification: emailVerificationRequired && (!production || (process.env.BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION === 'true' && process.env.NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED === 'true')),
    aiProvider: Boolean(process.env.OPENAI_API_KEY),
  };
  const ready = database && schema && checks.emailPasswordAuth && (!production || (checks.transactionalEmail && checks.emailVerification));
  return NextResponse.json({ status: ready ? 'configured' : 'degraded', checks, liveServicesVerified: false }, { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
