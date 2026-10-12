import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from './firebase-admin';
import { isLocalMode } from '@/lib/local-mode';
import { localRequest } from './local-security';

export const SESSION_COOKIE = '__session';
export async function requireSession() {
  if (isLocalMode()) {
    if (!localRequest.getStore()) throw new Error('Lokale Funktionen nur über die geschützte lokale API starten.');
    return { uid: 'local-user', admin: false, firebase: { sign_in_provider: 'local', identities: {} as Record<string, string[]> } };
  }
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) throw new Error('Bitte zuerst mit Google anmelden.');
  try { return await adminAuth().verifyIdToken(token, true); }
  catch { throw new Error('Ihre Sitzung ist abgelaufen. Bitte erneut anmelden.'); }
}
export async function requireAdmin() {
  const session = await requireSession();
  const allowed = (process.env.ALLOWED_ADMIN_UIDS || '').split(',').map(s => s.trim());
  if (session.admin !== true && !allowed.includes(session.uid)) throw new Error('Zugriff verweigert.');
  return session;
}
export async function authorizeAI(input: unknown, maxInputBytes = 2_000_000) {
  const session = await requireSession();
  if (isLocalMode()) {
    if (Buffer.byteLength(JSON.stringify(input), 'utf8') > maxInputBytes) throw new Error('Die Eingabe ist zu groß.');
    return session;
  }
  if (!process.env.GOOGLE_API_KEY) throw new Error('Der KI-Dienst ist noch nicht konfiguriert.');
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > maxInputBytes) throw new Error('Die Eingabe ist zu groß.');
  // A transaction enforces a shared limit across all instances and all AI functions.
  const hour = Math.floor(Date.now() / 3_600_000);
  const ref = adminDb().doc(`aiUsage/${session.uid}`);
  await adminDb().runTransaction(async tx => {
    const snap = await tx.get(ref);
    const count = snap.data()?.hour === hour ? Number(snap.data()?.count || 0) : 0;
    if (count >= 30) throw new Error('KI-Limit erreicht. Bitte in der nächsten Stunde erneut versuchen.');
    tx.set(ref, { hour, count: count + 1 });
  });
  return session;
}
