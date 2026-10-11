
import { NextResponse, NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const checkoutSchema = z.object({
  priceId: z.string(),
  userId: z.string(),
  referralCode: z.string().optional(),
});

// Hardcoded for Demo. In a real app, manage this in your Stripe Dashboard.
const PROMOTION_CODE_ID = 'promo_1Phy3dRxW1y7V5hG5hOfYnKE';

export async function POST(request: NextRequest) {
  if (process.env.STRIPE_PAYMENTS_ENABLED !== 'true') return NextResponse.json({ error: 'Zahlungen sind während der technischen Vorbereitung deaktiviert.' }, { status: 503 });
  if (!stripe || !db) return NextResponse.json({ error: 'Zahlungsdienst nicht konfiguriert.' }, { status: 503 });
  try {
    const body = await request.json();
    const { priceId, userId, referralCode } = checkoutSchema.parse(body);

    if (!userId || !priceId) {
      return new NextResponse('User ID and Price ID are required', { status: 400 });
    }

    if (!db) {
        return new NextResponse('Firestore not initialized', { status: 500 });
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const sessionOptions: any = {
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cancel`,
        subscription_data: {
            metadata: {
                userId: userId,
            }
        },
        allow_promotion_codes: true,
    };

    if (referralCode) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("referralCode", "==", referralCode.trim().toUpperCase()));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Found a valid referral code. Apply the promotion.
            sessionOptions.discounts = [{ promotion_code: PROMOTION_CODE_ID }];
            sessionOptions.subscription_data.metadata.referredByCode = referralCode.trim().toUpperCase();
        } else {
             // Invalid referral code. For security, we just ignore it and don't apply a discount.
             // You could also return an error to the user here.
             console.warn(`Invalid referral code used: ${referralCode}`);
             return new NextResponse(JSON.stringify({ error: 'Ungültiger Empfehlungscode.' }), { status: 400 });
        }
    }


    const session = await stripe.checkout.sessions.create(sessionOptions);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ error: 'Ungültige Anfrage.'}), { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
