import type { MetadataRoute } from 'next';

// Only localized, public and reviewed pages belong in the sitemap.
const localeCodes = ['de', 'en', 'fr', 'it', 'es', 'pt', 'uk', 'ar'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.PUBLIC_SITE_LAUNCHED !== 'true') return [];
  let origin: string;
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SITE_URL || '');
    if (u.protocol !== 'https:') return [];
    origin = u.origin;
  } catch { return []; }

  const languages = Object.fromEntries(localeCodes.map(code => [code, origin + '/' + code]));
  return [
    ...localeCodes.map(code => ({
      url: origin + '/' + code,
      lastModified: new Date('2026-10-27T00:00:00.000Z'),
      changeFrequency: 'monthly' as const,
      priority: code === 'en' ? 1 : 0.9,
      alternates: { languages },
    })),
    { url: origin + '/datenschutz', changeFrequency: 'yearly' as const, priority: 0.2 },
    { url: origin + '/impressum', changeFrequency: 'yearly' as const, priority: 0.2 },
  ];
}
