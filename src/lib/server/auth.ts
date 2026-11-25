import 'server-only';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { accountEmail } from '@/lib/account-email-copy';
import { isCanonicalProductOrigin } from '@/lib/public-product';
import { databasePool } from './postgres';
import { emailDeliveryConfigured, sendTransactionalEmail } from './email';

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const deploymentOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  const production = process.env.VERCEL_ENV === 'production' || (process.env.NODE_ENV === 'production' && !process.env.VERCEL);
  const explicitBaseURL = process.env.BETTER_AUTH_URL || process.env.APP_URL;
  const baseURL = explicitBaseURL || (production ? undefined : deploymentOrigin);
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32 || !baseURL) throw new Error('Anmeldung ist noch nicht sicher konfiguriert.');
  if (production && new URL(baseURL).protocol !== 'https:') throw new Error('Die Produktions-URL muss HTTPS verwenden.');
  if (process.env.VERCEL_ENV === 'production' && !isCanonicalProductOrigin(baseURL))
    throw new Error('Die Produktions-URL muss auf die Motivationsboost-Produktdomain zeigen.');
  const requireEmailVerification = process.env.NODE_ENV === 'production'
    || process.env.BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION === 'true';
  const confirmDeletionByEmail = production || emailDeliveryConfigured();
  return betterAuth({
    database: databasePool(), secret, baseURL,
    rateLimit: { enabled: true, storage: 'database', modelName: 'rateLimit' },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }, request) =>
        sendTransactionalEmail(accountEmail('reset', user.email, url, request)),
    },
    emailVerification: {
      sendOnSignUp: requireEmailVerification,
      sendOnSignIn: requireEmailVerification,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }, request) =>
        sendTransactionalEmail(accountEmail('verification', user.email, url, request)),
    },
    user: {
      deleteUser: {
        enabled: true,
        deleteTokenExpiresIn: 60 * 60,
        ...(confirmDeletionByEmail ? {
          sendDeleteAccountVerification: async ({ user, url }: { user: { email: string }; url: string }, request?: Request) =>
            sendTransactionalEmail(accountEmail('deletion', user.email, url, request)),
        } : {}),
      },
    },
    plugins: [nextCookies()],
    trustedOrigins: [baseURL],
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() { return instance ??= createAuth(); }
