import 'server-only';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export function getAdminApp() {
  const existing = getApps().find(app => app.name === 'motivationsboost-admin');
  if (existing) return existing;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Firebase-Serverkonfiguration fehlt.');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  return initializeApp({ projectId, credential: clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey }) : applicationDefault() }, 'motivationsboost-admin');
}
export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
