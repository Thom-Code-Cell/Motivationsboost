'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

export function LandingNavigation() {
  const [expanded, setExpanded] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  return <header className="site-header">
    <div className="wrap header-inner">
      <a className="brand" href="#start" aria-label="Motivationsboost, Start"><span className="brand-icon" aria-hidden="true" />Motivations<span>boost</span></a>
      <button ref={toggle} className="menu-toggle" type="button" aria-expanded={expanded} aria-controls="menue" onClick={() => setExpanded(!expanded)}>Menü <span aria-hidden="true">☰</span></button>
      <div className="header-menu" id="menue" data-collapsed={!expanded} onKeyDown={event => {
        if (event.key === 'Escape' && expanded) {
          setExpanded(false);
          toggle.current?.focus();
        }
      }}>
        <nav aria-label="Hauptnavigation" onClick={event => {
          if (!(event.target instanceof HTMLAnchorElement) || !expanded) return;
          setExpanded(false);
          const section = document.getElementById(event.target.hash.slice(1));
          if (section) {
            section.tabIndex = -1;
            section.focus({ preventScroll: true });
          }
        }}>
          <a href="#funktionen">Funktionen</a>
          <a href="#ablauf">So funktioniert’s</a>
          <a href="#vorteile">Deine Vorteile</a>
          <a href="#datenschutz">Datenschutz</a>
          <a href="#preise">Preise</a>
        </nav>
        <div className="header-actions">
          <Link className="plain" href="/app">Anmelden</Link>
          <Link className="button button-small" href="/app">Kostenlos ausprobieren</Link>
        </div>
      </div>
    </div>
  </header>;
}
