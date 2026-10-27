import type { UserData } from '@/types/user';
import type { Application } from '@/services/applications';
import type { ProgressData } from '@/types/progress';
import type { GenerateCvFromDocumentsOutput } from '@/ai/schemas';

export interface ApplicantDataExportInput {
  uid: string;
  email: string | null;
  displayName: string | null;
  profile: UserData | null;
  applications: Application[];
  progress: ProgressData | null;
  cv: GenerateCvFromDocumentsOutput | null;
  approvedLetter: string | null;
  linkedinSummary: string | null;
}

export function makeApplicantDataExport(input: ApplicantDataExportInput) {
  return {
    format: 'Motivationsboost personal data export',
    version: 1,
    exportedAt: new Date().toISOString(),
    identity: { uid: input.uid, email: input.email, displayName: input.displayName },
    preferences: input.profile && {
      language: input.profile.language,
      interfaceLanguage: input.profile.interfaceLanguage ?? null,
      targetCountry: input.profile.targetCountry ?? null,
      jobSearchPreferences: input.profile.jobSearchPreferences,
      useStyleSample: input.profile.useStyleSample,
      useAutoLinkedInBooster: input.profile.useAutoLinkedInBooster,
      userStyleSample: input.profile.userStyleSample,
      privacyConsentVersion: input.profile.acceptedPrivacyVersion,
      agbAccepted: input.profile.agbAccepted,
      agbVersion: input.profile.agbVersion,
    },
    subscription: input.profile && {
      plan: input.profile.plan,
      subscriptionStatus: input.profile.subscriptionStatus,
      subscriptionInterval: input.profile.subscriptionInterval,
    },
    applications: input.applications,
    progress: input.progress,
    generated: { cv: input.cv, motivationLetter: input.approvedLetter, linkedInSummary: input.linkedinSummary },
    note: 'This JSON contains current app state only. External Google Drive documents and provider/account records are not included. Downloaded files require secure local handling.',
  };
}
