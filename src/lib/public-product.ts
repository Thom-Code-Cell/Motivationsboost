export const productOrigin = 'https://motivationsboost.th-analytica.com';
export const productSupportEmail = 'motivationsboost@th-analytica.com';
export const productAbout = productOrigin + '/about';
export const productSummary = 'Motivationsboost von TH Analytica unterstützt dich beim Entwerfen eines Motivationsschreibens und beim Organisieren deiner Bewerbungen.';
export const productLanguagePaths = { de: '/', en: '/en', fr: '/fr', it: '/it' } as const;
export const productLanguageAlternates = { ...Object.fromEntries(Object.entries(productLanguagePaths).map(([language, path]) => [language, productOrigin + path])), 'x-default': productOrigin + '/' };
export const productReleasedOn = '2026-11-26';

const productSearchCopy = {
  de: ['Motivationsboost | Bewerbungen organisieren und Motivationsschreiben erstellen', 'Organisiere Bewerbungen, lies Fotos und PDFs lokal aus und erstelle einen bearbeitbaren Briefentwurf. Kostenlos mit Motivationsboost von TH Analytica.'],
  en: ['Motivationsboost | Track job applications and draft cover letters', 'Track applications, extract text from photos and PDFs on your device, and draft an editable cover letter with Motivationsboost FREE.'],
  fr: ['Motivationsboost | Suivi des candidatures et lettre de motivation', 'Suivez vos candidatures, extrayez du texte de photos et PDF sur votre appareil et créez un brouillon de lettre avec Motivationsboost FREE.'],
  it: ['Motivationsboost | Gestione candidature e lettera di motivazione', 'Organizza le candidature, estrai testo da foto e PDF sul tuo dispositivo e crea una bozza modificabile con Motivationsboost FREE.'],
} as const;

export function publicProductMetadata(locale: ProductLocale): Metadata {
  const [title, description] = productSearchCopy[locale];
  const approved = publicProductApproved();
  return {
    title,
    description,
    robots: { index: approved, follow: approved },
    alternates: approved ? { canonical: productOrigin + productLanguagePaths[locale], languages: productLanguageAlternates } : undefined,
  };
}

export function publicProductSchema(locale: ProductLocale) {
  const home = productOrigin + '/';
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': 'https://th-analytica.com/#organization', name: 'TH Analytica', url: 'https://th-analytica.com/' },
      { '@type': 'WebSite', '@id': home + '#website', name: 'Motivationsboost', url: home, publisher: { '@id': 'https://th-analytica.com/#organization' }, inLanguage: Object.keys(productLanguagePaths) },
      { '@type': 'SoftwareApplication', '@id': home + '#app', name: 'Motivationsboost', url: home, description: productSearchCopy[locale][1], applicationCategory: 'BusinessApplication', operatingSystem: 'Web browser', inLanguage: Object.keys(productLanguagePaths), publisher: { '@id': 'https://th-analytica.com/#organization' }, offers: { '@type': 'Offer', price: 0, priceCurrency: 'CHF', url: home } },
      { '@type': 'WebPage', '@id': productOrigin + productLanguagePaths[locale] + '#webpage', url: productOrigin + productLanguagePaths[locale], inLanguage: locale, isPartOf: { '@id': home + '#website' }, mainEntity: { '@id': home + '#app' } },
    ],
  };
}

export function isCanonicalProductOrigin(value: string | undefined) {
  return value === productOrigin || value === productOrigin + '/';
}

export function publicProductApproved() {
  return process.env.PUBLIC_SITE_LAUNCHED === 'true' &&
    process.env.NEXT_PUBLIC_SITE_URL === productOrigin &&
    process.env.VERCEL_ENV !== 'preview';
}
import type { Metadata } from 'next';
import type { ProductLocale } from './product-locale';
