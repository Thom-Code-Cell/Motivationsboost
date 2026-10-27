/**
 * Payrexx documented JSON webhooks carry the order reference inside the
 * transaction or its invoice, while subscription webhooks contain invoice.
 * An unknown shape must NOT be interpreted as a paid entitlement.
 */
export function payrexxReferenceId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const source = payload as Record<string, unknown>;
  const nested = (value: unknown, key: string) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)[key]
      : undefined;
  const transaction = source.transaction;
  const subscription = source.subscription;
  const data = source.data;
  const candidates = [
    source.referenceId,
    nested(transaction, 'referenceId'),
    nested(nested(transaction, 'invoice'), 'referenceId'),
    nested(subscription, 'referenceId'),
    nested(nested(subscription, 'invoice'), 'referenceId'),
    nested(source.invoice, 'referenceId'),
    nested(data, 'referenceId'),
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
      return value;
  }
  return null;
}
