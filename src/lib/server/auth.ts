import 'server-only';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { databasePool } from './postgres';

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret || !baseURL || !clientId || !clientSecret) throw new Error('Anmeldung ist noch nicht konfiguriert.');
  return betterAuth({
    database: databasePool(), secret, baseURL,
    socialProviders: { google: { clientId, clientSecret } },
    plugins: [nextCookies()],
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() { return instance ??= createAuth(); }
