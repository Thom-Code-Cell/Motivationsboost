import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
let env: RulesTestEnvironment;
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'demo-motivationsboost', firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } }); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });
const user = { plan: 'free', price: 0, admin: false, subscriptionStatus: 'free', features: { atsFeedbackUnlocked: false, optimizerEnabled: false } };
const application = { userId: 'alice', jobTitle: 'Leitung', company: 'Firma', jobUrl: 'https://example.org/job', status: 'Entwurf', applicationDate: new Date() };
describe('Firestore isolation and application lifecycle', () => {
  it('allows an owner to create and read their account', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/alice'), user));
    expect((await assertSucceeds(getDoc(doc(db, 'users/alice')))).data()?.plan).toBe('free');
  });
  it('rejects account creation under a different UID', async () => await assertFails(setDoc(doc(env.authenticatedContext('alice').firestore(), 'users/bob'), user)));
  it.each([{ admin: true }, { plan: 'pro_month' }, { price: 39 }, { stripeCustomerId: 'cus_fake' }, { features: { atsFeedbackUnlocked: true, optimizerEnabled: true } }])('rejects privileged account creation', async patch => await assertFails(setDoc(doc(env.authenticatedContext('alice').firestore(), 'users/alice'), { ...user, ...patch })));
  it('allows preferences but denies privilege escalation and foreign reads', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await setDoc(doc(db, 'users/alice'), user);
    await assertSucceeds(updateDoc(doc(db, 'users/alice'), { language: 'fr', userStyleSample: 'Mein Stil' }));
    await assertFails(updateDoc(doc(db, 'users/alice'), { admin: true }));
    await assertFails(updateDoc(doc(db, 'users/alice'), { plan: 'pro_month' }));
    await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice')));
  });
  it('supports create, query, status update and deletion of own applications', async () => {
    const db = env.authenticatedContext('alice').firestore(); const ref = doc(db, 'applications/application1');
    await assertSucceeds(setDoc(ref, application));
    const results = await assertSucceeds(getDocs(query(collection(db, 'applications'), where('userId', '==', 'alice'))));
    expect(results.size).toBe(1);
    await assertSucceeds(updateDoc(ref, { status: 'Interview' }));
    expect((await getDoc(ref)).data()?.status).toBe('Interview');
    await assertSucceeds(deleteDoc(ref)); await env.withSecurityRulesDisabled(async context => { expect((await getDoc(doc(context.firestore(), 'applications/application1'))).exists()).toBe(false); });
  });
  it('denies foreign reads, writes, deletes and transferring application ownership', async () => {
    const alice = env.authenticatedContext('alice').firestore(); const bob = env.authenticatedContext('bob').firestore();
    await setDoc(doc(alice, 'applications/application1'), application);
    await assertFails(getDoc(doc(bob, 'applications/application1')));
    await assertFails(updateDoc(doc(bob, 'applications/application1'), { userId: 'bob', status: 'Interview' }));
    await assertFails(deleteDoc(doc(bob, 'applications/application1')));
    await assertFails(updateDoc(doc(alice, 'applications/application1'), { userId: 'bob' }));
  });
  it('denies anonymous access and access to AI quota records', async () => {
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice'), user));
    await assertFails(setDoc(doc(env.authenticatedContext('alice').firestore(), 'aiUsage/alice'), { count: 0 }));
  });
  it('allows own progress and rejects foreign progress', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'progress/alice'), { progress: { letterGenerationCount: 1 } }));
    await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(), 'progress/alice')));
  });
});
