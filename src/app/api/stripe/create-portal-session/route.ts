
import { NextResponse, NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const portalSchema = z.object({
  userId: z.string(),
});

export async function POST(request: NextRequest) {
  if (process.env.STRIPE_PAYMENTS_ENABLED !== 'true') return NextResponse.json({ error: 'Zahlungen sind während der technischen Vorbereitung deaktiviert.' }, { status: 503 });
  if (!stripe || !db) return NextResponse.json({ error: 'Zahlungsdienst nicht konfiguriert.' }, { status: 503 });
  try {
    const body = await request.json();
    const { userId } = portalSchema.parse(body);

    if (!userId) {
      return new NextResponse('User ID is required', { status: 400 });
    }

    if (!db) {
        return new NextResponse('Firestore not initialized', { status: 500 });
    }

    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        return new NextResponse('User not found', { status: 404 });
    }

    const stripeCustomerId = userDoc.data()?.stripeCustomerId;

    if (!stripeCustomerId) {
        return new NextResponse('Stripe customer ID not found for this user', { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${request.headers.get('origin')}/`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
