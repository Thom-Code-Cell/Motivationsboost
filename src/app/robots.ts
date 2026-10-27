import type { MetadataRoute } from 'next';

function publicBase(): URL | null {
  if (process.env.PUBLIC_SITE_LAUNCHED !== 'true') return null;
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || '');
    return url.protocol === 'https:' ? url : null;
  } catch { return null; }
}

export default function robots(): MetadataRoute.Robots {
  const base = publicBase();
  if (!base) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/_next/', '/dashboard/'] },
    sitemap: base.origin + '/sitemap.xml',
    host: base.origin,
  };
}
