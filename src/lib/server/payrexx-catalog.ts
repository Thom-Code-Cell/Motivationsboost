import 'server-only';
import type { PlanId } from '../plans';

// The Pages ID is the merchant catalogue record. Gateway orders carry the
// matching SKU and the application's account-owned reference, not a Pages ID.
export const payrexxCatalog = {
  weekly: { productId: 'de0e15e1', sku: 'motivationsboost-weekly' },
  monthly: { productId: 'bb110380', sku: 'motivationsboost-monthly' },
  yearly: { productId: '8a2bdd51', sku: 'motivationsboost-yearly' },
  poweruser: { productId: '3dffa836', sku: 'motivationsboost-poweruser' },
  credits_small: { productId: '74935fd9', sku: 'motivationsboost-credits-small' },
  credits_large: { productId: '5be3fa25', sku: 'motivationsboost-credits-large' },
} as const satisfies Record<PlanId, { productId: string; sku: string }>;
