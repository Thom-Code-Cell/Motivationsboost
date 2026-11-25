import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { productOrigin, productSummary, publicProductApproved } from '@/lib/public-product';
import { LandingNavigation } from './landing-navigation';
import './sites-landing.css';

export function generateMetadata(): Metadata {
  const approved = publicProductApproved();
  return {
    title: 'Motivationsboost | Dein nächster beruflicher Schritt',
    description: productSummary,
    robots: { index: approved, follow: approved },
    alternates: approved ? { canonical: productOrigin } : undefined,
  };
}

export default function ProductHome() {
  return <div id="start" className="motivationsboost-landing">
    <a className="skip" href="#inhalt">Zum Inhalt</a>
    <LandingNavigation />
    <main id="inhalt">
    <section className="hero" aria-labelledby="hero-title">
    <div className="wrap hero-inner">
      <div className="hero-copy">
        <p className="eyebrow">Dein KI-gestützter Bewerbungs- und Karrierecoach</p>
        <h1 id="hero-title">Deine Erfahrung.<br />Deine Worte.<br /><em>Dein nächster Schritt.</em></h1>
        <p className="lead">Ob du eine neue Stelle suchst, dich beruflich weiterentwickeln möchtest oder einen Neuanfang wagst: Motivationsboost hilft dir, deine Stärken sichtbar zu machen und deine Bewerbungen individuell, professionell und glaubwürdig vorzubereiten.</p>
        <p className="hero-workflow">Geplant ist: Du fügst einen Stellenlink ein oder lässt dir passende Stellen vorschlagen. Die KI soll die Recherche und den Entwurf deiner Bewerbung übernehmen. Du entscheidest, was du abschickst.</p>
        <div className="actions"><Link className="button" href="/app">Kostenlos ausprobieren</Link><a className="button outline" href="#moeglichkeiten">Entdecke deine Möglichkeiten</a></div>
        <p className="prototype-note">Geschützte Produktvorschau · Verkauf in Vorbereitung.</p>
      </div>
      <figure className="media hero-media" data-slot="hero">
        <div className="media-art"><Image src="/landing/motivationsboost-01-hero-homeoffice.webp" width={1448} height={1086} alt="Eine Frau blickt nachdenklich vom Schreibtisch im Homeoffice auf." sizes="(max-width: 610px) 100vw, 50vw" priority />
        </div>
      </figure>
    </div>
    <div className="trust">
      <ul className="wrap"><li>Entwickelt in der Schweiz</li><li>Datenschutzorientiert</li><li>Persönliche Kontrolle</li><li>Belegorientierte KI-Unterstützung</li></ul>
    </div>
    </section>

    <section className="section wrap" id="funktionen">
    <div className="section-heading">
      <p className="eyebrow">Mehr als ein Motivationsschreiben</p>
      <h2>Dein persönlicher Begleiter für den nächsten beruflichen Schritt.</h2>
      <p>Motivationsboost soll dein berufliches Profil, passende Stellen und deine Unterlagen in einem durchgängigen Bewerbungsprozess zusammenführen.</p>
      <p className="prototype-note">Geplanter Funktionsumfang · Produktabnahme ausstehend</p>
    </div>
    <div className="features">
      <article data-status="planned"><span aria-hidden="true">◎</span><h3>Persönliches Bewerbungsprofil</h3><p>Halte deine Stärken, Rollen und belegbaren Erfolge fest.</p></article>
      <article data-status="planned"><span aria-hidden="true">▤</span><h3>Lebenslauf aus Arbeitszeugnissen</h3><p>Lass aus deinen Zeugnissen einen Lebenslaufentwurf erstellen. Prüfe und ergänze, was fehlt.</p></article>
      <article data-status="planned"><span aria-hidden="true">⌕</span><h3>Stellensuche und Stellenanalyse</h3><p>Übernimm ein Inserat per Link oder lass passende offene Stellen zu deinem Profil suchen.</p></article>
      <article data-status="planned"><span aria-hidden="true">✎</span><h3>Individuelle Motivationsschreiben</h3><p>Entwickle einen Entwurf für die konkrete Stelle in deinem Ton.</p></article>
      <article data-status="planned"><span aria-hidden="true">☷</span><h3>Lebenslaufoptimierung</h3><p>Mache relevante Stationen und Ergebnisse leichter erfassbar.</p></article>
      <article data-status="planned"><span aria-hidden="true">✓</span><h3>Bewerbungs- und ATS-Analyse</h3><p>Prüfe Inhalt und Aufbau auch mit Blick auf Bewerbermanagementsysteme.</p></article>
      <article data-status="planned"><span aria-hidden="true">◇</span><h3>Berufliche Neuorientierung</h3><p>Entdecke, wo deine Erfahrung in anderen Rollen gefragt sein könnte.</p></article>
      <article data-status="planned"><span aria-hidden="true">◫</span><h3>Interview-Coach</h3><p>Übe mögliche Fragen und finde konkrete Beispiele für deine Antworten.</p></article>
      <article data-status="planned"><span aria-hidden="true">↗</span><h3>LinkedIn-Optimierung</h3><p>Überarbeite dein berufliches Profil passend zu deinem nächsten Ziel.</p></article>
      <article data-status="planned"><span aria-hidden="true">▥</span><h3>Bewerbungsverwaltung</h3><p>Behalt Stellen, Unterlagen und nächste Schritte im Blick.</p></article>
    </div>
    </section>

    <section id="moeglichkeiten" className="section sand">
    <div className="wrap split">
      <figure className="media landscape" data-slot="orientation"><div className="media-art"><Image src="/landing/motivationsboost-02-neuanfang-weitblick.webp" width={1448} height={1086} alt="Ein Mann sitzt nachdenklich vor seinem Laptop, neben ihm liegen ein Notizbuch und Unterlagen." sizes="(max-width: 610px) 100vw, 50vw" /></div></figure>
      <div><p className="eyebrow">Neuorientierung und Quereinstieg</p><h2>Deine Erfahrung eröffnet mehr Möglichkeiten, als du vielleicht denkst.</h2>
        <p>Ein Jobtitel erzählt nur einen Teil deiner Geschichte. Was du aufgebaut, verantwortet und erreicht hast, kann auch in anderen Branchen wertvoll sein.</p>
        <p>Motivationsboost soll dir helfen, übertragbare Kompetenzen zu erkennen, neue Berufsfelder zu entdecken und deinen nächsten Schritt gezielt vorzubereiten. Das gilt auch, wenn du nach einer Pause zurückkehrst oder langjährige Erfahrung neu einsetzen möchtest.</p>
      </div>
    </div>
    </section>

    <section className="section wrap" id="vorteile">
    <div className="section-heading"><p className="eyebrow">Deine Vorteile</p><h2>Warum Motivationsboost?</h2><p>Vom ersten Arbeitszeugnis bis zum fertigen Bewerbungsentwurf: Bereite deinen nächsten Schritt in einem zusammenhängenden Ablauf vor.</p><p className="prototype-note">Vorgesehener Nutzen · Produktabnahme ausstehend</p></div>
    <dl className="benefits">
      <div><dt>Deine tatsächliche Erfahrung</dt><dd>Aus Arbeitszeugnissen und vorhandenen Unterlagen soll ein Lebenslaufentwurf entstehen, den du prüfst und wiederverwenden kannst.</dd></div>
      <div><dt>Deine persönliche Sprache</dt><dd>Die KI soll ein Motivationsschreiben für die konkrete Stelle entwerfen. Du kannst Formulierungen ändern, bis sie nach dir klingen.</dd></div>
      <div><dt>Deine beruflichen Möglichkeiten</dt><dd>Ein Stellenlink soll für den Einstieg genügen. Wenn du noch keine Stelle im Blick hast, soll die Suche passende Angebote finden und begründen.</dd></div>
      <div><dt>Deine persönlichen Daten</dt><dd>Lokale Speicherung und datensparsame Verarbeitung sind verbindliche Architekturziele.</dd></div>
      <div><dt>Deine Entscheidung</dt><dd>Du wählst die Stelle, prüfst die Aussagen und entscheidest, welche Unterlagen du abschickst.</dd></div>
      <div><dt>Dein gesamter Bewerbungsprozess</dt><dd>Unterlagen, Bewerbungsstand und Interviewvorbereitung sollen an einem Ort zusammenlaufen, damit du für den nächsten Schritt alles zur Hand hast.</dd></div>
    </dl>
    </section>

    <section className="section process" id="ablauf">
    <div className="wrap">
      <div className="section-heading"><p className="eyebrow">So funktioniert’s</p><h2>Ein klarer Weg durch deine Bewerbung.</h2><p>Entdecke die acht geplanten Schritte. Öffne einen Schritt, um zu sehen, wobei er dich unterstützen soll.</p></div>
      <div className="entry-paths" aria-labelledby="entry-title">
        <h3 id="entry-title">Zwei Wege zu deiner nächsten Bewerbung</h3>
        <div className="entry-grid">
          <details data-status="planned">
            <summary><span className="entry-icon" aria-hidden="true">↗</span> Ich habe ein Stelleninserat <i aria-hidden="true"></i></summary>
            <p>Füge den Link zum Inserat ein. Wenn die Anzeige zugänglich ist, soll die KI ihre Anforderungen erfassen, sie mit deinem Profil abgleichen und deine Bewerbung als Entwurf vorbereiten. Lässt sich das Inserat über den Link nicht lesen, kannst du den Text bei Bedarf einfügen.</p>
          </details>
          <details data-status="planned">
            <summary><span className="entry-icon" aria-hidden="true">⌕</span> Ich suche passende Stellen <i aria-hidden="true"></i></summary>
            <p>Die KI soll aus deinen Arbeitszeugnissen einen Lebenslaufentwurf erstellen. Du prüfst ihn und ergänzt bei Bedarf fehlende Angaben. Auf Basis deines bestätigten Profils und deiner Wünsche soll Motivationsboost offene Stellen finden und erklären, warum sie passen könnten. Für die Stelle, die du auswählst, bereitet die KI deine Unterlagen vor.</p>
          </details>
        </div>
        <p className="entry-shared">Du prüfst Lebenslauf und Motivationsschreiben vor dem Versand und entscheidest, was du weitergibst.</p>
      </div>
      <div className="journey">
        <ol className="steps">
          <li><details open><summary><span aria-hidden="true">01</span> Mein berufliches Profil <i aria-hidden="true"></i></summary><p>Nutze einen vorhandenen Lebenslauf oder lass einen Entwurf aus deinen Arbeitszeugnissen erstellen. Prüfe Stationen, Stärken und belegbare Erfolge.</p></details></li>
          <li><details><summary><span aria-hidden="true">02</span> Meine Wunschstelle <i aria-hidden="true"></i></summary><p>Füge den Link zu einem Inserat ein oder lass dir offene Stellen vorschlagen, die zu deinem Profil und deinen Wünschen passen.</p></details></li>
          <li><details><summary><span aria-hidden="true">03</span> Meine Eignung <i aria-hidden="true"></i></summary><p>Gleiche die Anforderungen mit deinem Profil ab und erkenne, wo Beispiele fehlen.</p></details></li>
          <li><details><summary><span aria-hidden="true">04</span> Meine Bewerbungsunterlagen <i aria-hidden="true"></i></summary><p>Schärfe deinen Lebenslauf und arbeite am Entwurf für dein Motivationsschreiben.</p></details></li>
          <li><details><summary><span aria-hidden="true">05</span> Meine Qualitätskontrolle <i aria-hidden="true"></i></summary><p>Prüfe Fakten, Ton und Lesbarkeit und gib die Inhalte selbst frei.</p></details></li>
          <li><details><summary><span aria-hidden="true">06</span> Meine Bewerbungsmappe <i aria-hidden="true"></i></summary><p>Stelle die fertigen Unterlagen zusammen und entscheide, was du weitergibst.</p></details></li>
          <li><details><summary><span aria-hidden="true">07</span> Meine Bewerbungsübersicht <i aria-hidden="true"></i></summary><p>Halte den Stand deiner Bewerbungen und die nächsten Schritte fest.</p></details></li>
          <li><details><summary><span aria-hidden="true">08</span> Mein Vorstellungsgespräch <i aria-hidden="true"></i></summary><p>Bereite Fragen und Antworten anhand deiner eigenen Erfahrungen vor.</p></details></li>
        </ol>
        <div className="journey-media">
          <figure className="media landscape" data-slot="journey"><div className="media-art"><Image src="/landing/motivationsboost-05-bewerbungsreise-laptop.webp" width={1448} height={1086} alt="Über die Schulter einer Frau sieht man einen Laptop mit einer illustrierten Übersicht zum Bewerbungsablauf." sizes="(max-width: 610px) 100vw, 50vw" /></div><figcaption>Illustration des Bewerbungsablaufs</figcaption></figure>
          <figure className="screenshot-slot"><Image src="/landing/bewerbungsuebersicht.webp" width={728} height={778} alt="Bewerbungsübersicht mit zwei Beispielstellen und auswählbaren Status" sizes="(max-width: 610px) 100vw, 45vw" /><figcaption>Anwendungsansicht mit synthetischen Beispieldaten</figcaption></figure>
        </div>
      </div>
    </div>
    </section>

    <section className="section wrap split" id="interview">
      <div><p className="eyebrow">Vorstellungsgespräch</p><h2>Gut vorbereitet. Mit mehr Selbstvertrauen ins Gespräch.</h2>
      <p>Bereite dich gezielt auf mögliche Fragen vor, reflektiere deine Erfahrungen und lerne, deine Kompetenzen verständlich und überzeugend zu vermitteln.</p>
      <p>Die KI soll dir bei der Vorbereitung helfen. Deine Persönlichkeit, deine Erfahrungen und deine eigenen Antworten stehen im Mittelpunkt.</p></div>
      <figure className="media landscape" data-slot="interview"><div className="media-art"><Image src="/landing/motivationsboost-03-bewerbungsgespraech-coaching.webp" width={1448} height={1086} alt="Eine Frau und ein Mann führen ein Gespräch an einem Holztisch." sizes="(max-width: 610px) 100vw, 50vw" /></div></figure>
    </section>

    <section className="section dark" id="datenschutz">
    <div className="wrap">
      <div className="split privacy">
        <figure className="media landscape" data-slot="privacy"><div className="media-art"><Image src="/landing/motivationsboost-04-karriereplanung-zuhause.webp" width={1448} height={1086} alt="Eine Frau hält ein Blatt Papier in der Hand und schaut auf ihren Laptop." sizes="(max-width: 610px) 100vw, 50vw" /></div></figure>
        <div><p className="eyebrow">Datenschutz und Kontrolle</p><h2>Deine Karriere. Deine Daten. Deine Entscheidung.</h2>
        <p>Deine persönlichen Bewerbungsunterlagen sollen grundsätzlich auf deinem Gerät gespeichert bleiben. Du entscheidest, welche Angaben du verwendest, welche Vorschläge du übernimmst und welche Unterlagen du weitergibst.</p>
        <p><strong>Deine Bewerbung gehört dir.</strong></p></div>
      </div>
      <div className="privacy-grid">
        <div><h3>Lokal speichern und sichern</h3><p>Vorgesehen sind lokale Speicherung, Datensicherung und Wiederherstellung. Eine dauerhaft zentralisierte Bewerberdatenbank ist im Architekturziel ausgeschlossen.</p></div>
        <div><h3>KI gezielt einsetzen</h3><p>Bei optionalen KI-Anfragen sollen die jeweils erforderlichen Informationen an den KI-Dienst übertragen werden. Welche Angaben betroffen sind, soll nachvollziehbar sein.</p></div>
        <div><h3>Serverseitige Verarbeitung verstehen</h3><p>Technisch notwendige Konto-, Abonnement- und Zahlungsinformationen werden serverseitig verarbeitet. Die konkreten Datenflüsse und Bedingungen brauchen vor Veröffentlichung eine technische Prüfung.</p></div>
      </div>
    </div>
    </section>

    <section className="section sand" id="menschliche-beurteilung">
    <div className="wrap human">
      <div><p className="eyebrow">Menschliche Beurteilung</p><h2>Eine Bewerbung verdient menschliche Aufmerksamkeit.</h2><blockquote>KI unterstützt dich bei deiner Bewerbung. Über deine berufliche Zukunft sollen Menschen entscheiden.</blockquote></div>
      <div><p>Vorgesehen ist ein freiwilliger Hinweis für deine Bewerbungsunterlagen. Damit kannst du den Empfänger bitten, auf KI-gestützte Analyse, Bewertung, Profilbildung, Selektion und Modelltraining zu verzichten und die Bewerbung durch Menschen beurteilen zu lassen.</p><p>Du entscheidest, ob du den Hinweis beifügst. Für den Hinweis sind keine zusätzlichen KI-Kosten vorgesehen. Ob der Empfänger deinem Wunsch folgt, lässt sich nicht garantieren.</p></div>
    </div>
    </section>

    <section className="section wrap" id="preise">
      <div className="section-heading"><p className="eyebrow">Preise</p><h2>Wähle den Zeitraum, der zu dir passt.</h2><p>Preise, Kontingente und Leistungsumfang sind vorläufig. Buchungen sind bis zur Verkaufsfreigabe geschlossen.</p></div>
      <div className="pricing">
        <article><h3>Kostenloser Einstieg</h3><p className="price"><span>CHF</span> 0.00</p><p>Zum Kennenlernen.</p><Link className="button outline" href="/app">Kostenlos ausprobieren</Link></article>
        <article><h3>Wochenpass</h3><p className="price"><span>CHF</span> 8.90</p><p>Für eine Woche.</p><button className="button outline" type="button" disabled>Wochenpass in Vorbereitung</button></article>
        <article className="plan-highlight"><h3>Monatsabo</h3><p className="price"><span>CHF</span> 17.90</p><p>Pro Monat.</p><button className="button gold" type="button" disabled>Monatsabo in Vorbereitung</button></article>
        <article><h3>Jahresabo</h3><p className="price"><span>CHF</span> 119.00</p><p>Pro Jahr.</p><button className="button outline" type="button" disabled>Jahresabo in Vorbereitung</button></article>
      </div>
    </section>

    <section className="section sand" id="faq">
    <div className="wrap faq">
      <div><p className="eyebrow">FAQ</p><h2>Häufig gestellte Fragen.</h2><p>Fragen zum Projekt? Schreib an <a href="mailto:thomas@th-analytica.com">TH Analytica</a>.</p></div>
      <div className="questions">
        <details><summary>Was ist Motivationsboost?<i aria-hidden="true"></i></summary><p>Motivationsboost ist der geplante persönliche KI-gestützte Bewerbungs- und Karrierecoach von TH Analytica. Er soll von der Orientierung und Stellenanalyse bis zu Unterlagen und Interviewvorbereitung unterstützen.</p></details>
        <details><summary>Für wen eignet sich die Anwendung?<i aria-hidden="true"></i></summary><p>Für Stellensuchende, Berufseinsteigende, erfahrene Berufstätige, Führungskräfte, Menschen ab 50 sowie für Quer- und Wiedereinsteigende.</p></details>
        <details><summary>Wie unterstützt mich die KI?<i aria-hidden="true"></i></summary><p>Die KI soll Arbeitszeugnisse und zugängliche Stelleninserate auswerten, passende Stellen vorschlagen, Unterlagen entwerfen und Fragen für das Vorstellungsgespräch vorbereiten. Du prüfst jeden Vorschlag und entscheidest über die Übernahme.</p></details>
        <details><summary>Reicht ein Link zum Stelleninserat?<i aria-hidden="true"></i></summary><p>Das ist vorgesehen, wenn das Inserat über den Link gelesen werden kann. Bei nicht zugänglichen Anzeigen kannst du den Text bei Bedarf selbst einfügen.</p></details>
        <details><summary>Kann die KI passende Stellen für mich finden?<i aria-hidden="true"></i></summary><p>Die geplante Stellensuche soll dein bestätigtes Profil mit offenen Stellen aus den unterstützten Quellen abgleichen. Du kannst deine Wünsche ergänzen, die Gründe für einen Vorschlag ansehen und selbst entscheiden, welche Stelle du weiterverfolgst.</p></details>
        <details><summary>Kann ich mich beruflich neu orientieren?<i aria-hidden="true"></i></summary><p>Ja, im Produktkonzept ist Neuorientierung vorgesehen. Die Anwendung soll übertragbare Kompetenzen herausarbeiten und dir helfen, passende Rollen oder Branchen zu erkunden.</p></details>
        <details><summary>Werden meine Erfahrungen und Qualifikationen erfunden?<i aria-hidden="true"></i></summary><p>Die Entwürfe sollen sich auf deine Angaben und belegbaren Erfahrungen stützen. Prüfe alle Aussagen vor dem Versand und korrigiere unzutreffende Vorschläge.</p></details>
        <details><summary>Wo werden meine Bewerbungsunterlagen gespeichert?<i aria-hidden="true"></i></summary><p>Persönliche Unterlagen sollen grundsätzlich lokal auf deinem Gerät gespeichert werden. Die endgültigen Angaben hängen von der technischen Abnahme ab.</p></details>
        <details><summary>Welche Daten werden an OpenAI übertragen?<i aria-hidden="true"></i></summary><p>Bei optionalen KI-Anfragen sollen nur die für die gewählte Aufgabe erforderlichen Angaben an den KI-Dienst übertragen werden. Die genauen Datenfelder, Bedingungen und Speicherfristen werden vor Veröffentlichung geprüft und dokumentiert.</p></details>
        <details><summary>Kann ich Motivationsboost kostenlos ausprobieren?<i aria-hidden="true"></i></summary><p>Ein kostenloser Einstieg ist vorgesehen. Welche Funktionen und Kontingente er umfasst, steht vor der kommerziellen Abnahme noch aus.</p></details>
        <details><summary>Wie funktionieren die Abonnements?<i aria-hidden="true"></i></summary><p>Vorgesehen sind ein Wochenpass sowie ein Monats- und Jahresabo. Laufzeitdetails, Verlängerung, Kontingente und Zahlungsablauf werden vor dem Verkaufsstart bestätigt.</p></details>
        <details><summary>Wie kann ich kündigen?<i aria-hidden="true"></i></summary><p>Der konkrete Kündigungsweg, die Fristen und der Zeitpunkt, zu dem der Zugang endet, werden in den freigegebenen Abonnementbedingungen beschrieben.</p></details>
        <details><summary>Kann ich meine Daten exportieren oder löschen?<i aria-hidden="true"></i></summary><p>Für lokale Unterlagen sind Sicherung und Wiederherstellung vorgesehen. Export und Löschung lokaler Daten sowie der Umgang mit serverseitigen Kontodaten werden mit der fertigen Umsetzung abgeglichen.</p></details>
        <details><summary>Garantiert Motivationsboost eine erfolgreiche Bewerbung?<i aria-hidden="true"></i></summary><p>Eine Einladung oder Zusage lässt sich nicht garantieren. Motivationsboost soll dir helfen, dich gezielt vorzubereiten und deine Erfahrung verständlich zu vermitteln.</p></details>
      </div>
    </div>
    </section>

    <section className="section closing" aria-labelledby="closing-title"><div className="wrap"><h2 id="closing-title">Dein nächster beruflicher Schritt beginnt mit dir.</h2><p>Entdecke deine Möglichkeiten, bringe deine Erfahrung auf den Punkt und bereite deine nächste Bewerbung mit mehr Klarheit und Selbstvertrauen vor.</p><Link className="button" href="/app">Kostenlos ausprobieren</Link></div></section>
    </main>

    <footer className="site-footer"><div className="wrap footer-grid">
      <div><a className="brand" href="#start"><span className="brand-icon" aria-hidden="true"></span>Motivations<span>boost</span></a><p>Ein Produkt von <a href="https://th-analytica.com">TH Analytica</a> aus der Schweiz.</p><a href="mailto:thomas@th-analytica.com">thomas@th-analytica.com</a></div>
      <div><h2>Rechtliche Informationen</h2><ul>
        <li><Link href="/impressum">Impressum</Link></li><li><Link href="/datenschutz">Datenschutzerklärung</Link></li><li><Link href="/agb">AGB</Link></li>
      </ul></div>

    </div></footer>
  </div>;
}
