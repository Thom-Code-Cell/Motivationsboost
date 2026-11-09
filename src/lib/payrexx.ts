import 'server-only';
import { verifyPayrexxSignature } from './payrexx-signature';
import { PLANS, type PlanId } from './plans';

export function payrexxConfiguration() {
  const instance = process.env.PAYREXX_INSTANCE || '';
  const key = process.env.PAYREXX_API_KEY || '';
  const signingKey = process.env.PAYREXX_WEBHOOK_SIGNING_KEY || '';
  const origin = process.env.NEXT_PUBLIC_SITE_URL || '';
  let verifiedOrigin: string | null = null;
  try {
    const url = new URL(origin);
    if (url.protocol === 'https:' && url.pathname === '/' && !url.username && !url.password) verifiedOrigin = url.origin;
  } catch { /* absent final canonical domain */ }
  return {
    // Mandatory second switch: do not accept real money until webhook-to-entitlement reconciliation and refund/cancel flows are live-tested.
    enabled: process.env.PAYREXX_PAYMENTS_ENABLED === 'true' && process.env.PAYREXX_BILLING_VALIDATED === 'true',
    instance: /^[a-z0-9][a-z0-9-]{1,62}$/i.test(instance) ? instance : '',
    key,
    signingKey,
    origin: verifiedOrigin,
  };
}
export function getPlan(id: PlanId) {
  const plan = PLANS[id];
  return { ...plan, interval: id === 'weekly' ? null : id === 'monthly' ? 'P1M' : 'P1Y' };
}
export const verifyPayrexxWebhook = verifyPayrexxSignature;
