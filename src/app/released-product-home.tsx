'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useProductLanguage } from '@/components/product-language';
import { legalCopy } from '@/lib/legal-translations';
import { PLANS } from '@/lib/plans';
import { productSupportEmail } from '@/lib/public-product';
import { weeklyCheckoutCopy } from '@/lib/product-weekly-copy';
import { releasedLandingCopy } from '@/lib/released-landing-copy';
import { LandingNavigation } from './landing-navigation';

export function ReleasedProductHome({ weeklyAvailable }: { weeklyAvailable: boolean }) {
  const locale = useProductLanguage();
  const copy = releasedLandingCopy[locale];
  const legal = legalCopy[locale];
  const weekly = weeklyCheckoutCopy[locale];
  const features = [
    ['▥', copy.organise, copy.organiseText],
    ['▤', copy.extract, copy.extractText],
    ['✎', copy.draft, copy.draftText],
  ];
  return <div id="start" lang={locale} className="motivationsboost-landing">
    <a className="skip" href="#inhalt">{copy.skip}</a>
    <LandingNavigation showGuides={false} />
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
          {weeklyAvailable && <article className="plan-highlight">
            <h3>{weekly.title}</h3><p className="price"><span>CHF</span> {(PLANS.weekly.amount / 100).toFixed(2)}</p>
            <p>{weekly.description}</p><Link className="button gold" href="/app#wochenpass">{copy.purchase}</Link>
          </article>}
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
      </ul></div>
    </div></footer>
  </div>;
}
