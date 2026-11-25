import { CONTACT_EMAIL, LegalContent, TH_ANALYTICA_URL } from '@/components/legal-content';
import { LegalPageBody } from '@/components/legal-page-body';
import { publicProductApproved } from '@/lib/public-product';
import { weeklyLiveCheckoutConfiguration } from '@/lib/server/payrexx-checkout-config';

export const metadata = {
  title: 'Nutzungsbedingungen | Motivationsboost',
  description: 'Nutzungsbedingungen und Kontaktinformationen zur KI-Karriereanwendung Motivationsboost.',
  robots: { index: false, follow: false },
};

export default function LegalPage() {
  const weeklyTermsVersion = weeklyLiveCheckoutConfiguration(process.env.PAYREXX_WEEKLY_LIVE_ACCEPTANCE_EMAIL)?.termsVersion;
  const releasedTerms = publicProductApproved() || Boolean(weeklyTermsVersion);
  return <LegalPageBody document="agb" email={CONTACT_EMAIL} website={TH_ANALYTICA_URL} releasedTerms={releasedTerms} weeklyTermsVersion={weeklyTermsVersion}>
    <LegalContent document="agb" releasedTerms={releasedTerms} />
  </LegalPageBody>;
}
