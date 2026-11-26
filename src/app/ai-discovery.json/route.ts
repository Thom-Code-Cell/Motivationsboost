import { productAbout, productLanguageAlternates, productOrigin, productReleasedOn, productSupportEmail, publicProductApproved } from '@/lib/public-product';

export function GET() {
  if (!publicProductApproved()) return new Response(null, { status: 404 });
  return Response.json({
    version: '1.0',
    updated: productReleasedOn,
    product: 'Motivationsboost',
    operator: 'TH Analytica',
    canonical: productOrigin + '/',
    sources: { productFacts: productAbout, privacy: productOrigin + '/datenschutz', terms: productOrigin + '/agb', reference: 'https://th-analytica.com/referenzen#motivationsboost' },
    landingPages: productLanguageAlternates,
    offer: { name: 'FREE', price: 0, currency: 'CHF', aiCredits: 0, externalAI: false, paidCheckoutAvailable: false },
    features: ['Local application tracking and document storage', 'On-device OCR for supported photos and PDFs', 'Optional import of publicly accessible HTTPS job listings', 'Editable guided cover-letter draft and export', 'Local backup and restore'],
    support: productSupportEmail,
    governance: productOrigin + '/.well-known/ai-governance.json',
  });
}
