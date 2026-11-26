import type { MetadataRoute } from 'next';
import { productOrigin, publicProductApproved } from '@/lib/public-product';

export default function robots(): MetadataRoute.Robots {
  if (!publicProductApproved()) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: [
      { userAgent: '*', allow: ['/$', '/en$', '/fr$', '/it$', '/about$', '/landing/', '/_next/static/', '/_next/image', '/llms.txt', '/ai.txt', '/.well-known/ai-governance.json', '/ai-discovery.json', '/sitemap.xml', '/b9b03ac613084746a94376db488811a5.txt$'], disallow: '/' },
      { userAgent: ['GPTBot', 'ClaudeBot'], disallow: '/' },
    ],
    sitemap: productOrigin + '/sitemap.xml',
    host: productOrigin,
  };
}
