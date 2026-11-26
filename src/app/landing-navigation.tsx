'use client';

import Link from 'next/link';
import { ProductLanguagePicker, useProductLanguage } from '@/components/product-language';
import { useRef, useState } from 'react';
import type { ProductLocale } from '@/lib/product-locale';

const navigationCopy = {
  de: ['Menü', 'Hauptnavigation', 'Funktionen', 'So funktioniert’s', 'Deine Vorteile', 'Datenschutz', 'Preise', 'Anmelden', 'Kostenlos ausprobieren'],
  en: ['Menu', 'Main navigation', 'Features', 'How it works', 'Your advantages', 'Privacy', 'Pricing', 'Sign in', 'Try for free'],
  fr: ['Menu', 'Navigation principale', 'Fonctions', 'Comment ça marche', 'Vos avantages', 'Confidentialité', 'Tarifs', 'Se connecter', 'Essayer gratuitement'],
  it: ['Menu', 'Navigazione principale', 'Funzioni', 'Come funziona', 'I vantaggi', 'Privacy', 'Prezzi', 'Accedi', 'Prova gratis'],
} as const;

export function LandingNavigation({ showGuides = true, fixedLocale }: { showGuides?: boolean; fixedLocale?: ProductLocale }) {
  const preferredLocale = useProductLanguage();
  const locale = fixedLocale ?? preferredLocale;
  const copy = navigationCopy[locale];
  const [expanded, setExpanded] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  return <header className="site-header" lang={locale}>
    <div className="wrap header-inner">
      <a className="brand" href="#start" aria-label="Motivationsboost, Start"><span className="brand-icon" aria-hidden="true" />Motivations<span>boost</span></a>
      <button ref={toggle} className="menu-toggle" type="button" aria-expanded={expanded} aria-controls="menue" onClick={() => setExpanded(!expanded)}>{copy[0]} <span aria-hidden="true">☰</span></button>
      <div className="header-menu" id="menue" data-collapsed={!expanded} onKeyDown={event => {
        if (event.key === 'Escape' && expanded) {
          setExpanded(false);
          toggle.current?.focus();
        }
      }}>
        <nav aria-label={copy[1]} onClick={event => {
          if (!(event.target instanceof HTMLAnchorElement) || !expanded) return;
          setExpanded(false);
          const section = document.getElementById(event.target.hash.slice(1));
          if (section) {
            section.tabIndex = -1;
            section.focus({ preventScroll: true });
          }
        }}>
          <a href="#funktionen">{copy[2]}</a>
          {showGuides && <><a href="#ablauf">{copy[3]}</a>
          <a href="#vorteile">{copy[4]}</a></>}
          <a href="#datenschutz">{copy[5]}</a>
          <a href="#preise">{copy[6]}</a>
        </nav>
        <div className="header-actions">
          {!fixedLocale && <ProductLanguagePicker />}
          <Link className="plain" href="/app">{copy[7]}</Link>
          <Link className="button button-small" href="/app">{copy[8]}</Link>
        </div>
      </div>
    </div>
  </header>;
}
