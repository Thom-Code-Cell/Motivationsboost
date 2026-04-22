"use client";

import { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Gift, Loader2 } from "lucide-react";
import type { UserData } from "@/types/user";
import { updateUser } from '@/services/user';

// NOTE: This component is designed for a yearly upsell, but the prompt only requested a monthly plan.
// It will currently not be triggered unless a yearly price ID is set.
const proPlanYearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID;

interface UpsellPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  userData: UserData;
}

export function UpsellPrompt({ open, onOpenChange, user, userData }: UpsellPromptProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
    updateUser(user.uid, { upsellSuggested: false, conversionPotential: 50 }); // Reset potential
  };
  
  const handleCheckout = async () => {
    if (!proPlanYearlyPriceId) {
        toast({ title: "Fehler", description: "Jahresplan nicht konfiguriert.", variant: "destructive" });
        return;
    }
    setIsLoading(true);

    try {
      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            priceId: proPlanYearlyPriceId, 
            userId: user.uid,
        }),
      });

      if (!response.ok) throw new Error('Fehler beim Erstellen der Checkout-Session.');
      
      const session = await response.json();
      
      window.location.href = session.url;

    } catch (error) {
       toast({
        title: "Fehler beim Bezahlvorgang",
        description: error instanceof Error ? error.message : "Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
       setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onEscapeKeyDown={handleClose} onPointerDownOutside={handleClose}>
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">Ein exklusives Angebot für Power-Nutzer!</DialogTitle>
          <DialogDescription className="text-center">
            Uns ist aufgefallen, dass Sie unsere KI-Tools intensiv nutzen. Das ist grossartig!
            <br />
            Als Dankeschön möchten wir Ihnen ein besonderes Angebot machen.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 p-6 bg-secondary/50 rounded-lg text-center">
          <p className="text-lg">Wechseln Sie jetzt zum Jahresabo und sichern Sie sich die volle Power unserer Bewerbungs-KI für nur</p>
          <p className="text-4xl font-bold my-2">CHF 390.–</p>
          <Badge>Sie sparen CHF 78.– gegenüber dem Monatsabo!</Badge>

           {userData.variantGroup === 'bonus_upsell' && (
             <div className="flex items-center justify-center gap-2 mt-4 text-green-600">
                <Gift className="h-5 w-5"/>
                <span className="font-semibold">Bonus: PDF-Karrierebericht kostenlos dazu!</span>
             </div>
           )}
        </div>
        <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
          <Button onClick={handleCheckout} disabled={isLoading || !proPlanYearlyPriceId}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ja, ich möchte sparen!
          </Button>
          <Button variant="ghost" onClick={handleClose}>Vielleicht später</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
