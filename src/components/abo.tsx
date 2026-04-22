
"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, LogIn, AlertTriangle, Loader2, XCircle, Star, Copy, Gift, Check } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { Badge } from "./ui/badge";
import type { UserData } from "@/types/user";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Input } from "./ui/core-input";
import { Label } from "./ui/label";

const proPlanPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID;

const starterFeatures = {
  included: [
    "1 Lebenslauf aus Zeugnissen (mit Wasserzeichen)",
    "2 Motivationsschreiben generieren",
    "Eingeschränkter ATS-Score (nur %-Zahl)",
  ],
  notIncluded: [
    "Unbegrenzt Lebensläufe & Motivationsschreiben",
    "Alle visuellen CV-Templates & Stile",
    "Vollständige ATS-Analyse mit Keyword-Matching",
    "KI-Optimierung auf Knopfdruck",
    "KI-Interview-Coach zur Vorbereitung",
    "PDF/Word-Export ohne Wasserzeichen",
  ]
};

const proFeatures = [
    "Unbegrenzt Lebensläufe & Motivationsschreiben",
    "Alle visuellen CV-Templates & Stile",
    "Vollständige ATS-Analyse mit Keyword-Matching",
    "KI-Optimierung auf Knopfdruck",
    "KI-Interview-Coach zur Vorbereitung",
    "Lückenfüller mit diplomatischen Textvorschlägen",
    "PDF/Word-Export ohne Wasserzeichen",
    "Priorisierter E-Mail-Support",
];

interface AboProps {
  user: User | null;
  userData: UserData | null;
  isAuthLoading: boolean;
}

export function Abo({ user, userData, isAuthLoading }: AboProps) {
  const { toast } = useToast();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const isAuthAvailable = !!auth;

  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const isStripeConfigured =
    typeof proPlanPriceId === 'string' && proPlanPriceId.startsWith('price_') &&
    typeof pk === 'string' && pk.startsWith('pk_');

  const handleCheckout = async () => {
    if (!user || !proPlanPriceId) return;
    setIsCheckoutLoading(true);

    try {
      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            priceId: proPlanPriceId, 
            userId: user.uid,
            referralCode: referralCode || undefined
        }),
      });
      
      const session = await response.json();

      if (!response.ok) {
        throw new Error(session.error || 'Fehler beim Erstellen der Checkout-Sitzung.');
      }
      
      window.location.href = session.url;

    } catch (error) {
      toast({
        title: "Fehler beim Checkout",
        description: error instanceof Error ? error.message : "Der Bezahlvorgang konnte nicht gestartet werden.",
        variant: "destructive",
      });
      setIsCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    setIsPortalLoading(true);
    try {
        const response = await fetch('/api/stripe/create-portal-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Fehler beim Öffnen des Portals.');
        }
        const { url } = await response.json();
        window.location.href = url;
    } catch (error) {
        toast({
            title: "Fehler",
            description: error instanceof Error ? error.message : "Das Kundenportal konnte nicht geöffnet werden.",
            variant: "destructive",
        });
        setIsPortalLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (!userData?.referralCode) return;
    navigator.clipboard.writeText(userData.referralCode);
    setIsCopied(true);
    toast({
        title: 'Kopiert!',
        description: 'Dein Empfehlungscode wurde in die Zwischenablage kopiert.'
    });
    setTimeout(() => setIsCopied(false), 2000);
  }
  
  if (!userData) {
      return (
        <Card>
            <CardHeader className="text-center">
                 <CardTitle>Wählen Sie den perfekten Plan für Ihren Erfolg</CardTitle>
                 <CardDescription>Pläne werden geladen...</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
      );
  }

  const isProActive = userData.subscriptionStatus === 'active';
  const isCanceled = userData.subscriptionStatus === 'canceled';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Wählen Sie den perfekten Plan für Ihren Erfolg</CardTitle>
          <CardDescription>Starten Sie kostenlos oder schalten Sie mit unserem Pro-Plan die volle KI-Power frei.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6 items-start">
          {!isStripeConfigured && (
            <div className="md:col-span-2">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Stripe-Konfiguration unvollständig oder ungültig</AlertTitle>
                <AlertDescription>
                    <p>Die Bezahlfunktionen sind derzeit deaktiviert. Um sie zu nutzen, müssen Sie Ihre Stripe-Schlüssel und die Preis-ID in der <strong>.env</strong>-Datei korrekt hinterlegen.</p>
                    <div className="mt-2 rounded-md bg-destructive/10 p-3 font-mono text-xs text-destructive-foreground/90">
                      <p>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...</p>
                      <p>STRIPE_SECRET_KEY=sk_test_...</p>
                      <p>NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_...</p>
                      <p>STRIPE_WEBHOOK_SECRET=whsec_...</p>
                    </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <Card className={`flex flex-col`}>
            <CardHeader>
              <CardTitle>Starter</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">Kostenlos</span>
                <span className="text-muted-foreground">Für die ersten Schritte</span>
              </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <ul className="space-y-3">
                {starterFeatures.included.map((feature, i) => (
                  <li key={`inc-${i}`} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
                 {starterFeatures.notIncluded.map((feature, i) => (
                  <li key={`not-inc-${i}`} className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground/50">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {user ? (
                <Button className="w-full" variant="outline" disabled={isProActive || isCanceled}>
                  Aktueller Plan
                </Button>
              ) : (
                <Button className="w-full" variant="outline" disabled={isAuthLoading || !isAuthAvailable}>
                  <LogIn className="mr-2 h-4 w-4" />
                   Mit Google starten
                </Button>
              )}
            </CardFooter>
          </Card>

          <Card className={`flex flex-col border-primary shadow-lg`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-yellow-400 fill-current" /> Pro Plan</CardTitle>
                 {(isProActive || isCanceled) && <Badge variant={isCanceled ? "destructive" : "default"}>Pro Plan</Badge>}
              </div>
               <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">CHF 39.–</span>
                <span className="text-muted-foreground">/ Monat</span>
              </div>
               {(isProActive || isCanceled) && userData.activeUntil && (
                  <CardDescription className="pt-2 !mt-2 text-center border-t">
                      {isCanceled 
                          ? `Ihr Zugang ist bis zum ${format(new Date(userData.activeUntil), 'dd. MMMM yyyy', {locale: de})} aktiv.`
                          : `Nächste Verlängerung am ${format(new Date(userData.activeUntil), 'dd. MMMM yyyy', {locale: de})}.`
                      }
                  </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <ul className="space-y-3">
                {proFeatures.map((feature, i) => (
                  <li key={`pro-${i}`} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex-col gap-4 items-stretch">
                {!isProActive && !isCanceled && (
                    <div className="space-y-2">
                        <Label htmlFor="referral">Empfehlungscode (optional)</Label>
                        <Input id="referral" placeholder="CODE123" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
                    </div>
                )}
               {isProActive || isCanceled ? (
                   <Button 
                      className="w-full" 
                      onClick={handleManageSubscription}
                      disabled={isPortalLoading}
                   >
                      {isPortalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Abonnement verwalten
                  </Button>
               ) : (
                  <Button 
                      className="w-full" 
                      onClick={handleCheckout}
                      disabled={!isStripeConfigured || !user || isCheckoutLoading}
                  >
                      {isCheckoutLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Jetzt upgraden
                  </Button>
               )}
            </CardFooter>
          </Card>
        </CardContent>
      </Card>
      
      {user && userData.referralCode && (
        <Card className="bg-secondary/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gift className="text-primary"/> Freunde werben & profitieren</CardTitle>
                <CardDescription>Teile deinen persönlichen Empfehlungscode. Wenn sich ein Freund damit für den Pro-Plan anmeldet, erhält er 25% Rabatt auf den ersten Monat und du erhältst eine Gutschrift für deine nächste Rechnung!</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex flex-col sm:flex-row gap-2">
                    <Input readOnly value={userData.referralCode} className="font-mono text-center sm:text-left bg-background"/>
                    <Button onClick={copyReferralCode} className="w-full sm:w-auto">
                        {isCopied ? <Check className="mr-2 h-4 w-4 text-green-400" /> : <Copy className="mr-2 h-4 w-4"/>}
                        {isCopied ? 'Kopiert!' : 'Kopieren'}
                    </Button>
                </div>
            </CardContent>
        </Card>
      )}

    </div>
  );
}
