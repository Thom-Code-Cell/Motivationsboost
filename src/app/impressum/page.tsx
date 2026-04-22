
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function ImpressumPage() {
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
            <CardTitle className="text-3xl">Impressum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-sm text-muted-foreground">Stand: 7. Juli 2024</p>
            <h2>Angaben gemäß Art. 3 Abs. 1 lit. s UWG</h2>
            <div>
                <p>Thomas Hullin</p>
                <p>Oberriedstrasse 75</p>
                <p>3775 Lenk</p>
                <p>Schweiz</p>
            </div>
            <h2>Kontakt</h2>
            <p>
                E-Mail: <a href="mailto:thhullin@gmail.com">thhullin@gmail.com</a>
            </p>
            <h2>Haftungsausschluss</h2>
            <p>
                Der Autor übernimmt keinerlei Gewähr hinsichtlich der inhaltlichen Richtigkeit, Genauigkeit, Aktualität, Zuverlässigkeit und Vollständigkeit der Informationen. Haftungsansprüche gegen den Autor wegen Schäden materieller oder immaterieller Art, welche aus dem Zugriff oder der Nutzung bzw. Nichtnutzung der veröffentlichten Informationen, durch Missbrauch der Verbindung oder durch technische Störungen entstanden sind, werden ausgeschlossen.
            </p>
             <h2>Haftung für Links</h2>
            <p>
                Verweise und Links auf Webseiten Dritter liegen ausserhalb unseres Verantwortungsbereichs. Es wird jegliche Verantwortung für solche Webseiten abgelehnt. Der Zugriff und die Nutzung solcher Webseiten erfolgen auf eigene Gefahr des Nutzers oder der Nutzerin.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
