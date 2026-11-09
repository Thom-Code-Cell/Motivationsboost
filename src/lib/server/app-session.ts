import 'server-only';
import { headers } from 'next/headers';
import { getAuth } from './auth';

export async function requireAppSession() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Bitte zuerst anmelden.');
  return session;
}
