import Link from 'next/link';

export const CONTACT_EMAIL = 'thomas@th-analytica.com';
export const TH_ANALYTICA_URL = 'https://th-analytica.com';
export const LEGAL_UPDATE_DATE = '27. Oktober 2026';

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
      <p className={p}>Diese Hinweise erläutern die aktuelle technische Vorbereitung der Bewerbungsanwendung. Vor einer öffentlichen Veröffentlichung müssen die tatsächlich konfigurierten Dienstleister, Speicherorte, Aufbewahrungsfristen und vertraglichen Datenschutzbedingungen abschliessend geprüft und hier konkretisiert werden.</p>
      <h2 className={h2}>1. Verantwortliche Stelle</h2>
      <p className={p}>Thomas Hullin, Oberriedstrasse 75, 3775 Lenk im Simmental, Schweiz. Kontakt: <ContactEmail />.</p>
      <h2 className={h2}>2. Welche Informationen verarbeitet die Anwendung?</h2>
      <ul className={ul}>
        <li><strong>Anmeldung:</strong> Google-/Firebase-Kennung, Name, E-Mail-Adresse sowie sicherheitsbezogene Sitzungsinformationen.</li>
        <li><strong>App-Daten:</strong> Firebase Firestore kann Profildaten, Spracheinstellungen, Bewerbungsstatus, gespeicherte Bewerbungen, Fortschritt sowie Verwaltungs- und Abrechnungsstatus enthalten – nicht nur technische Metadaten.</li>
        <li><strong>Dokumente:</strong> Mit Ihrer Berechtigung werden Dokumente aus Google Drive gelesen oder dort gespeichert. Für KI-Funktionen können Inhalte vorübergehend auf dem Server verarbeitet werden.</li>
        <li><strong>KI:</strong> Eingegebene Informationen und freigegebene Dokumentauszüge können bei aktivierter KI an den konfigurierten Anbieter übertragen werden. Der endgültige Anbieter und dessen Datenbedingungen werden vor dem Livebetrieb ergänzt.</li>
        <li><strong>Zahlungen:</strong> Vorgesehen ist Payrexx. Der Checkout ist bis zur gesonderten technischen und vertraglichen Freigabe deaktiviert. Nach einer Aktivierung können Zahlstatus und Abonnementinformationen verarbeitet werden; Zahlungsdaten werden beim Zahlungsanbieter eingegeben.</li>
      </ul>
      <h2 className={h2}>3. Zweck</h2>
      <p className={p}>Die Informationen werden für Kontoverwaltung, die gewählten Bewerbungsfunktionen, sichere Datenverarbeitung, Support und – erst nach Aktivierung – die Abwicklung von Zahlungen genutzt. Eine Nutzung Ihrer Dokumente für Werbung oder Modelltraining wird damit nicht pauschal erlaubt.</p>
      <h2 className={h2}>4. Ihre Möglichkeiten</h2>
      <p className={p}>Sie können die in der Anwendung geladenen Profildaten und Bewerbungen als JSON exportieren. Der Export umfasst nicht automatisch Google-Drive-Dateien und alle Datensätze bei Dienstleistern. Auskunfts-, Berichtigungs-, Löschungs- und weitere Datenschutzanliegen richten Sie bitte an <ContactEmail />. Die vollautomatische, dienstübergreifende Kontolöschung ist noch nicht freigeschaltet.</p>
      <h2 className={h2}>5. Cookies, Zugriffe und Empfänger</h2>
      <p className={p}>Für die Anmeldung werden technisch notwendige Sitzungsmechanismen eingesetzt. Firebase, Google Drive, das Hosting und gegebenenfalls ein freigeschalteter KI- oder Zahlungsanbieter können dabei Daten verarbeiten. Es wird nicht behauptet, dass die Anwendung ohne Cookies oder externe Datenverarbeitung auskommt. Details zu Standorten und Auftragsverarbeitung werden vor einem öffentlichen Start verifiziert.</p>
      <h2 className={h2}>6. Weitere Informationen</h2>
      <p className={p}>Informationen zu Leistungsumfang und Nutzung finden Sie in den <Link href="/agb" className="underline underline-offset-2">Nutzungsbedingungen</Link>. Die Entwicklungs- und Unternehmenswebsite ist <a href={TH_ANALYTICA_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">TH Analytica</a>.</p>
    </>;
  }

  return <>
    <p className={p}>Diese Nutzungsbedingungen beschreiben den vorgesehenen Funktionsumfang von Motivationsboost, einem noch nicht öffentlich freigegebenen Karriere- und Bewerbungsassistenten. Vor dem kommerziellen Start werden Vertragsbedingungen, Preise und gesetzliche Anforderungen abschliessend überprüft.</p>
    <h2 className={h2}>1. Anbieter und Kontakt</h2>
    <p className={p}>Thomas Hullin, Oberriedstrasse 75, 3775 Lenk im Simmental, Schweiz. E-Mail: <ContactEmail />.</p>
    <h2 className={h2}>2. Leistungen</h2>
    <p className={p}>Die Anwendung unterstützt nach Freigabe bei der Auswertung beruflicher Angaben, bei Entwürfen für Lebensläufe und Motivationsschreiben, der Interviewvorbereitung sowie bei der Organisation von Bewerbungen. Einzelne Funktionen setzen freigegebene Dokumente, kompatible externe Dienste oder eine separat aktivierte KI voraus.</p>
    <h2 className={h2}>3. Registrierung und Verantwortung</h2>
    <p className={p}>Für personalisierte Funktionen ist eine Anmeldung erforderlich. KI-Ergebnisse sind Vorschläge und müssen vor der Weitergabe an Arbeitgeber auf Richtigkeit und Eignung geprüft werden. Die Anwendung garantiert weder eine Einladung noch eine Einstellung.</p>
    <h2 className={h2}>4. Preise, Payrexx und Abonnemente</h2>
    <p className={p}>Kostenpflichtige Angebote sind derzeit nicht freigeschaltet. Das geplante Zahlungssystem ist <strong>Payrexx</strong>, nicht Stripe. Konkrete Preise, Währungen, Leistungsgrenzen, Laufzeiten, Verlängerungen und allfällige Kündigungsfristen werden vor einem Vertragsabschluss eindeutig angezeigt. Ohne gesonderte Checkout-Freigabe entsteht über diese Testumgebung kein kostenpflichtiges Abonnement.</p>
    <h2 className={h2}>5. Kündigung und Rückerstattung</h2>
    <p className={p}>Für künftige Abonnemente werden ein nachvollziehbarer Kündigungsweg und die geltenden gesetzlichen Rückerstattungsansprüche vor der Aktivierung veröffentlicht. Bei Fragen: <ContactEmail />.</p>
    <h2 className={h2}>6. Datenschutz und Verfügbarkeit</h2>
    <p className={p}>Unsere <Link href="/datenschutz" className="underline underline-offset-2">Datenschutzhinweise</Link> erklären die Verarbeitung personenbezogener Daten. Wartung, technische Fehler und Ausfälle externer Dienste sind möglich. Zwingende gesetzliche Ansprüche bleiben unberührt.</p>
    <h2 className={h2}>7. Recht</h2>
    <p className={p}>Soweit gesetzlich zulässig gilt schweizerisches Recht. Zwingende Verbraucherschutzbestimmungen am gewöhnlichen Aufenthalt der nutzenden Person bleiben unberührt.</p>
  </>;
}
