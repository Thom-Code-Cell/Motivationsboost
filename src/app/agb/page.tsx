import { CONTACT_EMAIL, LegalContent, TH_ANALYTICA_URL } from '@/components/legal-content';
import { LegalPageBody } from '@/components/legal-page-body';

export const metadata = {
  title: 'Nutzungsbedingungen | Motivationsboost',
  description: 'Nutzungsbedingungen und Kontaktinformationen zur KI-Karriereanwendung Motivationsboost.',
  robots: { index: false, follow: false },
};

export default function LegalPage() {
  return <LegalPageBody document="agb" email={CONTACT_EMAIL} website={TH_ANALYTICA_URL}><LegalContent document="agb" /></LegalPageBody>;
}
