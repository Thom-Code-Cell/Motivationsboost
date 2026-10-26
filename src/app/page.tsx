'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { LandingPage } from '@/components/landing-page';
import { FirebaseSetupCard } from '@/components/firebase-setup-card';

const Dashboard = dynamic(() => import('@/components/dashboard').then(mod => mod.Dashboard), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-label="Lade Dashboard" />
    </div>
  ),
});

function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.addScope('https://www.googleapis.com/auth/drive.readonly');
  return provider;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      if (!currentUser) setAccessToken(null);
      setIsLoading(false);
    });

    getRedirectResult(auth)
      .then(result => {
        if (result) {
          setUser(result.user);
          setAccessToken(GoogleAuthProvider.credentialFromResult(result)?.accessToken ?? null);
        }
      })
      .catch(error => {
        console.error('Google redirect sign in failed', error);
        toast({ title: 'Anmeldung fehlgeschlagen', description: 'Google-Anmeldung bitte erneut versuchen.', variant: 'destructive' });
      });

    return () => unsubscribe();
  }, [toast]);

  async function handleGoogleSignIn() {
    if (!auth) return;
    try {
      const result = await signInWithPopup(auth, googleProvider());
      const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken ?? null;
      setAccessToken(token);
      setUser(result.user);
      if (!token) {
        toast({ title: 'Drive-Zugriff fehlt', description: 'Für Dokumente ist eine erneute Google-Freigabe erforderlich.', variant: 'destructive' });
      }
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleProvider());
          return;
        } catch (redirectError) {
          console.error('Redirect sign in failed', redirectError);
        }
      }
      console.error('Sign in failed', error);
      toast({ title: 'Anmeldung fehlgeschlagen', description: 'Bitte prüfe deine Google-Freigabe und versuche es erneut.', variant: 'destructive' });
    }
  }

  async function handleSignOut() {
    if (!auth) return;
    try {
      await signOut(auth);
      setUser(null);
      setAccessToken(null);
    } catch (error) {
      console.error('Sign out failed', error);
      toast({ title: 'Abmeldung fehlgeschlagen', variant: 'destructive' });
    }
  }

  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !auth) return <FirebaseSetupCard />;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-label="Lade Anmeldung" />
      </div>
    );
  }

  if (!user) return <LandingPage handleSignIn={handleGoogleSignIn} />;

  return (
    <div>
      {!accessToken && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3 text-sm" role="status">
          <span>Du bist angemeldet. Für Google-Drive-Dokumente musst du den Zugriff nach einem Neuladen erneut bestätigen.</span>
          <Button type="button" size="sm" onClick={handleGoogleSignIn}>Google Drive verbinden</Button>
        </div>
      )}
      <Dashboard
        user={user}
        accessToken={accessToken}
        isAuthLoading={isLoading}
        handleSignIn={handleGoogleSignIn}
        handleSignOut={handleSignOut}
      />
    </div>
  );
}
