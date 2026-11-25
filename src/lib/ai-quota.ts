import { FREE_PLAN, PLANS } from './plans';

type Entitlement = { plan?: unknown; start?: unknown; end?: unknown; status?: unknown };

// Entitlements are server-owned. The provider integration must verify payment before writing them.
export function quotaFor(entitlement: Entitlement | undefined, now: Date) {
  const id = entitlement?.plan;
  const start = typeof entitlement?.start === 'string' ? new Date(entitlement.start) : null;
  const end = typeof entitlement?.end === 'string' ? new Date(entitlement.end) : null;
  if (entitlement?.status === 'active' && (id === 'weekly' || id === 'monthly' || id === 'yearly' || id === 'poweruser') && start && end && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && start <= now && now < end) {
    const plan = PLANS[id];
    // Yearly quotas refresh each calendar month, never accumulate; weekly/monthly reset at the verified entitlement period.
    const period = id === 'yearly' ? now.toISOString().slice(0, 7) : `${start.toISOString()}/${end.toISOString()}`;
    return { limit: plan.limit, period: `${id}:${period}` };
  }
  return { limit: FREE_PLAN.limit, period: `free:${now.toISOString().slice(0, 7)}` };
}
