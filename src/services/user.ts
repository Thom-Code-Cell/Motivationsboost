
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { Language } from '@/ai/schemas';
import type { UserData, FeatureFlags, JobSearchPreferences } from '@/types/user';

const defaultFeatures: FeatureFlags = {
    reminderEnabled: false,
    exportEnabled: true, 
    languageSwitcher: true,
    emailLetter: true,
    previewEnabled: true,
    exportZipOnlyForPro: true,
    showTrustTab: true,
    showJobTracker: true,
    showJobFinder: true,
    showGamification: true,
    showInterviewCoach: true,
    atsFeedbackUnlocked: false,
    optimizerEnabled: false,
    linkedinBooster: true,
    stylePersonalization: true,
};

const generateReferralCode = (length = 8) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};


export async function initializeUserDocument(userId: string, browserLang?: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const userDocRef = doc(db, 'users', userId);
    const adminUids = process.env.NEXT_PUBLIC_ALLOWED_UIDS?.split(',') || [];

    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data() as Partial<UserData>;
            const updates: {[key: string]: any} = {};
            
            if (!data.features) {
                updates['features'] = defaultFeatures;
            } else {
                const missingFeatures = Object.keys(defaultFeatures).filter(
                    key => data.features?.[key as keyof FeatureFlags] === undefined
                );
                if (missingFeatures.length > 0) {
                    updates['features'] = { ...defaultFeatures, ...data.features };
                }
            }
            if (!data.language) {
                const lang = browserLang?.substring(0, 2);
                updates['language'] = ['de', 'en', 'fr', 'it'].includes(lang || '') ? lang : 'de';
            }
            if (data.plan === undefined) updates['plan'] = 'free';
            if (data.progressStage === undefined) updates['progressStage'] = 'onboarding';
            if (data.trustLevel === undefined) updates['trustLevel'] = 0;
            if (data.lastActivity === undefined) updates['lastActivity'] = new Date().toISOString();
            
            if (data.price === undefined) updates['price'] = 0;
            if (data.conversionPotential === undefined) updates['conversionPotential'] = 0;
            if (data.upsellSuggested === undefined) updates['upsellSuggested'] = false;
            if (data.upsellAccepted === undefined) updates['upsellAccepted'] = false;
            if (data.upsellType === undefined) updates['upsellType'] = null;
            if (data.aiTriggeredUpsell === undefined) updates['aiTriggeredUpsell'] = false;
            if (!data.variantGroup || data.variantGroup === 'default') {
                updates['variantGroup'] = Math.random() < 0.5 ? 'standard_upsell' : 'bonus_upsell';
            }
            if (!data.pricePlanHistory) updates['pricePlanHistory'] = [];

            if (data.agbAccepted === undefined) updates['agbAccepted'] = false;
            if (data.agbVersion === undefined) updates['agbVersion'] = "0.0";
            if (data.acceptedPrivacyVersion === undefined) updates['acceptedPrivacyVersion'] = "0.0";
            
            if (data.userStyleSample === undefined) updates['userStyleSample'] = '';
            if (data.useStyleSample === undefined) updates['useStyleSample'] = true;
            if (data.useAutoLinkedInBooster === undefined) updates['useAutoLinkedInBooster'] = true;

            if (data.jobSearchPreferences === undefined) {
                updates['jobSearchPreferences'] = { keywords: [], locations: [], roles: [] };
            }

            if (!data.referralCode) {
                 updates['referralCode'] = generateReferralCode();
            }
            if (data.referrals === undefined) updates['referrals'] = [];
            if (data.referredBy === undefined) updates['referredBy'] = null;


            if (!data.migrationComplete) {
              updates['migrationComplete'] = true;
            }
            
            updates['admin'] = adminUids.includes(userId);


            if (Object.keys(updates).length > 0) { 
                await setDoc(userDocRef, updates, { merge: true });
            }
        } else {
            const lang = browserLang?.substring(0, 2);
            const initialUserData: UserData = {
                plan: 'free',
                price: 0,
                subscriptionStatus: 'free',
                subscriptionInterval: '',
                language: (['de', 'en', 'fr', 'it'].includes(lang || '') ? lang : 'de') as Language,
                progressStage: 'onboarding',
                features: defaultFeatures,
                admin: adminUids.includes(userId),
                trustLevel: 0,
                lastActivity: new Date().toISOString(),
                migrationComplete: true,
                userScore: 0,
                conversionPotential: 0,
                upsellSuggested: false,
                upsellAccepted: false,
                upsellType: null,
                variantGroup: Math.random() < 0.5 ? 'standard_upsell' : 'bonus_upsell',
                aiTriggeredUpsell: false,
                conversionSource: 'direct',
                pricePlanHistory: [],
                agbAccepted: false,
                agbVersion: '0.0',
                acceptedPrivacyVersion: '0.0',
                userStyleSample: '',
                useStyleSample: true,
                useAutoLinkedInBooster: true,
                jobSearchPreferences: { keywords: [], locations: [], roles: [] },
                referralCode: generateReferralCode(),
                referrals: [],
                referredBy: null,
            };
            await setDoc(userDocRef, initialUserData);
        }
    } catch (error) {
        console.error("Error during user document initialization/migration:", error);
        throw error;
    }
}

export async function acceptAgb(userId: string, version: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
        agbAccepted: true,
        agbVersion: version,
    }, { merge: true });
}

export async function acceptPrivacyPolicy(userId: string, version: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
        acceptedPrivacyVersion: version,
    }, { merge: true });
}


interface StyleProfileData {
    userStyleSample?: string;
    useStyleSample?: boolean;
    useAutoLinkedInBooster?: boolean;
    jobSearchPreferences?: JobSearchPreferences;
}

export async function updateUserStyleProfile(userId: string, data: StyleProfileData): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  const userDocRef = doc(db, 'users', userId);
  
  const dataToUpdate: Partial<UserData> = {};

  if (data.userStyleSample !== undefined) {
    dataToUpdate.userStyleSample = data.userStyleSample;
  }
  if (data.useStyleSample !== undefined) {
    dataToUpdate.useStyleSample = data.useStyleSample;
  }
  if (data.useAutoLinkedInBooster !== undefined) {
    dataToUpdate.useAutoLinkedInBooster = data.useAutoLinkedInBooster;
  }
  
  // Robust check for jobSearchPreferences
  if (data.jobSearchPreferences) {
    dataToUpdate.jobSearchPreferences = {
      keywords: Array.isArray(data.jobSearchPreferences.keywords) ? data.jobSearchPreferences.keywords : [],
      locations: Array.isArray(data.jobSearchPreferences.locations) ? data.jobSearchPreferences.locations : [],
      roles: Array.isArray(data.jobSearchPreferences.roles) ? data.jobSearchPreferences.roles : [],
    };
  }
  
  if (Object.keys(dataToUpdate).length > 0) {
      await setDoc(userDocRef, dataToUpdate, { merge: true });
  }
}

export async function updateUser(userId: string, data: Partial<UserData>): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, data);
}
