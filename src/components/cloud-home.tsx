'use client';
import { useEffect, useState } from 'react';
import { GoogleAuthProvider, onIdTokenChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { auth, isFirebaseInitialized } from '@/lib/firebase';
import { initializeUserDocument } from '@/services/user';
import { LandingPage } from '@/components/landing-page';
import { FirebaseSetupCard } from '@/components/firebase-setup-card';
import { useToast } from '@/hooks/use-toast';

const Dashboard = dynamic(() => import('@/components/dashboard').then(mod => mod.Dashboard), { ssr: false });
export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const { toast } = useToast();
  useEffect(() => {
    if (!auth) { setIsLoading(false); return; }
    let active = true;
    const unsubscribe = onIdTokenChanged(auth, async currentUser => {
      try {
        if (currentUser) {
          const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: await currentUser.getIdToken() }) });
          if (!response.ok) throw new Error('Die Anmeldung konnte nicht bestätigt werden. Bitte später erneut versuchen.');
          const sessionInfo = await response.json();
          if (active) setIsAdmin(sessionInfo.isAdmin === true);
          await initializeUserDocument(currentUser.uid, navigator.language);
          if (active) setUser(currentUser);
        } else {
          await fetch('/api/session', { method: 'DELETE' });
          if (active) { setUser(null); setAccessToken(null); setIsAdmin(false); }
        }
        if (active) setAuthError(null);
      } catch (error) {
        if (active) { setUser(null); setAuthError(error instanceof Error ? error.message : 'Anmeldung fehlgeschlagen.'); }
      } finally { if (active) setIsLoading(false); }
    });
    return () => { active = false; unsubscribe(); };
  }, []);
  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      const result = await signInWithPopup(auth, provider);
      setAccessToken(GoogleAuthProvider.credentialFromResult(result)?.accessToken || null);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'auth/popup-closed-by-user') return;
      setAuthError(code === 'auth/unauthorized-domain' ? 'Die Anmeldung ist für diese Webadresse noch nicht freigeschaltet.' : 'Google-Anmeldung fehlgeschlagen. Bitte Pop-ups erlauben und erneut versuchen.');
    }
  };
  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/session', { method: 'DELETE' });
      if (!response.ok) throw new Error('Abmeldung fehlgeschlagen.');
      if (auth) await signOut(auth);
      setAccessToken(null); setUser(null);
    } catch { toast({ title: 'Abmeldung fehlgeschlagen', variant: 'destructive' }); }
  };
  if (!isFirebaseInitialized) return <FirebaseSetupCard />;
  if (isLoading) return <div className="min-h-screen grid place-items-center"><Loader2 aria-label="Lade Anmeldung" className="animate-spin" /></div>;
  if (!user) return <>{authError && <p role="alert" className="p-4 text-center text-destructive">{authError}</p>}<LandingPage handleSignIn={handleGoogleSignIn} /></>;
  return <Dashboard isAdmin={isAdmin} user={user} accessToken={accessToken} isAuthLoading={isLoading} handleSignIn={handleGoogleSignIn} handleSignOut={handleSignOut} />;
}
