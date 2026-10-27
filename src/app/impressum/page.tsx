import Link from 'next/link';
import { LegalContent, LEGAL_UPDATE_DATE, TH_ANALYTICA_URL } from '@/components/legal-content';

export const metadata = {
  title: 'Impressum | Motivationsboost',
  description: 'Impressum und Kontaktinformationen zur KI-Karriereanwendung Motivationsboost.',
  robots: { index: false, follow: false },
};

export default function LegalPage() {
  return (
    <div className="min-h-dvh min-w-0 bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/95 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-5 gap-y-2">
          <Link href="/" className="min-w-0 text-base font-bold leading-snug tracking-tight sm:text-lg">Motivationsboost</Link>
          <Link href="/" className="text-sm underline underline-offset-2">Zur App</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-7 sm:px-6 sm:py-10">
        <article className="min-w-0 overflow-hidden rounded-xl border bg-card p-5 shadow-sm sm:p-8">
          <h1 className="break-words text-2xl font-bold leading-tight sm:text-3xl">Impressum</h1>
          <p className="mt-2 text-sm text-muted-foreground">Stand: {LEGAL_UPDATE_DATE}</p>
          <LegalContent document="impressum" />
        </article>
      </main>
      <footer className="mx-auto flex max-w-3xl flex-wrap gap-4 px-4 pb-8 text-sm sm:px-6">
        <Link href="/impressum" className="underline underline-offset-2">Impressum</Link>
        <Link href="/datenschutz" className="underline underline-offset-2">Datenschutz</Link>
        <Link href="/agb" className="underline underline-offset-2">Nutzungsbedingungen</Link>
        <a href={TH_ANALYTICA_URL} rel="noopener noreferrer" target="_blank" className="underline underline-offset-2">TH Analytica</a>
      </footer>
    </div>
  );
}
