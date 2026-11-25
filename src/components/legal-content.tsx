import Link from 'next/link';

export const CONTACT_EMAIL = 'thomas@th-analytica.com';
export const TH_ANALYTICA_URL = 'https://th-analytica.com';
export const LEGAL_UPDATE_DATE = '25. November 2026';

const h2 = 'mt-7 break-words text-xl font-semibold leading-tight sm:text-2xl';
const p = 'mt-3 text-base leading-relaxed break-words text-foreground/85';
const ul = 'mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-foreground/85';

export function ContactEmail() {
  return <a href={`mailto:${CONTACT_EMAIL}`} className="break-all underline underline-offset-2 hover:text-primary">{CONTACT_EMAIL}</a>;
}

export function LegalContent({ document }: { document: 'impressum' | 'datenschutz' | 'agb' }) {
  if (document === 'impressum') {
    return <>
      <h2 className={h2}>Anbieter und Kontakt</h2>
      <address className="mt-3 not-italic leading-8">
        <strong>Thomas Hullin</strong><br />
        Oberriedstrasse 75<br />
        3775 Lenk im Simmental<br />
        Schweiz
      </address>
      <p className={p}>E-Mail: <ContactEmail /></p>
      <h2 className={h2}>Entwicklung und Zuordnung</h2>
      <p className={p}>Motivationsboost ist der interne Projektname einer KI-gestützten Karriere- und Bewerbungsanwendung. Sie wird im Umfeld von <a className="underline underline-offset-2" href={TH_ANALYTICA_URL} target="_blank" rel="noopener noreferrer">TH Analytica</a> entwickelt. TH Analytica ist eine eigene Website und wird hier nicht als rechtlich separate Gesellschaft bezeichnet.</p>
      <h2 className={h2}>Inhalte und externe Links</h2>
      <p className={p}>KI-generierte Inhalte können fehlerhaft sein und sind vor der Verwendung zu prüfen. Externe Inhalte liegen in der Verantwortung ihrer Anbieter. Zwingende gesetzliche Rechte bleiben unberührt.</p>
      <h2 className={h2}>Aktueller Status</h2>
      <p className={p}>Die Anwendung befindet sich in der Vorbereitungs- und Testphase. Produktive KI-Dienste, Zahlungen und die vollständige internationale Veröffentlichung sind noch nicht freigegeben.</p>
    </>;
  }

  if (document === 'datenschutz') {
    return <>
      <p className={p}>Motivationsboost befindet sich in der Produktionsvorbereitung. Die Produktionsdatenbank, der E-Mail-Versand und die KI sind derzeit nicht für öffentliche Konten freigeschaltet. Diese Hinweise beschreiben die aktuelle Anwendung und die Bedingungen, die vor der Freischaltung der jeweiligen Dienste gelten.</p>
      <h2 className={h2}>1. Verantwortliche Stelle</h2>
      <p className={p}>Thomas Hullin, Oberriedstrasse 75, 3775 Lenk im Simmental, Schweiz. Kontakt: <ContactEmail />.</p>
      <h2 className={h2}>2. Welche Informationen verarbeitet die Anwendung?</h2>
      <ul className={ul}>
        <li><strong>Konto:</strong> Name, E-Mail-Adresse, Passwort-Hash, Verifizierungsstatus sowie Sitzungsdaten. Passwörter werden nicht im Klartext gespeichert.</li>
        <li><strong>Bewerbungen:</strong> Stellenbezeichnung, Unternehmen, Link, Status, eine optionale Frist und Notizen bleiben bei neuen Einträgen in Ihrem Browser. Frühere Serverdaten bleiben für den Kontodatenexport und die von Ihnen ausgelöste lokale Übernahme verfügbar.</li>
        <li><strong>Unterlagen und Entwürfe:</strong> Lokal abgelegte Dateien, Eingaben und der bearbeitbare Entwurf verbleiben im Browser. Die geführte Vorlage und die Texterkennung von Fotos und unterstützten PDFs laufen im Browser. Dazu lädt der Browser Erkennungssoftware und Sprachmodelle von Motivationsboost. Die Datei und der erkannte Text werden für die Texterkennung nicht hochgeladen. Wenn Sie den erkannten Text speichern, befindet er sich in Ihrer lokalen Ablage und kann in der Arbeitsplatzsicherung enthalten sein. Lokal gespeicherte Daten können im jeweiligen Bereich gelöscht werden. Personen mit Zugriff auf dasselbe Browserprofil könnten auf die lokale Ablage zugreifen.</li>
        <li><strong>Stelleninserate:</strong> Wenn Sie ein Inserat per Link importieren, ruft der Vercel-Server die eingegebene öffentliche HTTPS-Adresse ab. Der Betreiber der verlinkten Seite erhält dabei die übliche technische Webanfrage. Fügen Sie keine Links mit persönlichen Zugriffscodes ein.</li>
        <li><strong>Optionale KI:</strong> Für jede externe Anfrage wählen Sie die Übertragung ausdrücklich. Häufige Kontaktangaben und beschriftete sensible Felder werden vorab entfernt. Prüfen Sie ihren Text auf weitere persönliche Angaben. Die aufbereiteten Texte werden über den Vercel-Server an OpenAI weitergegeben, wenn der Dienst für die Umgebung freigeschaltet ist. Die Responses-API erhält <code>store: false</code>. Das verhindert das reguläre Speichern des Antwortobjekts. Je nach Konto können getrennte Sicherheits- und Missbrauchsprotokolle bei OpenAI bis zu 30 Tage oder in Ausnahmefällen länger bestehen. Die tatsächlichen Kontoeinstellungen, Verarbeitungsländer und Verträge werden vor Aktivierung geprüft. <a className="underline" href="https://developers.openai.com/api/docs/guides/your-data">OpenAI-Datenbedingungen</a></li>
        <li><strong>Technische Anbieter:</strong> Die Anwendung verwendet Vercel für Hosting, Neon PostgreSQL für Konten, technische Betriebsdaten und frühere serverseitige Bewerbungen sowie – nach Einrichtung – Resend für Verifizierungs-, Passwort- und Löschungs-E-Mails. Für Produktion sind Region, Auftragsbearbeitung und Aufbewahrung der jeweiligen Konten vor dem Start zu bestätigen.</li>
        <li><strong>Zahlungen:</strong> In der geschützten Vorschau kann der Wochenpass im Payrexx-Testmodus simuliert werden. Payrexx verarbeitet den Testauftrag und die bei der Zahlungsmaske eingegebenen Testdaten. Die Anwendung speichert Auftragsreferenz, Betrag, Währung und Teststatus zur Zuordnung des Zugangs. Der Verkauf ist gesperrt.</li>
      </ul>
      <h2 className={h2}>3. Zweck</h2>
      <p className={p}>Die Angaben dienen der Anmeldung, den von Ihnen gewählten Bewerbungsfunktionen, dem Kontoschutz und der angeforderten E-Mail-Kommunikation. Motivationsboost verwendet sie nicht für eigene Werbung oder eigenes Modelltraining. Für KI-Anfragen gelten zusätzlich die Bedingungen des aktivierten Anbieters.</p>
      <h2 className={h2}>4. Ihre Möglichkeiten</h2>
      <p className={p}>Im Konto können Sie die Serverdaten als JSON exportieren. Die Bewerbungsübersicht bietet eine separate lokale Sicherung, Wiederherstellung und Löschung. Löschen Sie lokale Kopien auf den betroffenen Geräten und entfernen Sie nicht mehr benötigte Sicherungsdateien. Beim Löschen von Browserdaten können ungesicherte Einträge verloren gehen. In Produktion wird die Kontolöschung per E-Mail bestätigt. Gesetzliche Aufbewahrungspflichten und Sicherungskopien bei Dienstleistern können eine zeitversetzte Entfernung von Serverdaten erfordern. Für Auskunfts-, Berichtigungs- und weitere Anliegen: <ContactEmail />.</p>
      <h2 className={h2}>5. Cookies, Zugriffe und Empfänger</h2>
      <p className={p}>Für die Anmeldung werden technisch notwendige Sitzungscookies verwendet. IndexedDB speichert die persönliche Ablage auf dem Gerät. Eine ausdrücklich gewählte Oberflächensprache legt die Anwendung im lokalen Browserspeicher ab. Bei automatischer Wahl berücksichtigt sie die Sprachreihenfolge des Browsers. Die geprüfte Kandidatenversion setzt keine Werbe-Cookies. Produktionsregionen, Auftragsbearbeitung und Aufbewahrungsfristen werden vor der öffentlichen Freischaltung geprüft.</p>
      <h2 className={h2}>6. Weitere Informationen</h2>
      <p className={p}>Informationen zu Leistungsumfang und Nutzung finden Sie in den <Link href="/agb" className="underline underline-offset-2">Nutzungsbedingungen</Link>. Die Entwicklungs- und Unternehmenswebsite ist <a href={TH_ANALYTICA_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">TH Analytica</a>.</p>
    </>;
  }

  return <>
    <p className={p}>Motivationsboost ist noch nicht öffentlich freigegeben. Der derzeitige Anwendungskern umfasst ein Benutzerkonto, eine Bewerbungsübersicht und einen bearbeitbaren Entwurf für ein Motivationsschreiben. Weitere Funktionen und ein kommerzielles Angebot werden erst nach separater Freigabe aktiviert.</p>
    <h2 className={h2}>1. Anbieter und Kontakt</h2>
    <p className={p}>Thomas Hullin, Oberriedstrasse 75, 3775 Lenk im Simmental, Schweiz. E-Mail: <ContactEmail />.</p>
    <h2 className={h2}>2. Leistungen</h2>
    <p className={p}>Die Anwendung unterstützt beim Erfassen von Bewerbungen und beim Erstellen sowie Bearbeiten eines Motivationsschreiben-Entwurfs. Ohne aktivierten KI-Anbieter erstellt sie eine geführte Vorlage aus den eingegebenen Angaben. Optionale KI-Funktionen dürfen nur nach gesonderter Aktivierung verwendet werden. Ein Lebenslauf- oder Interview-Coaching ist nicht Bestandteil des aktuell freigegebenen Anwendungskerns.</p>
    <h2 className={h2}>3. Registrierung und Verantwortung</h2>
    <p className={p}>Für personalisierte Funktionen ist eine Anmeldung erforderlich. KI-Ergebnisse sind Vorschläge und müssen vor der Weitergabe an Arbeitgeber auf Richtigkeit und Eignung geprüft werden. Die Anwendung garantiert weder eine Einladung noch eine Einstellung.</p>
    <h2 className={h2}>4. Preise, Payrexx und Abonnemente</h2>
    <p className={p}>Kostenpflichtige Angebote sind derzeit nicht freigeschaltet. Das geplante Zahlungssystem ist <strong>Payrexx</strong>, nicht Stripe. Konkrete Preise, Währungen, Leistungsgrenzen, Laufzeiten, Verlängerungen und allfällige Kündigungsfristen werden vor einem Vertragsabschluss eindeutig angezeigt. Der Wochenpass in der geschützten Testumgebung prüft einen simulierten Auftrag und sieben Tage Testzugang. Der simulierte Betrag ist kein Kaufpreis. Ein bezahlter Vertrag entsteht erst durch den separat freigegebenen Verkauf.</p>
    <h2 className={h2}>5. Kündigung und Rückerstattung</h2>
    <p className={p}>Für künftige Abonnemente werden ein nachvollziehbarer Kündigungsweg und die geltenden gesetzlichen Rückerstattungsansprüche vor der Aktivierung veröffentlicht. Bei Fragen: <ContactEmail />.</p>
    <h2 className={h2}>6. Datenschutz und Verfügbarkeit</h2>
    <p className={p}>Unsere <Link href="/datenschutz" className="underline underline-offset-2">Datenschutzhinweise</Link> erklären die Verarbeitung personenbezogener Daten. Wartung, technische Fehler und Ausfälle externer Dienste sind möglich. Zwingende gesetzliche Ansprüche bleiben unberührt.</p>
    <h2 className={h2}>7. Recht</h2>
    <p className={p}>Soweit gesetzlich zulässig gilt schweizerisches Recht. Zwingende Verbraucherschutzbestimmungen am gewöhnlichen Aufenthalt der nutzenden Person bleiben unberührt.</p>
  </>;
}
