import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyPayrexxSignature } from '../../src/lib/payrexx-signature';

describe('Payrexx signature verification', () => {
  it('uses the raw body and UTF-8 signing key', () => {
    const body = '{"referenceId":"123","status":"confirmed"}';
    const key = 'testing-secret';
    const signature = createHmac('sha256', key).update(body, 'utf8').digest('hex');
    expect(verifyPayrexxSignature(body, signature, key)).toBe(true);
    expect(verifyPayrexxSignature(body + ' ', signature, key)).toBe(false);
    expect(verifyPayrexxSignature(body, signature, 'wrong-key')).toBe(false);
    expect(verifyPayrexxSignature(body, 'invalid', key)).toBe(false);
    expect(verifyPayrexxSignature(body, signature.toUpperCase(), key)).toBe(false);
    expect(verifyPayrexxSignature(body, signature, '')).toBe(false);
  });
});
