import { describe, expect, it } from 'vitest';
import { payrexxReferenceId } from '../../src/lib/payrexx-reference';

const reference = 'f2ae49a0-e9f4-4db3-929a-281df32af547';
describe('Payrexx provider event references', () => {
  it('supports the documented transaction, invoice and subscription shapes', () => {
    expect(payrexxReferenceId({ transaction: { referenceId: reference, status: 'confirmed' } })).toBe(reference);
    expect(payrexxReferenceId({ transaction: { invoice: { referenceId: reference } } })).toBe(reference);
    expect(payrexxReferenceId({ subscription: { invoice: { referenceId: reference } } })).toBe(reference);
    expect(payrexxReferenceId({ referenceId: reference })).toBe(reference);
  });
  it('rejects non-UUID references and untrusted ambiguous values', () => {
    expect(payrexxReferenceId({ transaction: { referenceId: 'fake-order' } })).toBe(null);
    expect(payrexxReferenceId({ transaction: { referenceId: 123 } })).toBe(null);
    expect(payrexxReferenceId({})).toBe(null);
    expect(payrexxReferenceId(null)).toBe(null);
  });
});
