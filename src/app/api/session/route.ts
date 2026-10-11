import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/server/firebase-admin';
import { SESSION_COOKIE } from '@/lib/server/session';
import { isRequestOriginAllowed } from '@/lib/security';

export async function POST(request: NextRequest) {
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), process.env.NODE_ENV === 'production')) return NextResponse.json({ error: 'Ungültiger Ursprung.' }, { status: 403 });
  try {
    const { idToken } = await request.json();
    if (typeof idToken !== 'string' || idToken.length > 10000) return NextResponse.json({ error: 'Ungültiges Token.' }, { status: 400 });
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    if (decoded.firebase.sign_in_provider !== 'google.com') return NextResponse.json({ error: 'Google-Anmeldung erforderlich.' }, { status: 401 });
    const allowed = (process.env.ALLOWED_ADMIN_UIDS || '').split(',').map(uid => uid.trim());
    const response = NextResponse.json({ authenticated: true, isAdmin: decoded.admin === true || allowed.includes(decoded.uid) });
    response.headers.set('Cache-Control', 'no-store');
    response.cookies.set(SESSION_COOKIE, idToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: Math.max(0, decoded.exp - Math.floor(Date.now() / 1000)) });
    return response;
  } catch { return NextResponse.json({ error: 'Anmeldung konnte serverseitig nicht bestätigt werden.' }, { status: 401 }); }
}
export async function DELETE(request: NextRequest) {
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), process.env.NODE_ENV === 'production')) return NextResponse.json({ error: 'Ungültiger Ursprung.' }, { status: 403 });
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}
