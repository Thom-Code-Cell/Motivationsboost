
'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { LandingPage } from '@/components/landing-page';
import { AuthErrorCard } from '@/components/auth-error-card';
import { FirebaseSetupCard } from '@/components/firebase-setup-card';

// Mock user data for testing purposes
const mockUser: User = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://placehold.co/100x100.png',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  // Dummy implementations for required methods
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({ token: 'mock-token', expirationTime: '', issuedAtTime: '', authTime: '', signInProvider: null, signInSecondFactor: null, claims: {} }),
  reload: async () => {},
  delete: async () => {},
  toJSON: () => ({}),
  providerId: 'password',
};

const Dashboard = dynamic(() => import('@/components/dashboard').then((mod) => mod.Dashboard), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Lade Dashboard...</p>
    </div>
  ),
});

export default function Home() {
  const [user] = useState<User | null>(mockUser);
  const [accessToken] = useState<string | null>('mock-access-token');
  const [isLoading] = useState(false);
  const [authError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Dummy functions to satisfy Dashboard component props
  const handleGoogleSignIn = async () => {
     toast({ title: "Anmeldung deaktiviert", description: "Die Anmeldung ist im Testmodus deaktiviert."});
  };
  
  const handleSignOut = async () => {
     toast({ title: "Abmeldung deaktiviert", description: "Die Abmeldung ist im Testmodus deaktiviert."});
  };

  if (authError) {
    return <AuthErrorCard />;
  }

  // A check for a valid Firebase Project ID can still be useful
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return <FirebaseSetupCard />;
  }
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Lade...</p>
      </div>
    );
  }

  if (!user) {
      // This part will now be skipped due to the mock user
    return <LandingPage handleSignIn={handleGoogleSignIn} />;
  }

  return <Dashboard user={user} accessToken={accessToken} isAuthLoading={isLoading} handleSignIn={handleGoogleSignIn} handleSignOut={handleSignOut} />;
}
