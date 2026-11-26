import { NextResponse } from 'next/server';
import { databasePool } from '@/lib/server/postgres';
import { emailDeliveryConfigured } from '@/lib/server/email';
import { isCanonicalProductOrigin } from '@/lib/public-product';
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
      to_regclass('ai_entitlements') IS NOT NULL AS ai_entitlements,
      to_regclass('ai_credit_usage') IS NOT NULL AS credit_usage,
      to_regclass('ai_product_spend') IS NOT NULL AS product_spend,
      (NOT $1::boolean OR to_regclass('transactional_email_attempts') IS NOT NULL) AS mail_attempts,
      (NOT $2::boolean OR to_regclass('payrexx_weekly_notices') IS NOT NULL) AS weekly_notices,
      to_regclass('product_economic_postings') IS NOT NULL AS economics`, [
      process.env.EMAIL_TRANSPORT === 'gmail-api', process.env.PAYREXX_WEEKLY_LIVE_CHECKOUT === 'true',
    ]);
    database = true;
    schema = Object.values(result.rows[0] as Record<string, boolean>).every(Boolean);
  } catch (error) {
    // Record a machine-readable failure without logging the connection or driver message.
    const code = (error as { code?: unknown } | null)?.code;
    const name = error instanceof TypeError ? 'invalid_configuration' : 'unavailable';
    console.warn('Motivationsboost database health check failed', typeof code === 'string' && /^[A-Z0-9_]{2,30}$/.test(code) ? code : name);
  }
  const production = process.env.VERCEL_ENV === 'production' || (process.env.NODE_ENV === 'production' && !process.env.VERCEL);
  const configuredOrigin = process.env.BETTER_AUTH_URL || process.env.APP_URL;
  const originReady = process.env.VERCEL_ENV === 'production' ? isCanonicalProductOrigin(configuredOrigin) :
    production ? /^https:\/\//.test(configuredOrigin || '') : Boolean(configuredOrigin || process.env.VERCEL_URL);
  const emailVerificationRequired = process.env.NODE_ENV === 'production' || process.env.BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION === 'true';
  const checks = {
    database,
    databaseSchema: schema,
    emailPasswordAuth: Boolean(process.env.BETTER_AUTH_SECRET && Buffer.byteLength(process.env.BETTER_AUTH_SECRET, 'utf8') >= 32 && originReady),
    transactionalEmail: emailDeliveryConfigured() && (!production || process.env.NEXT_PUBLIC_TRANSACTIONAL_EMAIL_ENABLED === 'true'),
    emailVerification: emailVerificationRequired && (!production || (process.env.BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION === 'true' && process.env.NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED === 'true')),
    aiProvider: Boolean(process.env.OPENAI_API_KEY),
  };
  const ready = database && schema && checks.emailPasswordAuth && (!production || (checks.transactionalEmail && checks.emailVerification));
  return NextResponse.json({ status: ready ? 'configured' : 'degraded', checks, liveServicesVerified: false }, { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
