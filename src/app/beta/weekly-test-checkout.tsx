'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { approvedWeeklyTermsPath } from '@/lib/approved-weekly-terms';
import { useProductLanguage } from '@/components/product-language';
import { creditPackPlans, PLANS, type OneTimePlan } from '@/lib/plans';
import { productSupportEmail } from '@/lib/public-product';
import { weeklyCheckoutCopy } from '@/lib/product-weekly-copy';

type OrderStatus = 'pending' | 'gateway-created' | 'gateway-error' | 'paid' | 'cancelled' | 'refunded' | 'chargeback';
type CheckoutState = {
  enabled: true;
  sandbox?: boolean;
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
  chargeback: 'Payrexx hat eine Rückbelastung gemeldet.',
};
const liveStatusKeys = { pending: 'pending', 'gateway-created': 'open', 'gateway-error': 'failed', paid: 'paid',
  cancelled: 'cancelled', refunded: 'refunded', chargeback: 'chargeback' } as const;

const checkoutPath = '/api/payrexx/checkout';
const packLabels = {
  de: ['Zusatzpaket klein', 'Zusatzpaket gross', 'Credits · einmalig', 'Bedingungen für Zusatzcredits'],
  en: ['Small credit pack', 'Large credit pack', 'credits · one-time payment', 'credit pack terms'],
  fr: ['Petit pack de crédits', 'Grand pack de crédits', 'crédits · paiement unique', 'conditions des packs de crédits'],
  it: ['Pacchetto crediti piccolo', 'Pacchetto crediti grande', 'crediti · pagamento unico', 'condizioni dei pacchetti crediti'],
} as const;

export function WeeklyTestCheckout() {
  return <><OneTimeCheckout plan="weekly" />{creditPackPlans.map(plan => <OneTimeCheckout key={plan} plan={plan} />)}</>;
}

function OneTimeCheckout({ plan }: { plan: OneTimePlan }) {
  const weekly = plan === 'weekly';
  const query = weekly ? '' : '?plan=' + plan;
  const locale = useProductLanguage();
  const copy = weeklyCheckoutCopy[locale];
  const labels = packLabels[locale];
  const [checkout, setCheckout] = useState<CheckoutState>();
  const [acceptedVersion, setAcceptedVersion] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const reconciling = useRef(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(checkoutPath + query, { signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Zahlungsstatus derzeit nicht verfügbar.');
      const result = await response.json() as CheckoutState | { enabled: false };
      setCheckout(result.enabled ? result : undefined);
      setMessage('');
    } catch {
      if (!signal?.aborted) setMessage('Zahlungsstatus derzeit nicht verfügbar.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [query]);

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
      const response = await fetch(checkoutPath + '/reconcile' + query, { method: 'POST', signal });
      if (!response.ok) throw new Error('Test payment unavailable');
      await refresh(signal);
    } catch {
      if (!signal) setMessage('Payrexx konnte den Teststatus gerade nicht bestätigen.');
    } finally {
      reconciling.current = false;
      if (!signal) setLoading(false);
    }
  }, [refresh, query]);

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
  const sandbox = checkout.sandbox !== false;
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
        body: JSON.stringify({ plan, termsVersion, acceptTerms: true, ...(!sandbox && { locale }) }),
      });
      const data = await response.json() as { error?: string; url?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Testcheckout derzeit nicht verfügbar.');
      window.location.assign(data.url);
    } catch (error) {
      setMessage(sandbox ? (error instanceof Error ? error.message : 'Testcheckout derzeit nicht verfügbar.') : copy.unavailable);
    } finally {
      setLoading(false);
    }
  }

  const price = `CHF ${(PLANS[plan].amount / 100).toFixed(2)}`;
  const titleId = sandbox ? 'testzahlung-titel' : `${plan}-titel`;
  return <section id={sandbox ? 'testzahlung' : weekly ? 'wochenpass' : plan} aria-labelledby={titleId} className="space-y-3 rounded-xl border p-5">
    <h2 id={titleId} className="text-xl font-semibold">{sandbox ? 'Wochenpass im Payrexx-Test' : weekly ? copy.title : labels[plan === 'credits_small' ? 0 : 1]}</h2>
    {sandbox ? <p>Simulierter Preis: {price} für sieben Tage. Der Wochenpass verlängert sich nicht automatisch. Verwende ausschliesslich Payrexx-Testdaten.</p> :
      <p><strong>{price}</strong> · {weekly ? copy.description : `${PLANS[plan].limit} ${labels[2]}`}</p>}
    {checkout.orderStatus && <p role="status">{sandbox ? statusMessages[checkout.orderStatus] : (weekly || !['gateway-created', 'chargeback'].includes(checkout.orderStatus) ? copy[liveStatusKeys[checkout.orderStatus]] : copy.refresh)}
      {checkout.active && ' ' + (sandbox ? 'Dein Testzugang ist aktiv.' : copy.active)}</p>}
    {needsReview && (sandbox ?
      <p>Falls der Status offen bleibt, kontaktiere den <a className="underline" href={'mailto:' + productSupportEmail}>Support</a>.</p> :
      <p><a className="underline" href={'mailto:' + productSupportEmail}>{copy.support}</a></p>)}
    {showPayment && <form onSubmit={start} className="space-y-3">
      <label className="flex items-start gap-2"><input type="checkbox" checked={acceptedVersion === termsVersion} onChange={event => setAcceptedVersion(event.target.checked ? termsVersion : undefined)} />
        {sandbox ? <span>Ich habe die <a className="underline" href="/agb">Bedingungen der Testumgebung</a> gelesen und bestätige die Testbestellung.</span> :
          <span>{copy.termsBefore} <a className="underline" href={weekly ? approvedWeeklyTermsPath : '/agb#zusatzcredits'}>{weekly ? copy.terms : labels[3]}</a>{weekly && ' ' + copy.termsAfter}</span>}
      </label>
      <button className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50" disabled={loading || acceptedVersion !== termsVersion}>
        {sandbox ? (checkout.canResume ? 'Payrexx-Testzahlung fortsetzen' : 'Payrexx-Testcheckout öffnen') :
          (checkout.canResume ? copy.resume : copy.start)}
      </button>
    </form>}
    <button type="button" className="underline" disabled={loading} onClick={() => void (checkout.canReconcile ? reconcile() : refresh())}>{sandbox ? 'Zahlungsstatus aktualisieren' : copy.refresh}</button>
    {message && <p role="alert">{message}</p>}
  </section>;
}
