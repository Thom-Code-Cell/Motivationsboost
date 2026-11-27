'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useProductLanguage } from '@/components/product-language';
import { legalCopy } from '@/lib/legal-translations';
import { PLANS, type PlanId } from '@/lib/plans';
import { productLanguagePaths, productSupportEmail } from '@/lib/public-product';
import { productLocales, type ProductLocale } from '@/lib/product-locale';
import { weeklyCheckoutCopy } from '@/lib/product-weekly-copy';
import { releasedLandingCopy } from '@/lib/released-landing-copy';
import { LandingNavigation } from './landing-navigation';

const languageNames = { de: 'Deutsch', en: 'English', fr: 'Français', it: 'Italiano' };
const planCopy = {
  de: { monthly: 'Monatsabo', yearly: 'Jahresabo', credits_small: 'Zusatzpaket klein', credits_large: 'Zusatzpaket gross',
    month: 'pro Monat', year: 'pro Jahr', once: 'einmalig', credits: 'KI-Credits', renew: 'Verlängert sich automatisch.',
    start: 'Im Konto auswählen', manage: 'Abo verwalten und kündigen' },
  en: { monthly: 'Monthly subscription', yearly: 'Annual subscription', credits_small: 'Small credit pack', credits_large: 'Large credit pack',
    month: 'per month', year: 'per year', once: 'one-time', credits: 'AI credits', renew: 'Renews automatically.',
    start: 'Select in your account', manage: 'Manage or cancel a subscription' },
  fr: { monthly: 'Abonnement mensuel', yearly: 'Abonnement annuel', credits_small: 'Petit pack de crédits', credits_large: 'Grand pack de crédits',
    month: 'par mois', year: 'par an', once: 'paiement unique', credits: 'crédits IA', renew: 'Renouvellement automatique.',
    start: 'Choisir dans votre compte', manage: 'Gérer ou résilier un abonnement' },
  it: { monthly: 'Abbonamento mensile', yearly: 'Abbonamento annuale', credits_small: 'Pacchetto crediti piccolo', credits_large: 'Pacchetto crediti grande',
    month: 'al mese', year: 'all’anno', once: 'pagamento unico', credits: 'crediti IA', renew: 'Rinnovo automatico.',
    start: 'Scegli nel tuo account', manage: 'Gestisci o disdici un abbonamento' },
} as const;

export function ReleasedProductHome({ offers, fixedLocale }: { offers: PlanId[]; fixedLocale?: ProductLocale }) {
  const preferredLocale = useProductLanguage();
  const locale = fixedLocale ?? preferredLocale;
  const copy = releasedLandingCopy[locale];
  const legal = legalCopy[locale];
  const weekly = weeklyCheckoutCopy[locale];
  const plans = planCopy[locale];
  const features = [
    ['▥', copy.organise, copy.organiseText],
    ['▤', copy.extract, copy.extractText],
    ['✎', copy.draft, copy.draftText],
  ];
  return <div id="start" lang={locale} className="motivationsboost-landing">
    <a className="skip" href="#inhalt">{copy.skip}</a>
    <LandingNavigation showGuides={false} fixedLocale={fixedLocale} />
    <main id="inhalt">
      <section className="hero" aria-labelledby="hero-title">
        <div className="wrap hero-inner">
          <div className="hero-copy">
            <h1 id="hero-title">{copy.title1}<br />{copy.title2}<br /><em>{copy.title3}</em></h1>
            <p className="lead">{copy.lead}</p>
            <div className="actions"><Link className="button" href="/app">{copy.free}</Link></div>
          </div>
          <figure className="media hero-media" data-slot="hero">
            <div className="media-art"><Image src="/landing/motivationsboost-01-hero-homeoffice.webp" width={1448} height={1086} alt={copy.heroAlt} sizes="(max-width: 610px) 100vw, 50vw" priority /></div>
          </figure>
        </div>
      </section>
      <section className="section wrap" id="funktionen">
        <div className="section-heading"><h2>{copy.features}</h2></div>
        <div className="features">{features.map(([icon, title, body]) => <article key={title}>
          <span aria-hidden="true">{icon}</span><h3>{title}</h3><p>{body}</p>
        </article>)}</div>
      </section>
      <section className="section dark" id="datenschutz">
        <div className="wrap split privacy">
          <figure className="media landscape" data-slot="privacy">
            <div className="media-art"><Image src="/landing/motivationsboost-04-karriereplanung-zuhause.webp" width={1448} height={1086} alt={copy.privacyAlt} sizes="(max-width: 610px) 100vw, 50vw" /></div>
          </figure>
          <div><h2>{copy.privacyTitle}</h2><p>{copy.privacyBody}</p><Link href="/datenschutz">{legal.datenschutz}</Link></div>
        </div>
      </section>
      <section className="section wrap" id="preise">
        <div className="section-heading"><h2>{copy.pricing}</h2></div>
        <div className="pricing">
          <article><h3>FREE</h3><p className="price"><span>CHF</span> 0.00</p><p>{copy.freeDescription}</p><Link className="button outline" href="/app">{copy.free}</Link></article>
          {offers.map(id => {
            const plan = PLANS[id];
            const label = id === 'weekly' ? weekly.title : id === 'poweruser' ? plan.label : plans[id];
            const period = plan.interval === 'P1Y' ? plans.year : plan.interval ? plans.month : plans.once;
            return <article key={id} className={id === 'weekly' ? 'plan-highlight' : undefined}>
              <h3>{label}</h3><p className="price"><span>CHF</span> {(plan.amount / 100).toFixed(2)}</p>
              <p>{id === 'weekly' ? weekly.description :
                <>{period} · {plan.limit} {plans.credits}{plan.interval && <> {plans.month}. {plans.renew}</>}</>}</p>
              <Link className={id === 'weekly' ? 'button gold' : 'button outline'} href={'/app#' + (id === 'weekly' ? 'wochenpass' : id)}>
                {id === 'weekly' ? copy.purchase : plans.start}
              </Link>
            </article>;
          })}
        </div>
      </section>
    </main>
    <footer className="site-footer"><div className="wrap footer-grid">
      <div><a className="brand" href="#start"><span className="brand-icon" aria-hidden="true" />Motivations<span>boost</span></a>
        <p>{copy.support} <a href={'mailto:' + productSupportEmail}>{productSupportEmail}</a></p>
        <a href="https://th-analytica.com">TH Analytica</a>
      </div>
      <div><h2>{copy.legal}</h2><ul>
        <li><Link href="/impressum">{legal.impressum}</Link></li>
        <li><Link href="/datenschutz">{legal.datenschutz}</Link></li>
        <li><Link href="/agb">{legal.agb}</Link></li>
        <li><Link href="/app#abonnement">{plans.manage}</Link></li>
      </ul></div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {productLocales.map(language => <li key={language}>
          <Link href={productLanguagePaths[language]} hrefLang={language} lang={language}>{languageNames[language]}</Link>
        </li>)}
      </ul>
    </div></footer>
  </div>;
}
