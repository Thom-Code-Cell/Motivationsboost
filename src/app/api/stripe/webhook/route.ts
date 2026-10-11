
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase';
import { doc, setDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import type { UserData, PricePlanHistory, FeatureFlags } from '@/types/user';

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

const getProFeatureFlags = (enable: boolean): Partial<FeatureFlags> => ({
    exportEnabled: enable,
    atsFeedbackUnlocked: enable,
    optimizerEnabled: enable,
    linkedinBooster: enable,
    stylePersonalization: enable,
});


export async function POST(request: NextRequest) {
  if (process.env.STRIPE_PAYMENTS_ENABLED !== 'true') return NextResponse.json({ error: 'Zahlungen sind während der technischen Vorbereitung deaktiviert.' }, { status: 503 });
  if (!stripe || !db) return NextResponse.json({ error: 'Zahlungsdienst nicht konfiguriert.' }, { status: 503 });
  const body = await request.text();
  const sig = request.headers.get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Webhook secret not configured");
    return new NextResponse('Webhook secret not configured', { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      let subscription: Stripe.Subscription;
      let session: Stripe.Checkout.Session | null = null;


      switch (event.type) {
        case 'checkout.session.completed': {
          session = event.data.object as Stripe.Checkout.Session;
          if (!session.subscription) {
            throw new Error('Webhook Error: checkout.session.completed event without subscription.');
          }
          subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          break;
        }

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          subscription = event.data.object as Stripe.Subscription;
          break;
        }

        default:
          throw new Error('Unhandled relevant event!');
      }

      const userId = subscription.metadata.userId;
      if (!userId) {
        console.warn(`Webhook Warning: Subscription ${subscription.id} is missing a userId in metadata.`);
        return NextResponse.json({ received: true, message: "Handled, but missing userId." });
      }

      const userDocRef = doc(db, 'users', userId);
      const isPro = subscription.status === 'active';
      const priceItem = subscription.items.data[0]?.price;

      if (!priceItem) {
        throw new Error(`Subscription ${subscription.id} has no price item.`);
      }

      let planType: UserData['plan'] = 'free';
      let price: UserData['price'] = 0;

      if (isPro) {
          planType = 'pro_month';
          price = priceItem.unit_amount ? priceItem.unit_amount / 100 : 0;
      }

      const subscriptionData: Partial<UserData> = {
        plan: planType,
        price: price,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceItem.id,
        subscriptionStatus: subscription.status,
        activeUntil: new Date(subscription.current_period_end * 1000).toISOString(),
        subscriptionInterval: isPro ? priceItem.recurring?.interval as 'month' : null,
      };

      const newHistoryEntry: PricePlanHistory = {
          date: new Date().toISOString(),
          priceId: priceItem.id,
          interval: priceItem.recurring?.interval || 'unknown',
      };

      const features = getProFeatureFlags(isPro);

      const updateData: any = {
        ...subscriptionData,
        features: features,
        pricePlanHistory: arrayUnion(newHistoryEntry)
      };

      // Handle referral logic
      const referredByCode = subscription.metadata.referredByCode;
      if (event.type === 'checkout.session.completed' && referredByCode) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("referralCode", "==", referredByCode));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const referrerDoc = querySnapshot.docs[0];
            const referrerId = referrerDoc.id;

            // Add the new user to the referrer's list
            await setDoc(doc(db, 'users', referrerId), {
                referrals: arrayUnion({ newUserId: userId, date: new Date().toISOString() })
            }, { merge: true });

            // Mark the new user as referred
            updateData.referredBy = referredByCode;
        }
      }

      await setDoc(userDocRef, updateData, { merge: true });


    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown webhook handler error';
      return new NextResponse(`Webhook handler failed: ${errorMessage}`, { status: 400 });
    }
  }

  return NextResponse.json({ received: true });
}
