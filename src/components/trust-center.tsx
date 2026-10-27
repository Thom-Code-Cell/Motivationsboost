
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShieldCheck, Database, Bot, Contact, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export function TrustCenter() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hilfe, Vertrauen & Transparenz</CardTitle>
        <CardDescription>
          Wir verstehen, dass Bewerbungsdaten sensibel sind. Hier erklären wir Ihnen transparent, wie wir mit Ihren Daten umgehen und wie unsere KI für Sie arbeitet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible defaultValue="item-1" className="w-full">

          <AccordionItem value="item-1">
            <AccordionTrigger className="text-lg">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary"/>
                <span>Wer hat Zugriff auf meine Daten?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-base text-muted-foreground pl-10">
              Die Datenspeicherung ist aufgeteilt: Ihre App-Einstellungen (z.B. gewählte Sprache, Abo-Status) werden sicher in unserer Datenbank (Firestore) gespeichert. Alle Ihre persönlichen und generierten Dokumente (Lebensläufe, Anschreiben, Zeugnisse) liegen ausschliesslich in Ihrem persönlichen Google Drive. Die App verarbeitet die von Ihnen freigegebenen Dateien serverseitig für Import und KI-Funktionen. Der Drive-Zugriff ist auf von der App angelegte oder von Ihnen ausgewählte Dateien beschränkt.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger className="text-lg">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary"/>
                <span>Wo werden meine hochgeladenen Dokumente gespeichert?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-base text-muted-foreground pl-10">
              Wenn Sie Dokumente wie Zeugnisse oder Diplome scannen oder importieren, werden diese ausschließlich in **Ihrem eigenen Google Drive** gespeichert. Wir legen dafür einen speziellen Ordner namens `Bewerbungsunterlagen AI` an. Der Drive-Zugriff umfasst Dateien, die diese App anlegt oder die Sie über die Dateiauswahl freigeben. Sie können die Freigabe in Ihrem Google-Konto widerrufen.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger className="text-lg">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-primary"/>
                <span>Wie wird die KI (OpenAI GPT) genutzt?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-base text-muted-foreground pl-10 space-y-2">
              <p>Unsere App nutzt die fortschrittlichen Sprachmodelle von Google (Gemini), um hochwertige Texte für Sie zu erstellen. Wenn Sie eine Funktion nutzen, senden wir Ihre Eingaben (z.B. den Job-Link, Ihren CV-Text) an die KI.</p>
              <p>Die KI analysiert diese Informationen und generiert basierend darauf die gewünschte Ausgabe (z.B. ein Motivationsschreiben oder Interviewfragen). Ihre persönlichen Stilproben helfen der KI, einen Text zu verfassen, der authentisch nach Ihnen klingt.</p>
              <p><strong>Wichtig:</strong> Ihre Eingaben können personenbezogene Daten enthalten. Die Verarbeitung, Aufbewahrung und mögliche Modellnutzung richten sich nach dem verwendeten Google-Dienst und seinen Vertragsbedingungen. Diese Bedingungen müssen vor der Veröffentlichung für die konkrete Dienstkonfiguration geprüft werden.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger className="text-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-primary"/>
                <span>Wie zuverlässig ist die KI?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-base text-muted-foreground pl-10">
                Die KI ist ein sehr leistungsfähiger Assistent, aber sie ist nicht unfehlbar. Sie kann Fakten missverstehen, Daten falsch interpretieren oder Informationen "halluzinieren" (erfinden).
                <br/><br/>
                <strong>Prüfen Sie daher bitte unbedingt alle von der KI generierten Inhalte (insbesondere Daten, Namen und Fakten in Lebensläufen und Anschreiben) sorgfältig auf Richtigkeit und Vollständigkeit, bevor Sie diese verwenden.</strong> Sie tragen die endgültige Verantwortung für Ihre Bewerbungsunterlagen.
            </AccordionContent>
          </AccordionItem>

           <AccordionItem value="item-5">
            <AccordionTrigger className="text-lg">
              <div className="flex items-center gap-3">
                <Contact className="h-5 w-5 text-primary"/>
                <span>Wie kann ich meine Daten einsehen (Auskunftsrecht)?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-base text-muted-foreground pl-10">
              Sie haben jederzeit das Recht, eine Auskunft über die von Ihnen gespeicherten Daten zu verlangen. Senden Sie hierfür bitte eine formlose Anfrage an die im <Link href="/impressum" className="underline hover:text-primary">Impressum</Link> angegebene E-Mail-Adresse. Wir werden Ihnen Ihre Daten exportieren und zur Verfügung stellen.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-6" className="border-b-0">
            <AccordionTrigger className="text-lg">
              <div className="flex items-center gap-3">
                <Trash2 className="h-5 w-5 text-primary"/>
                <span>Wie kann ich meine Daten löschen?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-base text-muted-foreground pl-10">
               Sie können die Löschung Ihres gesamten Kontos und aller zugehörigen Daten beauftragen. Senden Sie hierfür bitte eine E-Mail von der Adresse, mit der Sie sich registriert haben, an die im <Link href="/impressum" className="underline hover:text-primary">Impressum</Link> angegebene E-Mail-Adresse. Wir werden die Löschung nach einer kurzen Bestätigung umgehend vornehmen.
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </CardContent>
    </Card>
  );
}


