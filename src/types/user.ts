
import type { GenerateCvFromDocumentsOutput, Language } from '@/ai/schemas';

export interface FeatureFlags {
    reminderEnabled: boolean;
    exportEnabled: boolean; 
    languageSwitcher: boolean;
    emailLetter: boolean;
    previewEnabled: boolean;
    exportZipOnlyForPro: boolean;
    showTrustTab: boolean;
    showJobTracker: boolean;
    showJobFinder: boolean;
    showGamification: boolean;
    showInterviewCoach: boolean;
    atsFeedbackUnlocked: boolean;
    optimizerEnabled: boolean;
    linkedinBooster: boolean;
    stylePersonalization: boolean;
}

export interface PricePlanHistory {
    date: string;
    priceId: string;
    interval: string;
}

export interface JobSearchPreferences {
    keywords?: string[];
    locations?: string[];
    roles?: string[];
}

export interface Referral {
    newUserId: string;
    date: string;
}


export interface UserData {
    // Subscription details
    plan: 'free' | 'pro_month';
    price: number; // e.g., 39
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    subscriptionStatus: string;
    activeUntil?: string;
    subscriptionInterval: 'month' | '' | null;

    // User preferences & generated content
    userStyleSample: string;
    useStyleSample: boolean;
    useAutoLinkedInBooster: boolean;
    jobSearchPreferences: JobSearchPreferences;
    
    // Core App Structure
    language: Language;
    features: FeatureFlags;
    admin: boolean;
    trustLevel: number;
    lastActivity: string;
    progressStage: 'onboarding' | 'uploaded_docs' | 'cv_ready' | 'applied' | 'success';
    migrationComplete: boolean;

    // AI Autonomy & Conversion Fields
    userScore: number;
    conversionPotential: number; // Score 0–100
    upsellSuggested: boolean;
    upsellAccepted: boolean;
    upsellType: 'annual' | 'linkedin' | null;
    variantGroup: 'standard_upsell' | 'bonus_upsell' | 'default';
    aiTriggeredUpsell: boolean;
    conversionSource: string;
    pricePlanHistory: PricePlanHistory[];
    
    // Legal
    agbAccepted: boolean;
    agbVersion: string;
    acceptedPrivacyVersion: string;
    
    // Referral System
    referralCode: string;
    referredBy: string | null;
    referrals: Referral[];
}
