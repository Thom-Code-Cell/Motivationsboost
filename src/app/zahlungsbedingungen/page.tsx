import Link from 'next/link';
import { PLANS, creditPackPlans, recurringPlans } from '@/lib/plans';
import { approvedCreditPackTermsVersion, approvedSubscriptionTermsVersion } from '@/lib/approved-commercial-terms';

export const metadata = { title: 'Zahlungsbedingungen | Motivationsboost', robots: { index: false, follow: false } };

const approvedParagraphs = [
  [
    "Anbieter ist Thomas Hullin, TH Analytica, Oberriedstrasse 75, 3775 Lenk im Simmental, Schweiz. Für Vertragsfragen, Kündigungshilfe, technische Störungen, Widerruf und Rückerstattungen erreichst du uns unter motivationsboost@th-analytica.com.",
    "Die Bestellung setzt ein Motivationsboost-Konto mit bestätigter E-Mail-Adresse voraus. Du siehst den Tarif, den Gesamtpreis in CHF und den Zahlungsrhythmus, bevor du verbindlich bestellst. Payrexx wickelt die Zahlung ab. Die Gutschrift erfolgt für das Konto, mit dem du bestellt hast, sobald Motivationsboost die Zahlung zugeordnet und bestätigt hat. Du erhältst eine Bestätigung per E-Mail. Bleibt der Status offen, starte keine zweite Zahlung. Melde dich mit deiner Bestellreferenz beim Support.",
    "Credits sind kontogebunden und werden für die in der App bezeichneten KI-Funktionen verwendet. Die App zeigt den Verbrauch an, bevor du eine betreffende KI-Aktion startest. Zwingende Ansprüche bei Störungen, Mängeln, Nichterfüllung, Widerruf und Rückerstattung bleiben bestehen. Wenn ein gesetzliches Widerrufsrecht besteht, kannst du es auch durch eindeutige Erklärung per E-Mail oder Post ausüben. Soweit vorgeschrieben, steht zusätzlich die gesetzlich erforderliche Online-Widerrufsfunktion zur Verfügung. Eine vorgeschriebene Rückerstattung erfolgt über das ursprüngliche Zahlungsmittel, sofern nichts anderes wirksam vereinbart ist. Die Datenschutzhinweise erläutern die Verarbeitung von Konto-, Zahlungs- und KI-Daten."
  ],
  [
    "Jeder Kauf ist eine einmalige Zahlung. Es gibt keine automatische Verlängerung oder Nachbestellung. Zusatzcredits haben keinen tarifbedingten Ablauf und können im zugehörigen Konto auch nach Ende eines Wochenpasses oder Abonnements eingelöst werden. Bei vollständiger Rückerstattung oder Rückbelastung entfallen die unverbrauchten Credits aus der betroffenen Bestellung. Bereits verwendete Credits bleiben im Transaktionsjournal dokumentiert."
  ],
  [
    "Mit der Tarifbestellung und der Autorisierung bei Payrexx stimmst du der ersten Zahlung und den folgenden Zahlungen im angegebenen Rhythmus zu. Beim Jahresabo wird der Jahrespreis auf einmal bezahlt. Die Credits stehen in zwölf aufeinanderfolgenden Monatsabschnitten bereit. Unverbrauchte Abo-Credits verfallen am Ende des jeweiligen Monatsabschnitts.",
    "Du kannst künftige Verlängerungen im persönlichen Motivationsboost-Konto ausschalten. Eine bereits bezahlte Periode läuft bis zum angezeigten Enddatum weiter, ausser die Zahlung wird erstattet oder zurückbelastet. Bei fehlgeschlagener oder ungeklärter Zahlung werden für die neue Periode keine Credits gutgeschrieben. Die App löst für denselben ungeklärten Zahlungsvorgang keine zweite Belastung aus. Wenn eine Verlängerung vorübergehend nicht angeboten werden kann, erfolgt keine neue Abbuchung, bis der Vorgang wieder zulässig ist. Nach vollständiger Rückerstattung oder Rückbelastung entfallen die unverbrauchten Credits der betroffenen Periode. Bereits verwendete Credits bleiben im Transaktionsjournal dokumentiert."
  ]
];
export default function ApprovedCommercialTermsPage() {
  const [general, packs, subscriptions] = approvedParagraphs;
  const offers = [[creditPackPlans, packs, 'Zusatzcredits', 'zusatzcredits', approvedCreditPackTermsVersion],
    [recurringPlans, subscriptions, 'Abonnemente', 'abonnemente', approvedSubscriptionTermsVersion]] as const;
  return <main lang="de-CH" className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <Link href="/agb" className="underline">Allgemeine Nutzungsbedingungen</Link>
    <h1 className="text-3xl font-bold">Motivationsboost – Bedingungen für Zusatzcredits und Abonnemente</h1>
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Für beide Angebote</h2>
      {general.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    </section>
    {offers.map(([plans, paragraphs, title, id, version]) => <section id={id} key={id} className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p>Fassung <strong>{version}</strong> · 27. November 2026</p>
      <ul className="list-disc space-y-1 pl-5">
        {plans.map(id => {
          const plan = PLANS[id];
          return <li key={id}>{plan.label} · CHF {(plan.amount / 100).toFixed(2)} {plan.interval === 'P1Y' ? 'pro Jahr' : plan.interval === 'P1M' ? 'pro Monat' : 'einmalig'} · {plan.limit} KI-Credits{plan.interval && ' pro Monat'}</li>;
        })}
      </ul>
      {paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    </section>)}
  </main>;
}
