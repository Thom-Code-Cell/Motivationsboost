import { productAbout, productOrigin, productSummary, publicProductApproved } from '@/lib/public-product';

export function GET() {
  if (!publicProductApproved()) return new Response(null, { status: 404 });
  return new Response([
    '# Motivationsboost',
    '',
    '> ' + productSummary,
    '',
    'Diese optionale Discovery-Datei verweist auf die sichtbaren Produktinformationen.',
    '',
    `- [Über Motivationsboost](${productAbout})`,
    `- [Datenschutzhinweise](${productOrigin}/datenschutz)`,
    `- [Impressum](${productOrigin}/impressum)`,
    '',
  ].join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
