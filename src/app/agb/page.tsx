
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function AGBPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
       <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href="/" className="font-headline text-xl font-bold tracking-tight text-foreground">
            Bewerbung leicht gemacht mit AI
        </Link>
       </header>
       <main className="flex-1 p-4 sm:p-6 md:p-8">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">Allgemeine Geschäftsbedingungen (AGB)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-sm text-muted-foreground">Stand: 7. Juli 2024</p>
            <p>Diese Allgemeinen Geschäftsbedingungen regeln das Verhältnis zwischen <strong>Thomas Hullin</strong>, Oberriedstrasse 75, 3775 Lenk, Schweiz (nachfolgend „Anbieter“) und Ihnen als Nutzer der Webanwendung <strong>„Bewerbung leicht gemacht mit AI“</strong>.</p>
            
            <h2>1. Geltungsbereich</h2>
            <p>Diese AGB gelten für alle Funktionen, Dienste und Inhalte, die im Rahmen der Web-App „Bewerbung leicht gemacht mit AI“ bereitgestellt werden.</p>
            
            <h2>2. Leistungsbeschreibung</h2>
            <p>Die App bietet eine KI-gestützte Assistenz zur Erstellung und Optimierung von Bewerbungsunterlagen. Funktionen umfassen unter anderem:</p>
            <ul className="list-disc pl-6 space-y-1">
                <li>Analyse von Zeugnissen und Dokumenten</li>
                <li>Generierung von Lebenslauf & Motivationsschreiben</li>
                <li>Interviewvorbereitung</li>
                <li>Stilbasierte Textoptimierung</li>
                <li>LinkedIn-Optimierung</li>
            </ul>
            <p>Die genaue Funktionsübersicht und Unterschiede zwischen dem kostenlosen („Starter“) und kostenpflichtigen („Pro“) Plan sind auf der Abo-Seite dargestellt.</p>
            
            <h2>3. Registrierung &amp; Zugang</h2>
            <p>Für die Nutzung ist eine Anmeldung über ein Google-Konto erforderlich. Mit Registrierung erkennen Sie diese AGB an.</p>
            
            <h2>4. Preise &amp; Abonnements</h2>
            <p>Die Nutzung des Pro-Plans ist kostenpflichtig (aktuell CHF 39.–/Monat).</p>
            <p>Die Zahlung erfolgt über unseren Partner <strong>Stripe, Inc.</strong>, welcher auch die Zahlungsdaten verarbeitet.</p>
            <p>Das Abonnement verlängert sich automatisch, sofern es nicht gekündigt wird.</p>
            
            <h2>5. Kündigung &amp; Rückerstattung</h2>
            <p>Sie können Ihr Abonnement jederzeit zum Ende des aktuellen Abrechnungszeitraums kündigen. Die Kündigung muss direkt in Ihrem Stripe-Kundenportal erfolgen, auf das Sie über die App zugreifen können.</p>
            <p>Eine Rückerstattung bereits gezahlter Beiträge erfolgt <strong>nicht</strong>, ausser es liegt ein gesetzlicher Rückerstattungsanspruch vor.</p>
            
            <h2>6. Haftung &amp; Gewährleistung</h2>
            <p>Die App versteht sich als Werkzeug zur Bewerbungserstellung. Der Anbieter garantiert nicht:</p>
            <ul className="list-disc pl-6 space-y-1">
                <li>die Richtigkeit aller KI-generierten Inhalte</li>
                <li>eine erfolgreiche Bewerbung oder Stellenzusage</li>
            </ul>
            <p>
                <strong>Wichtiger Hinweis zur KI-Nutzung:</strong> Die von der künstlichen Intelligenz (KI) generierten Texte und Analysen sind Vorschläge. Die KI kann Fehler machen, Informationen falsch interpretieren oder veraltete Daten verwenden. Sie sind als Nutzer verpflichtet, alle von der KI erstellten Inhalte (insbesondere Daten, Namen und Fakten) sorgfältig zu prüfen und vor der Verwendung zu korrigieren. Die endgültige Verantwortung für die Richtigkeit und den Inhalt Ihrer Bewerbungsunterlagen liegt bei Ihnen.
            </p>
            <p>Jegliche Haftung seitens des Anbieters wird, soweit gesetzlich zulässig, vollumfänglich ausgeschlossen. Die Nutzung des Dienstes und die Verwendung der generierten Inhalte erfolgen ausschliesslich auf eigene Gefahr und Verantwortung des Nutzers.</p>
            
            <h2>7. Datenschutz</h2>
            <p>Der Umgang mit personenbezogenen Daten richtet sich nach der <Link href="/datenschutz" className="text-primary hover:underline">Datenschutzerklärung</Link>, die integraler Bestandteil dieser AGB ist.</p>
            
            <h2>8. Änderungen &amp; Verfügbarkeit</h2>
            <p>Der Anbieter behält sich vor, diese AGB bei Bedarf anzupassen. Bei wesentlichen Änderungen werden registrierte Nutzer informiert. Die jeweils aktuelle Version ist jederzeit in der App abrufbar.</p>
            <p>Die Verfügbarkeit der App wird angestrebt, es besteht jedoch <strong>kein Anspruch auf permanente oder fehlerfreie Verfügbarkeit</strong>.</p>
            
            <h2>9. Anwendbares Recht &amp; Gerichtsstand</h2>
            <p>Es gilt ausschliesslich <strong>schweizerisches Recht</strong>.</p>
            <p>Gerichtsstand ist <strong>Lenk im Simmental</strong>, soweit gesetzlich zulässig.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
