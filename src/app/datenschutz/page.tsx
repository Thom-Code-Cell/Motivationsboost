
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function DatenschutzPage() {
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
            <CardTitle className="text-3xl">Datenschutzerklärung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 prose prose-neutral dark:prose-invert max-w-none">
                <p className="text-sm text-muted-foreground">
                    Stand: 7. Juli 2024
                </p>
                <p>
                    Wir legen grossen Wert auf den Schutz Ihrer Daten. Diese Datenschutzerklärung informiert Sie darüber, welche personenbezogenen Daten bei der Nutzung der Anwendung <strong>„Bewerbung leicht gemacht mit AI“</strong> verarbeitet werden – und wie, warum und wo sie gespeichert werden.
                </p>
                <p>
                    Diese Datenschutzerklärung ist Bestandteil unserer <Link href="/agb" className="text-primary hover:underline">Allgemeinen Geschäftsbedingungen</Link>.
                </p>

                <h2>1. Verantwortliche Stelle</h2>
                <p>
                    <strong>Thomas Hullin</strong><br />
                    Oberriedstrasse 75<br />
                    3775 Lenk, Schweiz<br />
                    📧 E-Mail: <a href="mailto:thhullin@gmail.com" className="text-primary hover:underline">thhullin@gmail.com</a>
                </p>

                <h2>2. Welche Daten erfassen wir?</h2>
                <h3>a) Firebase Authentication</h3>
                <p>Zur Anmeldung verwenden wir Google Login. Dabei speichern wir:</p>
                <ul>
                    <li>Ihren Namen und Ihre E-Mail-Adresse</li>
                    <li>Ihre eindeutige Nutzer-ID (`uid`)</li>
                </ul>
                <p>Diese Daten sind notwendig, um Ihr Konto technisch zu verwalten.</p>

                <h3>b) App-Daten (gespeichert in Firestore)</h3>
                <p>Wir speichern ausschliesslich <strong>technisch notwendige Metadaten</strong>:</p>
                 <ul>
                    <li>Abo-Status (z.B. „Free“, „Pro“) inkl. Stripe-ID</li>
                    <li>Einstellungen wie Sprache oder Stilprobe</li>
                    <li>Fortschritt Ihrer Bewerbungserstellung</li>
                    <li>Optional: Trust-Level (verhaltensbasiert)</li>
                </ul>
                <p>Wir speichern <strong>keine Inhalte oder Bewerbungsdokumente</strong> in der Datenbank.</p>

                <h3>c) Dokumente (Google Drive Integration)</h3>
                <p>Alle hochgeladenen Dokumente und von der KI generierten Lebensläufe, Anschreiben etc. werden <strong>ausschliesslich in Ihrem privaten Google Drive gespeichert</strong> – in einem automatisch erstellten Ordner namens:</p>
                <blockquote className="border-l-4 border-primary pl-4 italic">
                    <p className="font-semibold">🗂️ „Bewerbungsunterlagen AI“</p>
                </blockquote>
                <p>✅ Nur Sie haben Zugriff darauf.<br/>
                   Die App verarbeitet freigegebene Dateien serverseitig für Import und KI-Analyse.
                </p>

                <h3>d) Stripe Zahlungsabwicklung</h3>
                <p>Bei Abschluss eines kostenpflichtigen Abos werden Zahlungsdaten wie Kreditkartennummer <strong>ausschliesslich</strong> von unserem Partner <strong>Stripe, Inc.</strong> verarbeitet. Wir speichern keine sensiblen Zahlungsinformationen. Wir erhalten nur:</p>
                <ul>
                    <li>Zahlungsstatus</li>
                    <li>Abrechnungszeitraum</li>
                    <li>Stripe-Kundennummer</li>
                </ul>

                <h3>e) KI-Funktion (OpenAI API)</h3>
                <p>Für die angeforderte KI-Unterstützung übermitteln wir die erforderlichen Nutzereingaben, etwa Stellenbeschreibungen, Lebenslauf- und Zeugnisinhalte sowie persönliche Beispiele, serverseitig an OpenAI (GPT). Textanfragen werden mit der API-Einstellung <code>store: false</code> gestellt. Die weiteren Verarbeitungsbedingungen richten sich nach dem API-Vertrag und dem anwendbaren Datenschutzrecht. Vor der Nutzung mit echten Personendaten müssen die Datenschutzinformationen und Vertragsbedingungen geprüft werden. Die KI-Bildbearbeitung ist standardmässig ausgeschaltet.</p>

                <h2>3. Ihre Rechte</h2>
                <p>Sie haben jederzeit das Recht auf:</p>
                <ul>
                    <li>Auskunft über gespeicherte Daten</li>
                    <li>Berichtigung unrichtiger Daten</li>
                    <li>Löschung nicht mehr benötigter Daten</li>
                    <li>Einschränkung der Verarbeitung</li>
                </ul>
                <p>Wenden Sie sich hierfür bitte an:<br/>
                📧 <a href="mailto:thhullin@gmail.com" className="text-primary hover:underline">thhullin@gmail.com</a></p>

                <h2>4. Cookies und Tracking</h2>
                <p>Wir respektieren Ihre Privatsphäre. Die App verwendet <strong>keine Marketing-Cookies, keine Analyse-Tools (wie z.B. Google Analytics) und keine Tracking-Technologien von Drittanbietern</strong>. Es werden nur technisch notwendige Cookies zur Sicherstellung der Login-Funktionalität verwendet.</p>

                <h2>5. Änderungen dieser Datenschutzerklärung</h2>
                <p>Wir behalten uns vor, diese Erklärung bei rechtlicher oder technischer Notwendigkeit anzupassen. Es gilt die jeweils aktuelle Version unter <Link href="/datenschutz" className="text-primary hover:underline">/datenschutz</Link>.</p>
            </CardContent>
        </Card>
       </main>
    </div>
  );
}
