import 'server-only';
import { creditPackPlans, type PlanId } from '../plans';
import { publicProductApproved } from '../public-product';
import { creditPackTerms, weeklyGatewayValidityMinutes, weeklyLiveCheckoutConfiguration } from './payrexx-checkout-config';
import { availableSubscriptionOffers } from './payrexx-subscription-renewal';

export function publicPayrexxPlans(): PlanId[] {
  if (!publicProductApproved()) return [];
  const weekly = Boolean(weeklyLiveCheckoutConfiguration());
  const packs = weekly ? creditPackPlans.filter(plan => creditPackTerms(plan)) : [];
  const subscriptions = availableSubscriptionOffers(weeklyGatewayValidityMinutes).map(offer => offer.plan);
  return [...(weekly ? ['weekly' as const] : []), ...subscriptions, ...packs];
}
