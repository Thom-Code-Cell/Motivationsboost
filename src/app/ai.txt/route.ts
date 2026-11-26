import { productAbout, productOrigin, productReleasedOn, publicProductApproved } from '@/lib/public-product';

export function GET() {
  if (!publicProductApproved()) return new Response(null, { status: 404 });
  return new Response([
    'Motivationsboost · TH Analytica',
    'Stand: ' + productReleasedOn,
    'Öffentliche Seiten können für Suche und Quellenverweise gelesen werden.',
    'Primärquelle: ' + productAbout,
    'Produktinformationen: ' + productOrigin + '/ai-discovery.json',
    'Governance: ' + productOrigin + '/.well-known/ai-governance.json',
    'Datenschutz: ' + productOrigin + '/datenschutz',
    '',
  ].join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
