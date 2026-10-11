export function isSameOrigin(origin: string | null, requestUrl: string): boolean {
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(requestUrl).origin; } catch { return false; }
}
export function safeWebUrl(value: string): string {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Ungültiger Web-Link.');
  return url.href;
}
// Next.js can reconstruct request.url with an internal localhost host. Compare
// Origin against the actual Host header instead; never trust X-Forwarded-Host.
export function isRequestOriginAllowed(origin: string | null, host: string | null, production: boolean): boolean {
  if (!origin || !host) return false;
  try {
    const url = new URL(origin);
    return !url.username && !url.password && url.host === host && (url.protocol === 'https:' || (!production && url.protocol === 'http:'));
  } catch { return false; }
}
