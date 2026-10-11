"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { acceptAgb } from "@/services/user";
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

interface AgbDialogProps {
  open: boolean;
  user: User;
  currentVersion: string;
  onAccept: () => void;
}

export function AgbDialog({ open, user, currentVersion, onAccept }: AgbDialogProps) {
  const { toast } = useToast();
  const [isScrolledToEnd, setIsScrolledToEnd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Add a small buffer to handle fractional pixels
    if (scrollHeight - scrollTop <= clientHeight + 1) {
      setIsScrolledToEnd(true);
    }
  };

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await acceptAgb(user.uid, currentVersion);
      toast({
        title: "Vielen Dank!",
        description: "Sie haben die aktuellen AGB akzeptiert.",
      });
      onAccept();
    } catch (error) {
      console.error("Failed to accept AGB", error);
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
          <DialogTitle className="text-2xl">Unsere Nutzungsbedingungen haben sich geändert</DialogTitle>
          <DialogDescription>
            Bitte lesen und akzeptieren Sie die aktualisierten Allgemeinen Geschäftsbedingungen (AGB), um die App weiterhin nutzen zu können.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4">
            <ScrollArea className="h-[35dvh] sm:h-80 rounded-md border p-4" onScroll={handleScroll}>
                 <div className="space-y-4 prose prose-sm prose-neutral dark:prose-invert max-w-none">
                    <p className="text-xs text-muted-foreground">Stand: 7. Juli 2024</p>
                    <p>Diese Allgemeinen Geschäftsbedingungen regeln das Verhältnis zwischen <strong>Thomas Hullin</strong>, Oberriedstrasse 75, 3775 Lenk, Schweiz (nachfolgend „Anbieter“) und Ihnen als Nutzer der Webanwendung <strong>„Bewerbung leicht gemacht mit AI“</strong>.</p>

                    <h2>1. Geltungsbereich</h2>
                    <p>Diese AGB gelten für alle Funktionen, Dienste und Inhalte, die im Rahmen der Web-App „Bewerbung leicht gemacht mit AI“ bereitgestellt werden.</p>

                    <h2>2. Leistungsbeschreibung</h2>
                    <p>Die App bietet eine KI-gestützte Assistenz zur Erstellung und Optimierung von Bewerbungsunterlagen. Funktionen umfassen unter anderem:</p>
                    <ul>
                        <li>Analyse von Zeugnissen und Dokumenten</li>
                        <li>Generierung von Lebenslauf &amp; Motivationsschreiben</li>
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
                    <p>Sie können Ihr Abo jederzeit zum Ende des aktuellen Abrechnungszeitraums kündigen – direkt in Ihrem Stripe-Konto oder durch E-Mail an den Anbieter.</p>
                    <p>Eine Rückerstattung bereits gezahlter Beiträge erfolgt <strong>nicht</strong>, ausser es liegt ein gesetzlicher Rückerstattungsanspruch vor.</p>

                    <h2>6. Haftung &amp; Gewährleistung</h2>
                    <p>Die App versteht sich als Werkzeug zur Bewerbungserstellung. Der Anbieter garantiert nicht:</p>
                    <ul>
                        <li>die Richtigkeit aller KI-generierten Inhalte</li>
                        <li>eine erfolgreiche Bewerbung oder Stellenzusage</li>
                    </ul>
                    <p>Der Anbieter haftet nur für Schäden, die durch grobe Fahrlässigkeit oder Vorsatz entstehen. Für Inhalte externer Links oder Partnerdienste (z.B. Google Drive, Stripe) übernimmt der Anbieter keine Haftung.</p>

                    <h2>7. Datenschutz</h2>
                    <p>Der Umgang mit personenbezogenen Daten richtet sich nach der <Link href="/datenschutz" className="text-primary hover:underline" target="_blank">Datenschutzerklärung</Link>, die integraler Bestandteil dieser AGB ist.</p>

                    <h2>8. Änderungen &amp; Verfügbarkeit</h2>
                    <p>Der Anbieter behält sich vor, diese AGB bei Bedarf anzupassen. Bei wesentlichen Änderungen werden registrierte Nutzer informiert. Die jeweils aktuelle Version ist jederzeit in der App abrufbar.</p>
                    <p>Die Verfügbarkeit der App wird angestrebt, es besteht jedoch <strong>kein Anspruch auf permanente oder fehlerfreie Verfügbarkeit</strong>.</p>

                    <h2>9. Anwendbares Recht &amp; Gerichtsstand</h2>
                    <p>Es gilt ausschliesslich <strong>schweizerisches Recht</strong>.</p>
                    <p>Gerichtsstand ist <strong>Lenk im Simmental</strong>, soweit gesetzlich zulässig.</p>
                </div>
            </ScrollArea>
        </div>
        <DialogFooter>
          <Button onClick={handleAccept} disabled={!isScrolledToEnd || isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isScrolledToEnd ? "Ich habe die AGB gelesen und akzeptiere sie" : "Bitte bis zum Ende scrollen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
