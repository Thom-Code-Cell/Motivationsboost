import { describe, it, expect } from 'vitest';
import { quotaFor } from '@/lib/ai-quota';

describe('server-owned plan quotas', () => {
  const now = new Date('2026-11-09T12:00:00Z');
  const active = { status: 'active', start: '2026-11-01T00:00:00Z', end: '2026-12-01T00:00:00Z' };
  it('limits a free account to three actions', () => expect(quotaFor(undefined, now).limit).toBe(3));
  it.each([['weekly', 40], ['monthly', 100], ['yearly', 75]])('limits %s to %i actions', (plan, limit) => expect(quotaFor({ ...active, plan }, now).limit).toBe(limit));
  it('fails closed for expired or invalid entitlements', () => {
    expect(quotaFor({ ...active, plan: 'monthly', end: '2026-11-02T00:00:00Z' }, now).limit).toBe(3);
    expect(quotaFor({ ...active, plan: 'monthly', status: 'pending' }, now).limit).toBe(3);
  });
  it('refreshes annual plan quota at calendar-month boundaries', () => {
    const yearly = { ...active, plan: 'yearly', end: '2027-12-01T00:00:00Z' };
    expect(quotaFor(yearly, now).period).not.toBe(quotaFor(yearly, new Date('2026-12-01T00:00:00Z')).period);
  });
});
