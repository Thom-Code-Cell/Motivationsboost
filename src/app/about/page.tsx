import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactEmail, TH_ANALYTICA_URL } from '@/components/legal-content';
import { productAbout, productOrigin, productSummary, publicProductApproved, publicProductSchema, productReleasedOn } from '@/lib/public-product';

export function generateMetadata(): Metadata {
  const approved = publicProductApproved();
  return {
    title: 'Über Motivationsboost | TH Analytica',
    description: productSummary,
    robots: { index: approved, follow: approved },
    alternates: approved ? { canonical: productAbout } : undefined,
  };
}

export default function ProductAboutPage() {
  const entity = {
    '@context': 'https://schema.org',
    '@graph': [
      ...publicProductSchema('de')['@graph'].filter(entry => entry['@type'] !== 'WebPage'),
      { '@type': 'AboutPage', '@id': productAbout, url: productAbout, name: 'Über Motivationsboost', isPartOf: { '@id': productOrigin + '/#website' }, mainEntity: { '@id': productOrigin + '/#app' }, inLanguage: 'de-CH', dateModified: productReleasedOn },
    ],
  };
  return <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(entity).replace(/</g, '\\u003c') }} />
    <header className="space-y-3">
      <h1 className="text-3xl font-semibold">Über Motivationsboost</h1>
      <p className="text-lg">Deine Erfahrung. Deine Worte. Dein nächster Schritt.</p>
      <p>{productSummary}</p>
    </header>
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">Was die Anwendung unterstützt</h2>
      <p>Du kannst Bewerbungen mit Stellenlink und Status festhalten. Aus deinen Angaben erstellt die Anwendung einen bearbeitbaren Briefentwurf und bietet einen Text-Download an.</p>
      <p>FREE kostet CHF 0.00 und arbeitet mit einer geführten Vorlage ohne externe KI. Du kannst Text aus unterstützten Fotos und PDFs lokal erkennen, einen zugänglichen Stellenlink importieren und den Entwurf vor der Weitergabe prüfen.</p>
    </section>
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">Wo deine Daten bleiben</h2>
      <p>Neue Einträge der Bewerbungsübersicht bleiben in deinem Browser. Du kannst sie dort sichern, wieder einlesen und löschen. Ein Entwurf wird aus den von dir eingegebenen Angaben erstellt.</p>
      <p>Du entscheidest selbst, welche Unterlagen du weitergibst. Motivationsboost versendet keine Bewerbungen.</p>
      <Link className="underline" href="/datenschutz">Datenschutzhinweise</Link>
    </section>
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">Betreiber und Quellen</h2>
      <p>Verantwortlich ist <a className="underline" href={TH_ANALYTICA_URL}>TH Analytica</a>. Fragen zum Produkt beantwortet <ContactEmail />.</p>
      <p className="text-sm">Redaktioneller Stand 26. November 2026.</p>
      <div className="flex flex-wrap gap-4">
        <Link className="underline" href="/impressum">Impressum</Link>
        <Link className="underline" href="/agb">Nutzungsbedingungen</Link>
        <Link className="underline" href="/app">Zur Anwendung</Link>
      </div>
    </section>
  </main>;
}
