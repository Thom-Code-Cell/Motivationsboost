import { createHmac, timingSafeEqual } from 'node:crypto';

/** Payrexx: lowercase hex HMAC-SHA256 of the untouched UTF-8 request body. */
export function verifyPayrexxSignature(body: string, signature: string, utf8Key: string): boolean {
  if (!utf8Key || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256', utf8Key).update(body, 'utf8').digest('hex');
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}
