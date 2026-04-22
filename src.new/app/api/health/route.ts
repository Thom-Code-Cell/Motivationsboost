
import { NextResponse } from 'next/server';

export async function GET() {
  const env = {
    stripeSecretKey: !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_'),
    stripePublishableKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_'),
    stripeProPriceId: !!process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID && process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID.startsWith('price_'),
    stripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_'),
    googleApiKey: !!process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.length > 20,
    firebaseProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  };

  const allOk = Object.values(env).every(v => v);

  return NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    checks: env
  });
}
