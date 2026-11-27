export const PLANS = {
  weekly: { id: 'weekly', amount: 890, currency: 'CHF', label: 'Wochenpass', limit: 20, period: '7 Tage', interval: null },
  monthly: { id: 'monthly', amount: 1990, currency: 'CHF', label: 'Monatsabo', limit: 60, period: 'Monat', interval: 'P1M' },
  yearly: { id: 'yearly', amount: 11900, currency: 'CHF', label: 'Jahresabo', limit: 60, period: 'Monat', interval: 'P1Y' },
  poweruser: { id: 'poweruser', amount: 3490, currency: 'CHF', label: 'Poweruser PLUS', limit: 160, period: 'Monat', interval: 'P1M' },
  credits_small: { id: 'credits_small', amount: 990, currency: 'CHF', label: 'Zusatzpaket klein', limit: 40, period: 'Einmalig', interval: null },
  credits_large: { id: 'credits_large', amount: 1990, currency: 'CHF', label: 'Zusatzpaket gross', limit: 100, period: 'Einmalig', interval: null },
} as const;
export type PlanId = keyof typeof PLANS;
export const creditPackPlans = ['credits_small', 'credits_large'] as const;
export const oneTimePlans = ['weekly', ...creditPackPlans] as const;
export type OneTimePlan = typeof oneTimePlans[number];
export const recurringPlans = ['monthly', 'yearly', 'poweruser'] as const;
export type RecurringPlan = typeof recurringPlans[number];
export const FREE_PLAN = { amount: 0, limit: 0 } as const;
export const chfMicrosPerCredit = 10_000;
export const letterCredits = 3;
