import 'server-only';
import { headers } from 'next/headers';
import { getAuth } from './auth';
import { internalTestHostAllowed, isInternalTestMode } from './internal-test';

export async function requireAppSession() {
  if (isInternalTestMode()) {
    if (!await internalTestHostAllowed()) throw new Error('Der interne Testmodus ist nur über localhost erreichbar.');
    return { user: { id: 'internal-test-user', name: 'Interne Testperson', email: 'internal-test@localhost' } };
  }
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Bitte zuerst anmelden.');
  return session;
}
