'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ProductLanguagePicker, useProductLanguage } from './product-language';
import { legalCopy, translatedLegal, type LegalDocument } from '@/lib/legal-translations';
import { stagedTermsCopy } from '@/lib/weekly-terms-copy';
import { releasedPrivacyCopy, releasedPrivacySources } from '@/lib/released-privacy-copy';
import { productSupportEmail } from '@/lib/public-product';

const paths = ['impressum', 'datenschutz', 'agb'] as const;
const dateLocales = { de: 'de-CH', en: 'en-GB', fr: 'fr-CH', it: 'it-CH' };
const creditTerms = {
  de: 'Vor einer KI-Aktion zeigt dir die Anwendung, wie viele Credits sie kostet. Du löst sie selbst aus. Bei zu wenig Guthaben bleibt die Aktion gesperrt. Es gibt keinen automatischen Credit-Nachkauf. Deine eigenen lokal gespeicherten Unterlagen bleiben unabhängig vom Guthaben zugänglich.',
  en: 'Before you start an AI action, the app shows how many credits it costs. You choose whether to proceed. If your balance is too low, the action is unavailable. Credits are never purchased automatically. Your own locally stored documents remain accessible regardless of your balance.',
  fr: 'Avant chaque action IA, l’application indique son coût en crédits. Vous choisissez si vous souhaitez la lancer. Si votre solde est insuffisant, l’action est indisponible. Aucun crédit supplémentaire n’est acheté automatiquement. Vos documents enregistrés localement restent accessibles quel que soit votre solde.',
  it: 'Prima di ogni azione IA, l’app mostra quanti crediti costa. Decidi tu se avviarla. Se il saldo è insufficiente, l’azione non è disponibile. Non vengono acquistati crediti automaticamente. I tuoi documenti salvati localmente rimangono accessibili indipendentemente dal saldo.',
} as const;

export function LegalPageBody({ document, children, email, website, releasedProduct = false, releasedTerms = false, weeklyTermsVersion }: {
  document: LegalDocument;
  children: ReactNode;
  email: string;
  website: string;
  releasedProduct?: boolean;
  releasedTerms?: boolean;
  weeklyTermsVersion?: string;
}) {
  const locale = useProductLanguage();
  const copy = legalCopy[locale];
  const release = stagedTermsCopy[locale];
  const publicCopy = releasedPrivacyCopy[locale];
  const date = new Intl.DateTimeFormat(dateLocales[locale], { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(releasedProduct || releasedTerms ? '2026-11-26' : '2026-11-25'));
  let content = locale === 'de' ? children : <>
    {translatedLegal[locale][document].filter(([heading]) => !releasedTerms ||
      (heading && !/^[45]\./.test(heading))).map(([heading, ...paragraphs], index) => <section key={heading || index}>
        {heading && <h2 className="mt-7 break-words text-xl font-semibold leading-tight sm:text-2xl">{heading}</h2>}
        {paragraphs.map(paragraph => <p key={paragraph} className="mt-3 break-words text-base leading-relaxed text-foreground/85">{paragraph}</p>)}
      </section>)}
    <p className="mt-5 break-all text-sm">{copy.contact} <a className="underline" href={'mailto:' + email}>{email}</a></p>
    {document === 'datenschutz' && <p className="mt-4 text-sm"><a className="underline" href="https://developers.openai.com/api/docs/guides/your-data">OpenAI</a></p>}
  </>;
  if (releasedProduct && document === 'datenschutz') {
    content = <>
      {publicCopy.sections.map(([heading, ...paragraphs]) => <section key={heading}>
        <h2 className="mt-7 break-words text-xl font-semibold leading-tight sm:text-2xl">{heading}</h2>
        {paragraphs.map(paragraph => <p key={paragraph} className="mt-3 break-words text-base leading-relaxed text-foreground/85">{paragraph}</p>)}
      </section>)}
      <p className="mt-5 break-all text-sm">{copy.contact} <a className="underline" href={'mailto:' + email}>{email}</a></p>
      <h2 className="mt-7 text-xl font-semibold">{publicCopy.sources}</h2>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {releasedPrivacySources.map(([label, url]) => <li key={url}><a className="underline" href={url}>{label}</a></li>)}
      </ul>
    </>;
  }
  if (releasedProduct && document === 'impressum') {
    content = <>
      <address className="mt-3 not-italic leading-8">
        <strong>Thomas Hullin</strong><br />
        Oberriedstrasse 75<br />
        3775 Lenk im Simmental<br />
        <a className="break-all underline" href={'mailto:' + email}>{email}</a>
      </address>
      <p className="mt-4 text-base leading-relaxed">{publicCopy.imprint}</p>
    </>;
  }
  return <div lang={locale} className="min-h-dvh min-w-0 bg-background text-foreground">
    <header className="sticky top-0 z-40 border-b bg-background/95 px-4 py-4 backdrop-blur-sm sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <Link href="/" className="min-w-0 text-base font-bold leading-snug tracking-tight sm:text-lg">Motivationsboost</Link>
        <ProductLanguagePicker />
        <Link href="/app" className="text-sm underline underline-offset-2">{copy.app}</Link>
      </div>
    </header>
    <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-7 sm:px-6 sm:py-10">
      <article className="min-w-0 overflow-hidden rounded-xl border bg-card p-5 shadow-sm sm:p-8">
        <h1 className="break-words text-2xl font-bold leading-tight sm:text-3xl">{copy[document]}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.date} {date}</p>
        {releasedTerms && <p className="mt-3 text-base leading-relaxed">{release.intro}</p>}
        {content}
        {releasedTerms && (weeklyTermsVersion ? <section className="mt-7 space-y-3">
          <h2 className="text-xl font-semibold">{release.heading}</h2>
          <p>{release.weekly}</p>
          <p>{release.refund} <a className="underline" href={'mailto:' + productSupportEmail}>{productSupportEmail}</a></p>
          <p className="text-sm text-muted-foreground">{release.version} {weeklyTermsVersion}</p>
        </section> : <p className="mt-5">{release.free}</p>)}
        {document === 'agb' && (!releasedTerms || weeklyTermsVersion) && <p className="mt-5 break-words text-base leading-relaxed text-foreground/85">{creditTerms[locale]}</p>}
      </article>
    </main>
    <footer className="mx-auto flex max-w-3xl flex-wrap gap-4 px-4 pb-8 text-sm sm:px-6">
      {paths.map(path => <Link key={path} href={'/' + path} className="underline underline-offset-2">{copy[path]}</Link>)}
      <a href={website} rel="noopener noreferrer" target="_blank" className="underline underline-offset-2">TH Analytica</a>
    </footer>
  </div>;
}
