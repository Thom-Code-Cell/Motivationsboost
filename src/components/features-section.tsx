
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquareQuote, Linkedin, Bot, Search, Mail, Camera } from 'lucide-react';

const features = [
  {
    icon: <FileText className="h-8 w-8 text-primary" />,
    title: "KI-gestützte Dokumentenerstellung",
    description: "Generieren Sie aus Ihren Zeugnissen automatisch einen perfekten Lebenslauf und überzeugende Motivationsschreiben.",
  },
  {
    icon: <MessageSquareQuote className="h-8 w-8 text-primary" />,
    title: "ATS-Analyse & Optimierung",
    description: "Lassen Sie Ihre Unterlagen wie von einem Bewerber-System prüfen und optimieren Sie sie für maximale Kompatibilität.",
  },
   {
    icon: <Camera className="h-8 w-8 text-primary" />,
    title: "KI-Bewerbungsfoto Studio",
    description: "Verwandeln Sie ein einfaches Foto in ein professionelles Bewerbungsfoto – mit perfekter Kleidung, Hintergrund und Licht.",
  },
  {
    icon: <Bot className="h-8 w-8 text-primary" />,
    title: "Interaktiver Interview-Coach",
    description: "Üben Sie realistische Interviewfragen mit unserer KI, nehmen Sie Ihre Antworten auf und erhalten Sie direktes Feedback.",
  },
  {
    icon: <Linkedin className="h-8 w-8 text-primary" />,
    title: "LinkedIn-Profil-Booster",
    description: "Erstellen Sie eine professionelle und authentische Zusammenfassung für Ihr LinkedIn-Profil auf Knopfdruck.",
  },
  {
    icon: <Mail className="h-8 w-8 text-primary" />,
    title: "Intelligente E-Mail-Vorlagen",
    description: "Generieren Sie professionelle E-Mails für jede Situation: Nachfassen, Danksagung oder die Antwort auf eine Absage.",
  },
];

export function FeaturesSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Kernfunktionen</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Alles, was Sie für Ihren Erfolg brauchen</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Unsere All-in-One-Plattform begleitet Sie von der ersten Zeile Ihres Lebenslaufs bis zur finalen Gehaltsverhandlung.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:grid-cols-3 lg:gap-12 mt-12">
          {features.map((feature, index) => (
            <Card key={index} className="shadow-lg flex flex-col">
              <CardHeader className="flex flex-col items-center text-center">
                {feature.icon}
                <CardTitle className="mt-4 text-xl flex items-center min-h-[56px]">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground flex-grow">
                {feature.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
