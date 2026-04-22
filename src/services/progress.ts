
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment, arrayUnion } from 'firebase/firestore';
import { BadgeConfig, ProgressDataSchema, type ProgressData, type BadgeId } from '@/types/progress';
import type { UserData } from '@/types/user';

const BadgeIds = Object.keys(BadgeConfig) as [BadgeId, ...BadgeId[]];

const calculateProgressScore = (earnedBadges: BadgeId[]): number => {
    const totalBadges = BadgeIds.length;
    if (totalBadges === 0) return 0;
    return Math.round((earnedBadges.length / totalBadges) * 100);
}

const getOrCreateProgressDoc = async (userId: string) => {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, 'progress', userId);
    let docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        const defaultProgress = ProgressDataSchema.parse({});
        await setDoc(docRef, {
            userId,
            progress: defaultProgress,
            lastUpdated: serverTimestamp(),
        });
        docSnap = await getDoc(docRef);
    }
    return docSnap;
}

export async function getProgress(userId: string): Promise<ProgressData> {
    const docSnap = await getOrCreateProgressDoc(userId);
    return ProgressDataSchema.parse(docSnap.data()?.progress || {});
}

type ProgressEvent = 
    | { type: 'CV_GENERATED' }
    | { type: 'ATS_CHECK_COMPLETED'; score: number }
    | { type: 'INTERVIEW_PREPARED' }
    | { type: 'LETTER_GENERATED' }
    | { type: 'PRO_PLAN_ACTIVATED' }
    | { type: 'APPLICATION_SENT' };

export async function updateProgress(userId: string, event: ProgressEvent): Promise<BadgeId | null> {
    if (!userId || !db) return null;
    
    const progressDocRef = doc(db, 'progress', userId);
    const userDocRef = doc(db, 'users', userId);

    const [progressDocSnap, userSnap] = await Promise.all([
        getOrCreateProgressDoc(userId),
        getDoc(userDocRef)
    ]);
    
    const progressData = ProgressDataSchema.parse(progressDocSnap.data()?.progress || {});
    const userData = userSnap.data() as UserData | undefined;

    // Final hardening: If user document doesn't exist yet (race condition), abort safely.
    if (!userData) {
        console.warn(`updateProgress called for user ${userId}, but user document does not exist yet. Aborting.`);
        return null;
    }

    let newBadge: BadgeId | null = null;
    const progressUpdates: {[key:string]: any} = { 'lastUpdated': serverTimestamp() };
    const userUpdates: {[key: string]: any} = { 'lastActivity': new Date().toISOString() };

    const hasBadge = (badgeId: BadgeId) => progressData.earnedBadges.includes(badgeId);

    // --- Core Gamification & Progress Logic ---
    switch(event.type) {
        case 'CV_GENERATED':
            if (!hasBadge('cvReady')) {
                newBadge = 'cvReady';
                userUpdates['trustLevel'] = increment(1);
            }
            userUpdates['progressStage'] = 'cv_ready';
            break;
        case 'ATS_CHECK_COMPLETED':
            userUpdates['trustLevel'] = increment(1);
            if (event.score > 85 && !hasBadge('atsWin')) {
                newBadge = 'atsWin';
                userUpdates['trustLevel'] = increment(2);
            }
            break;
        case 'INTERVIEW_PREPARED':
            if (!hasBadge('interviewMaster')) {
                newBadge = 'interviewMaster';
                userUpdates['trustLevel'] = increment(1);
            }
            break;
        case 'LETTER_GENERATED':
            progressUpdates['progress.letterGenerationCount'] = increment(1);
            userUpdates['trustLevel'] = increment(1);
            if (progressData.letterGenerationCount + 1 >= 3 && !hasBadge('motivationsHeld')) {
                newBadge = 'motivationsHeld';
            }
            break;
        case 'PRO_PLAN_ACTIVATED':
            if (!hasBadge('proUser')) newBadge = 'proUser';
            break;
        case 'APPLICATION_SENT':
            if (!hasBadge('firstApplicationSent')) {
                newBadge = 'firstApplicationSent';
                userUpdates['trustLevel'] = increment(1);
            }
            userUpdates['progressStage'] = 'applied';
            break;
    }

    if (newBadge) {
        progressUpdates['progress.earnedBadges'] = arrayUnion(newBadge);
        const newScore = calculateProgressScore([...progressData.earnedBadges, newBadge]);
        if (newScore !== progressData.progressScore) {
            progressUpdates['progress.progressScore'] = newScore;
        }
    }

    // --- KI Autonomy & Upsell Logic ---
    if (userData) {
        // Annual Upsell Trigger for active pro_month users who are very active
        if (userData.plan === 'pro_month' && !userData.upsellSuggested) {
            const letterCount = progressData.letterGenerationCount + (event.type === 'LETTER_GENERATED' ? 1 : 0);
            const hasHighAtsScore = event.type === 'ATS_CHECK_COMPLETED' && event.score >= 80;

            if (letterCount >= 3 || hasHighAtsScore) {
                userUpdates['upsellSuggested'] = true;
                userUpdates['upsellType'] = 'annual';
                userUpdates['aiTriggeredUpsell'] = true;
                userUpdates['conversionPotential'] = 80; // Assign a high potential score
            }
        }
    }
    
    // --- Batch Database Writes ---
    const updates: Promise<any>[] = [];
    if (Object.keys(userUpdates).length > 1) { // 1 because lastActivity is always there
        updates.push(updateDoc(userDocRef, userUpdates));
    }
    if (Object.keys(progressUpdates).length > 1) { // 1 because lastUpdated is always there
        updates.push(updateDoc(progressDocRef, progressUpdates));
    }

    if (updates.length > 0) {
        await Promise.all(updates);
    }

    return newBadge;
}
