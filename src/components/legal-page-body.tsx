'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ProductLanguagePicker, useProductLanguage } from './product-language';
import { legalCopy, translatedLegal, type LegalDocument } from '@/lib/legal-translations';

const paths = ['impressum', 'datenschutz', 'agb'] as const;
const dateLocales = { de: 'de-CH', en: 'en-GB', fr: 'fr-CH', it: 'it-CH' };
const creditTerms = {
  de: 'Vor einer KI-Aktion zeigt dir die Anwendung, wie viele Credits sie kostet. Du löst sie selbst aus. Bei zu wenig Guthaben bleibt die Aktion gesperrt. Es gibt keinen automatischen Credit-Nachkauf. Deine eigenen lokal gespeicherten Unterlagen bleiben unabhängig vom Guthaben zugänglich.',
  en: 'Before you start an AI action, the app shows how many credits it costs. You choose whether to proceed. If your balance is too low, the action is unavailable. Credits are never purchased automatically. Your own locally stored documents remain accessible regardless of your balance.',
  fr: 'Avant chaque action IA, l’application indique son coût en crédits. Vous choisissez si vous souhaitez la lancer. Si votre solde est insuffisant, l’action est indisponible. Aucun crédit supplémentaire n’est acheté automatiquement. Vos documents enregistrés localement restent accessibles quel que soit votre solde.',
  it: 'Prima di ogni azione IA, l’app mostra quanti crediti costa. Decidi tu se avviarla. Se il saldo è insufficiente, l’azione non è disponibile. Non vengono acquistati crediti automaticamente. I tuoi documenti salvati localmente rimangono accessibili indipendentemente dal saldo.',
} as const;

export function LegalPageBody({ document, children, email, website }: {
  document: LegalDocument;
  children: ReactNode;
  email: string;
  website: string;
}) {
  const locale = useProductLanguage();
  const copy = legalCopy[locale];
  const date = new Intl.DateTimeFormat(dateLocales[locale], { dateStyle: 'long', timeZone: 'UTC' }).format(new Date('2026-11-25'));
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
        {locale === 'de' ? children : <>
          {translatedLegal[locale][document].map(([heading, ...paragraphs], index) => <section key={heading || index}>
            {heading && <h2 className="mt-7 break-words text-xl font-semibold leading-tight sm:text-2xl">{heading}</h2>}
            {paragraphs.map(paragraph => <p key={paragraph} className="mt-3 break-words text-base leading-relaxed text-foreground/85">{paragraph}</p>)}
          </section>)}
          <p className="mt-5 break-all text-sm">{copy.contact} <a className="underline" href={'mailto:' + email}>{email}</a></p>
          {document === 'datenschutz' && <p className="mt-4 text-sm"><a className="underline" href="https://developers.openai.com/api/docs/guides/your-data">OpenAI</a></p>}
        </>}
        {document === 'agb' && <p className="mt-5 break-words text-base leading-relaxed text-foreground/85">{creditTerms[locale]}</p>}
      </article>
    </main>
    <footer className="mx-auto flex max-w-3xl flex-wrap gap-4 px-4 pb-8 text-sm sm:px-6">
      {paths.map(path => <Link key={path} href={'/' + path} className="underline underline-offset-2">{copy[path]}</Link>)}
      <a href={website} rel="noopener noreferrer" target="_blank" className="underline underline-offset-2">TH Analytica</a>
    </footer>
  </div>;
}
