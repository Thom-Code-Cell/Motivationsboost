import { CONTACT_EMAIL, LegalContent, TH_ANALYTICA_URL } from '@/components/legal-content';
import { LegalPageBody } from '@/components/legal-page-body';

export const metadata = {
  title: 'Datenschutzhinweise | Motivationsboost',
  description: 'Datenschutzhinweise und Kontaktinformationen zur KI-Karriereanwendung Motivationsboost.',
  robots: { index: false, follow: false },
};

export default function LegalPage() {
  return <LegalPageBody document="datenschutz" email={CONTACT_EMAIL} website={TH_ANALYTICA_URL}><LegalContent document="datenschutz" /></LegalPageBody>;
}
