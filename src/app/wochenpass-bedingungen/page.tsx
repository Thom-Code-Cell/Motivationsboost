import Link from 'next/link';
import { approvedWeeklyTermsSections, approvedWeeklyTermsTitle, approvedWeeklyTermsVersion } from '@/lib/approved-weekly-terms';

export const metadata = { title: approvedWeeklyTermsTitle, robots: { index: false, follow: false } };

export default function ApprovedWeeklyTermsPage() {
  return <main lang="de-CH" className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <Link href="/agb" className="underline">Allgemeine Nutzungsbedingungen</Link>
    <h1 className="text-3xl font-bold">{approvedWeeklyTermsTitle}</h1>
    <p>Fassung <strong>{approvedWeeklyTermsVersion}</strong> · 27. November 2026</p>
    {approvedWeeklyTermsSections.map(section => <section key={section.heading} className="space-y-3">
      <h2 className="text-xl font-semibold">{section.heading}</h2>
      {section.paragraphs.map(paragraph => paragraph.startsWith('> ')
        ? <blockquote key={paragraph} className="border-l-2 pl-4">{paragraph.slice(2)}</blockquote>
        : <p key={paragraph}>{paragraph.split('**').map((part, index) => index % 2
          ? <strong key={index}>{part}</strong> : part)}</p>)}
    </section>)}
  </main>;
}
