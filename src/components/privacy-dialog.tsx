"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { acceptPrivacyPolicy } from "@/services/user";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface PrivacyDialogProps {
  open: boolean;
  user: User;
  currentVersion: string;
  onAccept: () => void;
}

export function PrivacyDialog({ open, user, currentVersion, onAccept }: PrivacyDialogProps) {
  const { toast } = useToast();
  const [isScrolledToEnd, setIsScrolledToEnd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 1) {
      setIsScrolledToEnd(true);
    }
  };

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await acceptPrivacyPolicy(user.uid, currentVersion);
      toast({
        title: "Vielen Dank!",
        description: "Sie haben die aktuelle Datenschutzerklärung akzeptiert.",
      });
      onAccept();
    } catch (error) {
      console.error("Failed to accept Privacy Policy", error);
      toast({
        title: "Fehler",
        description: "Die Zustimmung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Unsere Datenschutzerklärung wurde aktualisiert</DialogTitle>
          <DialogDescription>
            Bitte lesen und akzeptieren Sie die aktualisierte Datenschutzerklärung, um die App weiterhin nutzen zu können.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4">
          <ScrollArea className="h-[35dvh] sm:h-80 rounded-md border p-4" onScroll={handleScroll}>
            <div className="space-y-4 prose prose-sm prose-neutral dark:prose-invert max-w-none">
                <p className="text-sm text-muted-foreground">
                    Stand: 7. Juli 2024
                </p>
                <p>
                    Wir legen grossen Wert auf den Schutz Ihrer Daten. Diese Datenschutzerklärung informiert Sie darüber, welche personenbezogenen Daten bei der Nutzung der Anwendung <strong>„Bewerbung leicht gemacht mit AI“</strong> verarbeitet werden – und wie, warum und wo sie gespeichert werden.
                </p>
                <p>
                    Diese Datenschutzerklärung ist Bestandteil unserer <Link href="/agb" className="text-primary hover:underline" target="_blank">Allgemeinen Geschäftsbedingungen</Link>.
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
                <blockquote>
                    <p>🗂️ <strong>„Bewerbungsunterlagen AI“</strong></p>
                </blockquote>
                <p>✅ Nur Sie haben Zugriff darauf.<br/>
                   Die App verarbeitet die von Ihnen freigegebenen Dateien serverseitig für Import und KI-Analyse. Der Drive-Zugriff ist auf von der App angelegte oder von Ihnen ausgewählte Dateien beschränkt.
                </p>

                <h3>d) Stripe Zahlungsabwicklung</h3>
                <p>Bei Abschluss eines kostenpflichtigen Abos werden Zahlungsdaten wie Kreditkartennummer <strong>ausschliesslich</strong> von unserem Partner <strong>Stripe, Inc.</strong> verarbeitet. Wir speichern keine sensiblen Zahlungsinformationen. Wir erhalten nur:</p>
                <ul>
                    <li>Zahlungsstatus</li>
                    <li>Abrechnungszeitraum</li>
                    <li>Stripe-Kundennummer</li>
                </ul>

                <h3>e) KI-Funktion (Google Gemini)</h3>
                <p>Die App nutzt <strong>Google Gemini</strong> zur Analyse, Optimierung und Generierung Ihrer Bewerbungsunterlagen. Die Verarbeitung erfolgt temporär über Google-Server. Eingaben werden an Google Gemini übermittelt. Die dort geltenden Datenbedingungen hängen vom eingerichteten API-Angebot ab. Die Freigabe für echte Bewerbungsunterlagen erfolgt erst nach Prüfung der produktiven Konfiguration.</p>

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
                <p>Die App verwendet <strong>keine Cookies, keine Tracker und keine Analyse-Tools</strong>.</p>

                <h2>5. Änderungen dieser Datenschutzerklärung</h2>
                <p>Wir behalten uns vor, diese Erklärung bei rechtlicher oder technischer Notwendigkeit anzupassen. Es gilt die jeweils aktuelle Version unter <Link href="/datenschutz" className="underline hover:text-primary" target="_blank">/datenschutz</Link>.</p>
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button onClick={handleAccept} disabled={!isScrolledToEnd || isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isScrolledToEnd ? "Ich habe die Datenschutzerklärung gelesen und akzeptiere sie" : "Bitte bis zum Ende scrollen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
