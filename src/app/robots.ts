import type { MetadataRoute } from 'next';
import { productOrigin, publicProductApproved } from '@/lib/public-product';

export default function robots(): MetadataRoute.Robots {
  if (!publicProductApproved()) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: ['/$', '/about', '/landing/', '/_next/static/', '/_next/image', '/llms.txt', '/sitemap.xml'], disallow: '/' },
    sitemap: productOrigin + '/sitemap.xml',
    host: productOrigin,
  };
}
