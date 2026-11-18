import 'server-only';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { databasePool } from './postgres';

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const deploymentOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  const baseURL = process.env.BETTER_AUTH_URL || process.env.APP_URL || deploymentOrigin;
  if (!secret || !baseURL) throw new Error('Anmeldung ist noch nicht konfiguriert.');
  return betterAuth({
    database: databasePool(), secret, baseURL,
    emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 12, maxPasswordLength: 128 },
    plugins: [nextCookies()],
    trustedOrigins: [baseURL],
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() { return instance ??= createAuth(); }
