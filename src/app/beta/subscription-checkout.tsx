'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useProductLanguage } from '@/components/product-language';
import { PLANS, type RecurringPlan } from '@/lib/plans';

const copy = {
  de: { title: 'Abonnements', labels: ['Monatsabo', 'Jahresabo', 'Poweruser PLUS'], month: 'pro Monat', year: 'pro Jahr',
    credits: 'Credits pro Monat', consent: 'Ich akzeptiere die Abo-Bedingungen und stimme den wiederkehrenden Zahlungen zu.',
    terms: 'AGB lesen', start: 'Bei Payrexx autorisieren', pending: 'Zahlung wird geprüft.', renew: 'Automatische Verlängerung aktiv.',
    active: 'Bezahlt bis', cancel: 'Weitere Verlängerungen kündigen', cancelled: 'Weitere Verlängerungen sind deaktiviert.',
    refresh: 'Status aktualisieren', error: 'Die Abo-Anfrage konnte nicht abgeschlossen werden.' },
  en: { title: 'Subscriptions', labels: ['Monthly subscription', 'Annual subscription', 'Poweruser PLUS'], month: 'per month', year: 'per year',
    credits: 'credits per month', consent: 'I accept the subscription terms and agree to the recurring payments.',
    terms: 'Read the terms', start: 'Authorize with Payrexx', pending: 'Payment is being reconciled.', renew: 'Automatic renewal is on.',
    active: 'Paid through', cancel: 'Cancel future renewals', cancelled: 'Future renewals are off.',
    refresh: 'Refresh status', error: 'The subscription request could not be completed.' },
  fr: { title: 'Abonnements', labels: ['Abonnement mensuel', 'Abonnement annuel', 'Poweruser PLUS'], month: 'par mois', year: 'par an',
    credits: 'crédits par mois', consent: 'J’accepte les conditions de l’abonnement et les paiements récurrents.',
    terms: 'Lire les conditions', start: 'Autoriser avec Payrexx', pending: 'Vérification du paiement en cours.', renew: 'Renouvellement automatique actif.',
    active: 'Payé jusqu’au', cancel: 'Annuler les prochains renouvellements', cancelled: 'Les prochains renouvellements sont désactivés.',
    refresh: 'Actualiser le statut', error: 'La demande d’abonnement n’a pas pu être traitée.' },
  it: { title: 'Abbonamenti', labels: ['Abbonamento mensile', 'Abbonamento annuale', 'Poweruser PLUS'], month: 'al mese', year: 'all’anno',
    credits: 'crediti al mese', consent: 'Accetto le condizioni di abbonamento e acconsento ai pagamenti ricorrenti.',
    terms: 'Leggi le condizioni', start: 'Autorizza con Payrexx', pending: 'Verifica del pagamento in corso.', renew: 'Rinnovo automatico attivo.',
    active: 'Pagato fino al', cancel: 'Annulla i prossimi rinnovi', cancelled: 'I prossimi rinnovi sono disattivati.',
    refresh: 'Aggiorna lo stato', error: 'Impossibile completare la richiesta di abbonamento.' },
} as const;

const labelIndex = { monthly: 0, yearly: 1, poweruser: 2 } as const;
type Offer = { plan: RecurringPlan; termsVersion: string };
type Current = { plan: RecurringPlan; status: string; renewalEnabled: boolean | null; cancelledAt: string | null;
  paymentPending: boolean; paidUntil: string | null };
const endpoint = '/api/payrexx/subscription';

export function SubscriptionCheckout() {
  const language = useProductLanguage();
  const labels = copy[language];
  const [offers, setOffers] = useState<Offer[]>([]);
  const [current, setCurrent] = useState<Current>();
  const [consent, setConsent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(endpoint, { cache: 'no-store', signal });
      if (!response.ok) throw new Error('Unavailable');
      const data: { offers: Offer[]; current?: Current } = await response.json();
      setOffers(data.offers);
      setCurrent(data.current);
      setError(false);
    } catch {
      if (!signal?.aborted) setError(true);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  if (!offers.length && !current) return null;

  async function submit(event: FormEvent, offer?: Offer) {
    event.preventDefault();
    if (busy || (offer && consent !== offer.plan + '/' + offer.termsVersion)) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offer ? { action: 'start', ...offer, acceptTerms: true, locale: language } : { action: 'cancel' }),
      });
      if (!response.ok) throw new Error('Unavailable');
      const { url } = await response.json() as { url?: string };
      if (offer && url) window.location.assign(url);
      else await refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return <section aria-labelledby="subscriptions-title" className="space-y-3 rounded-xl border p-5">
    <h2 id="subscriptions-title" className="text-xl font-semibold">{labels.title}</h2>
    {current && <div className="space-y-2">
      <p>{labels.labels[labelIndex[current.plan]]}</p>
      {current.paymentPending && <p role="status">{labels.pending}</p>}
      {current.paidUntil && <p>{labels.active} {new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'Europe/Zurich' }).format(new Date(current.paidUntil))}</p>}
      {current.renewalEnabled === true && <p>{labels.renew}</p>}
      {(current.renewalEnabled === false || current.cancelledAt) && <p>{labels.cancelled}</p>}
      {(current.renewalEnabled || ['pending', 'gateway-created'].includes(current.status)) &&
        <form onSubmit={event => void submit(event)}><button disabled={busy} className="underline">{labels.cancel}</button></form>}
      <button type="button" className="underline" disabled={busy} onClick={() => void refresh()}>{labels.refresh}</button>
    </div>}
    {(!current || (!current.renewalEnabled && !current.paymentPending && !current.paidUntil && !['pending', 'gateway-created'].includes(current.status)) ||
      (current.renewalEnabled === null && current.status === 'gateway-created')) && offers.map(offer => {
      const plan = PLANS[offer.plan];
      const key = offer.plan + '/' + offer.termsVersion;
      return <form key={offer.plan} className="space-y-2 border-t pt-3" onSubmit={event => void submit(event, offer)}>
        <h3 className="font-semibold">{labels.labels[labelIndex[offer.plan]]}</h3>
        <p>CHF {(plan.amount / 100).toFixed(2)} {plan.interval === 'P1Y' ? labels.year : labels.month} · {plan.limit} {labels.credits}</p>
        <p><a className="underline" href="/agb">{labels.terms}</a></p>
        <label className="flex items-start gap-2"><input type="checkbox" checked={consent === key}
          onChange={event => setConsent(event.target.checked ? key : '')} />{labels.consent}</label>
        <button disabled={busy || consent !== key} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{labels.start}</button>
      </form>;
    })}
    {error && <p role="alert">{labels.error}</p>}
  </section>;
}
