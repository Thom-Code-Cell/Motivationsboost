
import Stripe from 'stripe';

// Gracefully handle missing Stripe secret key.
// The app will not crash at build time, but Stripe-related features
// will be disabled at runtime if the key is not provided.
export const stripe = (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_'))
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20',
      typescript: true,
    })
  : null;
