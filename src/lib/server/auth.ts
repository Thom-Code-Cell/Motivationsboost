import 'server-only';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
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
      sendResetPassword: async ({ user, url }) => sendTransactionalEmail({
        to: user.email,
        subject: 'Passwort für Motivationsboost zurücksetzen',
        text: `Über diesen Link kannst du dein Passwort zurücksetzen. Der Link ist nur kurz gültig:\n\n${url}\n\nFalls du die Anfrage nicht gestellt hast, ignoriere diese Nachricht.`,
      }),
    },
    emailVerification: {
      sendOnSignUp: requireEmailVerification,
      sendOnSignIn: requireEmailVerification,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => sendTransactionalEmail({
        to: user.email,
        subject: 'E-Mail-Adresse für Motivationsboost bestätigen',
        text: `Bitte bestätige deine E-Mail-Adresse über diesen Link:\n\n${url}\n\nFalls du kein Konto erstellt hast, ignoriere diese Nachricht.`,
      }),
    },
    user: {
      deleteUser: {
        enabled: true,
        deleteTokenExpiresIn: 60 * 60,
        ...(confirmDeletionByEmail ? {
          sendDeleteAccountVerification: async ({ user, url }: { user: { email: string }; url: string }) => sendTransactionalEmail({
            to: user.email,
            subject: 'Kontolöschung bei Motivationsboost bestätigen',
            text: `Bestätige die dauerhafte Löschung deines Kontos über diesen Link (gültig 1 Stunde):\n\n${url}\n\nFalls du dies nicht angefordert hast, ignoriere diese Nachricht.`,
          }),
        } : {}),
      },
    },
    plugins: [nextCookies()],
    trustedOrigins: [baseURL],
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() { return instance ??= createAuth(); }
