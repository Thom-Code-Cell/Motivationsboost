export const PLANS = {
  weekly: { id: 'weekly', amount: 890, currency: 'CHF', label: 'Wochenpass', limit: 40, period: '7 Tage' },
  monthly: { id: 'monthly', amount: 1790, currency: 'CHF', label: 'Monatsabo', limit: 100, period: 'Monat' },
  yearly: { id: 'yearly', amount: 11900, currency: 'CHF', label: 'Jahresabo', limit: 75, period: 'Monat' },
} as const;
export type PlanId = keyof typeof PLANS;
