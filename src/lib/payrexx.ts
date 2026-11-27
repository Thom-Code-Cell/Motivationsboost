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
    // The merchant approves the launch independently of provider events.
    // Each paid order still requires a matching live payment before fulfilment.
    enabled: process.env.PAYREXX_PAYMENTS_ENABLED === 'true',
    // Webhook receipt is configured independently; it never enables checkout or grants entitlements.
    webhookEnabled: process.env.PAYREXX_WEBHOOK_ENABLED === 'true',
    instance: /^[a-z0-9][a-z0-9-]{1,62}$/i.test(instance) ? instance : '',
    key,
    signingKey,
    origin: verifiedOrigin,
  };
}
export function getPlan(id: PlanId) {
  return PLANS[id];
}
export const verifyPayrexxWebhook = verifyPayrexxSignature;
