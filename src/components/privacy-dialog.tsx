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
import { LegalContent } from "@/components/legal-content";

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
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[90dvh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Unsere Datenschutzerklärung wurde aktualisiert</DialogTitle>
          <DialogDescription>
            Bitte lesen und akzeptieren Sie die aktualisierte Datenschutzerklärung, um die App weiterhin nutzen zu können.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4">
          <ScrollArea className="h-[35dvh] sm:h-80 rounded-md border p-4" onScroll={handleScroll}>
            <div className="min-w-0 space-y-2 break-words text-sm leading-relaxed">
              <LegalContent document="datenschutz" />
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
