
"use client"

import { Button } from "@/components/ui/button";

interface CtaSectionProps {
  onCtaClick: () => void;
}

export function CtaSection({ onCtaClick }: CtaSectionProps) {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">Bereit, den nächsten Schritt zu wagen?</h2>
          <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Hören Sie auf, Stunden mit dem Schreiben von Bewerbungen zu verbringen. Lassen Sie unsere KI die Arbeit machen und konzentrieren Sie sich auf das, was wirklich zählt: Ihre Stärken im Interview zu zeigen.
          </p>
        </div>
        <div className="mx-auto w-full max-w-sm space-y-2">
          <Button size="lg" className="w-full" onClick={onCtaClick}>
            Jetzt kostenlos starten
          </Button>
           <p className="text-xs text-muted-foreground">
             Keine Kreditkarte erforderlich. Starten Sie sofort mit dem kostenlosen Plan.
           </p>
        </div>
      </div>
    </section>
  );
}
