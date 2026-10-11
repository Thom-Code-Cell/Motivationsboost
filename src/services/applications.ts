
'use client';

import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  Timestamp,
  limit,
  type QueryConstraint
} from 'firebase/firestore';
import { type AddApplicationData, type Application, type ApplicationStatus } from '@/types/application';


export async function addApplication(userId: string, data: AddApplicationData): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  await addDoc(collection(db, 'applications'), {
    ...data,
    userId,
    status: 'Entwurf',
    applicationDate: serverTimestamp(),
  });
}

export async function getApplications(userId: string, count?: number): Promise<Application[]> {
  if (!db) throw new Error('Firestore not initialized');
  const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      orderBy('applicationDate', 'desc')
  ];
  if(count) {
      constraints.push(limit(count));
  }
  const q = query(
    collection(db, 'applications'),
    ...constraints
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Application[];
}

export async function updateApplicationStatus(docId: string, status: ApplicationStatus): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  const docRef = doc(db, 'applications', docId);
  await updateDoc(docRef, { status });
}

export async function deleteApplication(docId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  const docRef = doc(db, 'applications', docId);
  await deleteDoc(docRef);
}

export type { Application } from "@/types/application";
