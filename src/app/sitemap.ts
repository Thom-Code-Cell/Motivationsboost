import type { MetadataRoute } from 'next';
import { productAbout, productOrigin, publicProductApproved } from '@/lib/public-product';

export default function sitemap(): MetadataRoute.Sitemap {
  return publicProductApproved() ? [{ url: productOrigin }, { url: productAbout }] : [];
}
