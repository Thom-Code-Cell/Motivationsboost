import { productAbout, productLanguageAlternates, productOrigin, productReleasedOn, publicProductApproved } from '@/lib/public-product';

export function GET() {
  if (!publicProductApproved()) return new Response(null, { status: 404 });
  return new Response([
    '# Motivationsboost',
    '',
    '> Kostenloser Bewerbungsarbeitsbereich von TH Analytica für Stellensuchende. Lokale Ablage, OCR für unterstützte Dateien und ein bearbeitbarer Briefentwurf aus eigenen Angaben.',
    '',
    'FREE kostet CHF 0.00 und verwendet keine externe KI. Stand ' + productReleasedOn + '.',
    '',
    `- [Über Motivationsboost](${productAbout})`,
    ...Object.entries(productLanguageAlternates).filter(([language]) => language !== 'x-default').map(([language, url]) => `- [${language.toUpperCase()}](${url})`),
    `- [Datenschutzhinweise](${productOrigin}/datenschutz)`,
    `- [Impressum](${productOrigin}/impressum)`,
    `- [Maschinenlesbare Produktinformationen](${productOrigin}/ai-discovery.json)`,
    `- [Grenzen externer Agenten](${productOrigin}/.well-known/ai-governance.json)`,
    '',
  ].join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
