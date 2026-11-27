import 'server-only';
import { z } from 'zod/v3';
import { chfMicrosPerCredit, PLANS, type PlanId } from '../plans';

export const payrexxCardMethods = ['visa', 'mastercard'] as const;
const unsignedInteger = z.string().regex(/^\d{1,6}$/).transform(Number);

export function meetsPayrexxMinimumMargin(plan: PlanId) {
  const rate = unsignedInteger.safeParse(process.env.PAYREXX_SUBSCRIPTION_MAX_FEE_BPS);
  const fixed = unsignedInteger.safeParse(process.env.PAYREXX_SUBSCRIPTION_MAX_FEE_CENTS);
  if (!rate.success || !fixed.success) return false;
  const { amount, limit, interval } = PLANS[plan];
  const credits = limit * (interval === 'P1Y' ? 12 : 1);
  const fees = Math.ceil(amount * rate.data / 10_000) + fixed.data;
  const maxCostMicros = fees * 10_000 + credits * chfMicrosPerCredit;
  return maxCostMicros * 5 <= amount * 10_000;
}
