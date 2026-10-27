import 'server-only';
import { verifyPayrexxSignature } from './payrexx-signature';

export type PlanId = 'monthly' | 'yearly';
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
  const envName = id === 'monthly' ? 'PAYREXX_MONTHLY_CENTS' : 'PAYREXX_YEARLY_CENTS';
  const raw = process.env[envName] ?? '';
  if (!/^[1-9][0-9]{2,7}$/.test(raw)) return null;
  const amount = Number(raw);
  if (!Number.isSafeInteger(amount) || amount > 5000000) return null;
  return { id, amount, currency: 'CHF', interval: id === 'monthly' ? 'P1M' : 'P1Y' } as const;
}
export const verifyPayrexxWebhook = verifyPayrexxSignature;
