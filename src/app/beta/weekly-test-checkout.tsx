'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { PLANS } from '@/lib/plans';
import { productSupportEmail } from '@/lib/public-product';

type OrderStatus = 'pending' | 'gateway-created' | 'gateway-error' | 'paid' | 'cancelled' | 'refunded';
type CheckoutState = {
  enabled: true;
  termsVersion: string;
  orderStatus?: OrderStatus;
  active: boolean;
  canResume: boolean;
  canReconcile: boolean;
};

const statusMessages: Record<OrderStatus, string> = {
  pending: 'Deine Testbestellung wird noch geprüft. Starte keine zweite Zahlung.',
  'gateway-created': 'Deine Testzahlung ist offen. Der Zugang wird erst nach der Bestätigung durch Payrexx freigeschaltet.',
  'gateway-error': 'Payrexx konnte den Testcheckout nicht öffnen. Du kannst es erneut versuchen.',
  paid: 'Payrexx hat die Testzahlung bestätigt.',
  cancelled: 'Die Testbestellung wurde abgebrochen oder ist abgelaufen.',
  refunded: 'Payrexx hat die vollständige Rückerstattung bestätigt.',
};

const checkoutPath = '/api/payrexx/checkout';

export function WeeklyTestCheckout() {
  const [checkout, setCheckout] = useState<CheckoutState>();
  const [acceptedVersion, setAcceptedVersion] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const reconciling = useRef(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(checkoutPath, { signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Zahlungsstatus derzeit nicht verfügbar.');
      const result = await response.json() as CheckoutState | { enabled: false };
      setCheckout(result.enabled ? result : undefined);
      setMessage('');
    } catch {
      if (!signal?.aborted) setMessage('Zahlungsstatus derzeit nicht verfügbar.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const request = new AbortController();
    void refresh(request.signal);
    return () => request.abort();
  }, [refresh]);

  const reconcile = useCallback(async (signal?: AbortSignal) => {
    if (reconciling.current || signal?.aborted) return;
    reconciling.current = true;
    if (!signal) setLoading(true);
    try {
      const response = await fetch(checkoutPath + '/reconcile', { method: 'POST', signal });
      if (!response.ok) throw new Error('Test payment unavailable');
      await refresh(signal);
    } catch {
      if (!signal) setMessage('Payrexx konnte den Teststatus gerade nicht bestätigen.');
    } finally {
      reconciling.current = false;
      if (!signal) setLoading(false);
    }
  }, [refresh]);

  const openForReconciliation = checkout?.canReconcile && checkout.orderStatus === 'gateway-created';
  useEffect(() => {
    if (!openForReconciliation) return;
    const request = new AbortController();
    const check = () => {
      if (document.visibilityState === 'visible') void reconcile(request.signal);
    };
    check();
    const timer = window.setInterval(check, 20_000);
    return () => { request.abort(); window.clearInterval(timer); };
  }, [openForReconciliation, reconcile]);
  if (!checkout) return null;
  const termsVersion = checkout.termsVersion;
  const needsReview = checkout.orderStatus === 'pending' ||
    (checkout.orderStatus === 'gateway-created' && !checkout.canResume);
  const showPayment = !checkout.active && !needsReview;

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || acceptedVersion !== termsVersion) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(checkoutPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'weekly', termsVersion, acceptTerms: true }),
      });
      const data = await response.json() as { error?: string; url?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Testcheckout derzeit nicht verfügbar.');
      window.location.assign(data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Testcheckout derzeit nicht verfügbar.');
    } finally {
      setLoading(false);
    }
  }

  return <section id="testzahlung" aria-labelledby="testzahlung-titel" className="space-y-3 rounded-xl border p-5">
    <h2 id="testzahlung-titel" className="text-xl font-semibold">Wochenpass im Payrexx-Test</h2>
    <p>Simulierter Preis: CHF {(PLANS.weekly.amount / 100).toFixed(2)} für sieben Tage. Der Wochenpass verlängert sich nicht automatisch. Verwende ausschliesslich Payrexx-Testdaten.</p>
    {checkout.orderStatus && <p role="status">{statusMessages[checkout.orderStatus]} {checkout.active && 'Dein Testzugang ist aktiv.'}</p>}
    {needsReview && <p>Falls der Status offen bleibt, kontaktiere den <a className="underline" href={'mailto:' + productSupportEmail}>Support</a>.</p>}
    {showPayment && <form onSubmit={start} className="space-y-3">
      <label className="flex items-start gap-2"><input type="checkbox" checked={acceptedVersion === termsVersion} onChange={event => setAcceptedVersion(event.target.checked ? termsVersion : undefined)} />
        <span>Ich habe die <a className="underline" href="/agb">Bedingungen der Testumgebung</a> gelesen und bestätige die Testbestellung.</span>
      </label>
      <button className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50" disabled={loading || acceptedVersion !== termsVersion}>
        {checkout.canResume ? 'Payrexx-Testzahlung fortsetzen' : 'Payrexx-Testcheckout öffnen'}
      </button>
    </form>}
    <button type="button" className="underline" disabled={loading} onClick={() => void (checkout.canReconcile ? reconcile() : refresh())}>Zahlungsstatus aktualisieren</button>
    {message && <p role="alert">{message}</p>}
  </section>;
}
