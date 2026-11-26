import type { MetadataRoute } from 'next';
import { productAbout, productLanguageAlternates, productLanguagePaths, productOrigin, publicProductApproved } from '@/lib/public-product';

export default function sitemap(): MetadataRoute.Sitemap {
  return publicProductApproved() ? [
    ...Object.values(productLanguagePaths).map(path => ({ url: productOrigin + path, alternates: { languages: productLanguageAlternates } })),
    { url: productAbout },
  ] : [];
}
