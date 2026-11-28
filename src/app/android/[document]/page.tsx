import { notFound } from 'next/navigation';
import { CONTACT_EMAIL, LegalContent, TH_ANALYTICA_URL } from '@/components/legal-content';
import { LegalPageBody } from '@/components/legal-page-body';

export default async function AndroidLegalPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (document !== 'datenschutz' && document !== 'agb' && document !== 'impressum') notFound();

  return <LegalPageBody document={document} email={CONTACT_EMAIL} website={TH_ANALYTICA_URL}
    android releasedProduct releasedTerms={document === 'agb'}>
    {document === 'agb' && <LegalContent document="agb" releasedTerms privacyPath="/android/datenschutz" />}
  </LegalPageBody>;
}
