export const productOrigin = 'https://motivationsboost.th-analytica.com';
export const productSupportEmail = 'motivationsboost@th-analytica.com';
export const productAbout = productOrigin + '/about';
export const productSummary = 'Motivationsboost von TH Analytica unterstützt dich beim Entwerfen eines Motivationsschreibens und beim Organisieren deiner Bewerbungen.';

export function isCanonicalProductOrigin(value: string | undefined) {
  return value === productOrigin || value === productOrigin + '/';
}

export function publicProductApproved() {
  return process.env.PUBLIC_SITE_LAUNCHED === 'true' &&
    process.env.NEXT_PUBLIC_SITE_URL === productOrigin &&
    process.env.VERCEL_ENV !== 'preview';
}
