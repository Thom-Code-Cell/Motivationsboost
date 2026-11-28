const fingerprintPattern = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export const dynamic = 'force-dynamic';

export function GET() {
  const fingerprint = process.env.ANDROID_PLAY_SIGNING_SHA256?.trim().toUpperCase();
  if (!fingerprint || !fingerprintPattern.test(fingerprint)) {
    return Response.json([], { headers: { 'Cache-Control': 'no-store' } });
  }

  return Response.json([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.thanalytica.motivationsboost',
      sha256_cert_fingerprints: [fingerprint],
    },
  }], { headers: { 'Cache-Control': 'public, max-age=300' } });
}
