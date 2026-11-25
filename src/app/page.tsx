import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, BriefcaseBusiness, FilePenLine, FolderLock, ShieldCheck } from 'lucide-react';
import { ContactEmail, TH_ANALYTICA_URL } from '@/components/legal-content';
import { PLANS } from '@/lib/plans';
import { productOrigin, productSummary, publicProductApproved } from '@/lib/public-product';
import styles from './landing.module.css';

export function generateMetadata(): Metadata {
  const approved = publicProductApproved();
  return {
    title: 'Motivationsboost | Dein nächster beruflicher Schritt',
    description: productSummary,
    robots: { index: approved, follow: approved },
    alternates: approved ? { canonical: productOrigin } : undefined,
  };
}

const features = [
  { icon: BriefcaseBusiness, title: 'Bewerbungen im Blick', copy: 'Halte Stellen, Unternehmen und Status fest. Deine neuen Einträge bleiben in deinem Browser.' },
  { icon: FilePenLine, title: 'Ein Entwurf in deinen Worten', copy: 'Mach deine Motivation und ein konkretes Beispiel aus deiner Erfahrung zum Ausgangspunkt. Überarbeite den Entwurf selbst und lade den Text herunter.' },
  { icon: ShieldCheck, title: 'Du entscheidest, was du teilst', copy: 'Prüfe jeden Entwurf vor dem Export. Du kannst einen freiwilligen Hinweis zur menschlichen Beurteilung hinzufügen.' },
];

const questions = [
  { question: 'Kann ich mich auch ohne externe KI bewerben?', answer: 'Ja. Der geführte Entwurf verwendet deine Eingaben für eine bearbeitbare Vorlage. OpenAI kommt erst nach Freigabe und deiner Wahl für die konkrete Anfrage zum Einsatz.' },
  { question: 'Was passiert, wenn ich Browserdaten lösche oder das Gerät wechsle?', answer: 'Auf dem Gerät gespeicherte Einträge können verloren gehen. Sichere sie als Datei und lies diese auf dem anderen Gerät wieder ein.' },
  { question: 'Sendet Motivationsboost meine Bewerbung an Arbeitgeber?', answer: 'Du entscheidest selbst, welche Fassung du exportierst und an wen du sie sendest. Die Anwendung nimmt keinen Kontakt zu Arbeitgebern auf.' },
  { question: 'Kann ich schon ein Abo abschliessen?', answer: 'Der Checkout ist noch gesperrt. Die dargestellten Tarife sind zur wirtschaftlichen und technischen Prüfung vorgesehen.' },
];

export default function ProductHome() {
  return <div className={styles.site}>
    <a className={styles.skipLink} href="#hauptinhalt">Zum Hauptinhalt</a>
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Hauptnavigation">
        <Link className={styles.brand} href="/">Motivations<span>boost</span></Link>
        <div className={styles.navLinks}>
          <a href="#funktionen">Funktionen</a>
          <a href="#datenschutz">Datenschutz</a>
          <a href="#preise">Preise</a>
        </div>
        <Link className={styles.navCta} href="/app">Zur Anwendung <ArrowRight size={16} aria-hidden="true" /></Link>
      </nav>
    </header>
    <main id="hauptinhalt">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <p className={styles.kicker}>Bewerbungscoach von TH Analytica</p>
            <h1>Deine Erfahrung.<br />Deine Worte.<br /><em>Dein nächster Schritt.</em></h1>
            <p className={styles.heroText}>Bündle deine Erfahrung, entwickle daraus einen persönlichen Bewerbungsentwurf und behalte deine nächsten Schritte im Blick.</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/app">Zur Anwendung <ArrowRight size={18} aria-hidden="true" /></Link>
              <a className={styles.heroLink} href="#einblick">Anwendung ansehen <ArrowDown size={16} aria-hidden="true" /></a>
            </div>
          </div>
          <div className={styles.heroImage}>
            <Image src="/landing/karriere-gespraech.webp" width={1100} height={1375} alt="Eine erfahrene Berufstätige und ein jüngerer Gesprächspartner besprechen Unterlagen an einem Tisch" priority sizes="(max-width: 760px) 100vw, 46vw" />
          </div>
        </div>
      </section>

      <section id="funktionen" className={styles.section}>
        <div className={styles.sectionIntro}>
          <h2>Von deiner Erfahrung zur Bewerbung</h2>
          <p>Wenn du nach vielen Berufsjahren neu ansetzt, die Branche wechselst oder dich gezielt auf eine Stelle bewirbst, hilft dir ein nachvollziehbarer Ablauf.</p>
        </div>
        <div className={styles.featureGrid}>
          {features.map(({ icon: Icon, title, copy }) => <article key={title} className={styles.feature}>
            <Icon size={25} strokeWidth={1.6} aria-hidden="true" />
            <h3>{title}</h3><p>{copy}</p>
          </article>)}
        </div>
      </section>

      <section id="einblick" className={styles.preview}>
        <div className={styles.previewInner}>
          <div>
            <h2>Deine nächsten Schritte an einem Ort</h2>
            <ol className={styles.steps}>
              <li><strong>Stelle festhalten</strong><span>Organisiere deine Bewerbungen und den Bearbeitungsstand.</span></li>
              <li><strong>Erfahrung belegen</strong><span>Beschreibe eine echte Situation aus deinem Berufsalltag und was du dazu beigetragen hast.</span></li>
              <li><strong>Entwurf prüfen</strong><span>Bearbeite die Formulierungen und prüfe deine Aussagen vor dem Export.</span></li>
            </ol>
          </div>
          <figure className={styles.appFigure}>
            <Image src="/landing/bewerbungsuebersicht.webp" width={728} height={778} alt="Motivationsboost-Bewerbungsübersicht mit zwei synthetischen Stellen und auswählbaren Status" sizes="(max-width: 760px) 100vw, 55vw" />
            <figcaption>Anwendungsansicht mit synthetischen Beispieldaten</figcaption>
          </figure>
        </div>
      </section>

      <section id="datenschutz" className={styles.section}>
        <div className={styles.privacy}>
          <FolderLock size={34} strokeWidth={1.5} aria-hidden="true" />
          <h2>Du behältst die Kontrolle über deine Bewerbungsdaten</h2>
          <p>Neue Einträge in der Bewerbungsübersicht bleiben in deinem Browser. Du kannst sie lokal sichern, wiederherstellen und löschen. Die geführte Briefvorlage funktioniert ohne Weitergabe an OpenAI.</p>
          <p>Der freiwillige Datenschutzhinweis bittet um eine persönliche Beurteilung. Er bleibt Teil deines Entwurfs und seine Auswahl wird nicht an OpenAI übertragen. Empfänger entscheiden nach ihren anwendbaren Regeln über die Verarbeitung.</p>
          <Link href="/datenschutz">Datenschutzhinweise lesen <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>

      <section id="preise" className={styles.clay}>
        <div className={styles.section}>
          <div className={styles.sectionIntro}>
            <h2>Tarife in Vorbereitung</h2>
            <p>Preise und Kontingente stehen unter Vorbehalt. Die Tarife sind derzeit nicht buchbar.</p>
          </div>
          <div className={styles.featureGrid}>
            {Object.values(PLANS).map(plan => <article key={plan.id} className={styles.price}>
              <h3>{plan.label}</h3>
              <p className={styles.amount}>CHF {(plan.amount / 100).toFixed(2)}</p>
              <p>{plan.limit} geplante KI-Aktionen pro {plan.period === '7 Tage' ? 'Woche' : 'Monat'}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.faq}>
          <h2>Häufige Fragen</h2>
          <div>{questions.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
        </div>
      </section>
      <section className={styles.closing}>
        <div className={styles.section}>
          <h2>KI unterstützt dich bei deiner Bewerbung.<br />Über deine berufliche Zukunft sollen Menschen entscheiden.</h2>
          <Link href="/app" className={styles.primaryButton}>Anmelden oder Konto erstellen <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </section>
    </main>
    <footer className={styles.footer}>
      <div><strong>Motivationsboost</strong><p>Ein Produkt von <a href={TH_ANALYTICA_URL}>TH Analytica</a></p><ContactEmail /></div>
      <nav aria-label="Informationen zum Produkt">
        <Link href="/about">Über Motivationsboost</Link>
        <Link href="/impressum">Impressum</Link>
        <Link href="/datenschutz">Datenschutz</Link>
        <Link href="/agb">Nutzungsbedingungen</Link>
      </nav>
    </footer>
  </div>;
}
