import type { MetadataRoute } from 'next';
import { productOrigin, publicProductApproved } from '@/lib/public-product';

export default function robots(): MetadataRoute.Robots {
  if (!publicProductApproved()) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/app', '/api', '/beta', '/reset-password', '/success', '/cancel'] },
      { userAgent: ['GPTBot', 'ClaudeBot'], disallow: '/' },
    ],
    sitemap: productOrigin + '/sitemap.xml',
  };
}
