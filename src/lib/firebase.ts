
import { initializeApp, getApps, getApp, type FirebaseOptions, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import type { Analytics } from "firebase/analytics";

// For client-side Firebase services, we MUST use the public-facing NEXT_PUBLIC_FIREBASE_API_KEY.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;
let isFirebaseInitialized = false;

// We check if the essential keys for initialization are present.
// This prevents the app from crashing and allows us to show a setup guide.
if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain && firebaseConfig.appId) {
    try {
        app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname) && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
          connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
          connectFirestoreEmulator(db, '127.0.0.1', 8080);
        }

        isFirebaseInitialized = true;
    } catch (error) {
        console.error("Firebase initialization error:", error);
        isFirebaseInitialized = false;
    }
} else {
    if (typeof window !== "undefined") {
        console.warn("Firebase configuration is missing or incomplete. Features requiring Firebase will be disabled.");
    }
}

export { app, auth, db, analytics, isFirebaseInitialized };
