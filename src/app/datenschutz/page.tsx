import { CONTACT_EMAIL, LegalContent, TH_ANALYTICA_URL } from '@/components/legal-content';
import { LegalPageBody } from '@/components/legal-page-body';
import { publicProductApproved } from '@/lib/public-product';

export const metadata = {
  title: 'Datenschutzhinweise | Motivationsboost',
  description: 'Datenschutzhinweise und Kontaktinformationen zur KI-Karriereanwendung Motivationsboost.',
  robots: { index: false, follow: false },
};

export default function LegalPage() {
  const releasedProduct = publicProductApproved();
  return <LegalPageBody document="datenschutz" email={CONTACT_EMAIL} website={TH_ANALYTICA_URL} releasedProduct={releasedProduct}>
    {!releasedProduct && <LegalContent document="datenschutz" />}
  </LegalPageBody>;
}
