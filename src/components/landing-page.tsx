"use client"

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HeroSection } from '@/components/hero-section';
import { FeaturesSection } from '@/components/features-section';
import { HowItWorksSection } from '@/components/how-it-works-section';
import { CtaSection } from '@/components/cta-section';

export const LandingPage = ({ handleSignIn }: { handleSignIn: () => void }) => (
  <div className="flex flex-col min-h-dvh bg-background">
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <Link href="/" className="flex items-center gap-2 font-headline text-xl font-bold tracking-tight text-foreground">
        Motivationsboost
      </Link>
      <Button onClick={handleSignIn}>Anmelden</Button>
    </header>
    <main className="flex-1">
      <HeroSection className="py-20 md:py-32 lg:py-40">
        <div className="container px-4 text-center text-foreground">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline">
                Dein persönlicher Karriere- und Bewerbungsbegleiter
            </h1>
            <p className="mx-auto mt-6 max-w-[700px] text-lg md:text-xl">
                Erkenne deine beruflichen Stärken, bereite individuelle Bewerbungen vor und trainiere Vorstellungsgespräche. Du prüfst alle Vorschläge selbst.
            </p>
            <div className="mt-8">
                <Button size="lg" onClick={handleSignIn}>
                    Geschützte Anwendung öffnen
                </Button>
            </div>
        </div>
      </HeroSection>
      <FeaturesSection />
      <HowItWorksSection />

      <CtaSection onCtaClick={handleSignIn} />
    </main>
    <footer className="border-t py-6 px-4 md:px-6 bg-muted/40">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Motivationsboost. In Entwicklung.</p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                <Link href="/impressum" className="hover:text-primary transition-colors">Impressum</Link>
                <Link href="/datenschutz" className="hover:text-primary transition-colors">Datenschutz</Link>
                <Link href="/agb" className="hover:text-primary transition-colors">Nutzungsbedingungen</Link>
                <a href="https://th-analytica.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">TH Analytica</a>
            </div>
        </div>
    </footer>
  </div>
);
