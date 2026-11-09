import { NextResponse } from 'next/server';
export async function GET() {
  const checks = {
    firebaseClient: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    firebaseServer: Boolean((process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) || process.env.GOOGLE_APPLICATION_CREDENTIALS),
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
  };
  const ready = Object.values(checks).every(Boolean);
  return NextResponse.json({ status: ready ? 'configured' : 'degraded', checks, liveServicesVerified: false }, { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
