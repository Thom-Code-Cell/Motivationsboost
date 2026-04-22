
"use client";

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { GenerateCvFromDocumentsOutput, Language } from '@/ai/schemas';
import { generateLinkedInSummary } from '@/ai/flows/generateLinkedInSummary';
import { saveFileToDrive } from '@/services/drive';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/core-textarea';
import { Copy, ExternalLink, LinkedinIcon, Info, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LanguageSelect } from './language-select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface LinkedinBoosterProps {
    user: User | null;
    accessToken: string | null;
    linkedinSummary: string | null;
    cvJson: GenerateCvFromDocumentsOutput | null;
    userStyleSample: string;
    language: Language;
    onSummaryUpdated: (summary: string | null) => void;
}

export function LinkedinBooster({ user, accessToken, linkedinSummary, cvJson, userStyleSample, language: initialLanguage, onSummaryUpdated }: LinkedinBoosterProps) {
  const { toast } = useToast();
  const [editedSummary, setEditedSummary] = useState(linkedinSummary || '');
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    setEditedSummary(linkedinSummary || '');
  }, [linkedinSummary]);
  
  useEffect(() => {
    setLanguage(initialLanguage);
  }, [initialLanguage]);


  const copyToClipboard = () => {
    if (!editedSummary) return;
    navigator.clipboard.writeText(editedSummary);
    toast({ title: 'Kopiert!', description: `Die Zusammenfassung wurde in die Zwischenablage kopiert.` });
  };

  const handleRegenerate = async () => {
      if (!user || !cvJson || !accessToken) {
          toast({ title: "Fehler", description: "CV-Daten oder Zugriffstoken nicht gefunden. Bitte generieren Sie zuerst einen Lebenslauf.", variant: "destructive"});
          return;
      }
      setIsRegenerating(true);
      try {
        const result = await generateLinkedInSummary({
            cvData: cvJson,
            userStyleSample: userStyleSample || undefined,
            language: language,
        });
        await saveFileToDrive(accessToken, 'linkedin_summary.txt', result.linkedinSummary, 'text/plain');
        onSummaryUpdated(result.linkedinSummary);
        setEditedSummary(result.linkedinSummary);
        toast({ title: "Neu generiert!", description: `Ihre LinkedIn-Zusammenfassung wurde auf ${language === 'en' ? 'Englisch' : language === 'fr' ? 'Französisch' : language === 'it' ? 'Italienisch' : 'Deutsch'} aktualisiert.`});
      } catch (error) {
          console.error("Error regenerating LinkedIn summary", error);
          toast({ title: "Fehler", description: "Zusammenfassung konnte nicht neu generiert werden.", variant: "destructive"});
      } finally {
          setIsRegenerating(false);
      }
  };


  if (!user) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>🔗 LinkedIn-Booster</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Bitte melden Sie sich an, um Ihr LinkedIn-Profil zu optimieren.</p>
            </CardContent>
        </Card>
    );
  }

  if (!linkedinSummary && !cvJson) {
     return (
        <Card>
            <CardHeader>
                <CardTitle>🔗 LinkedIn-Booster</CardTitle>
                 <CardDescription>
                  Erstellen Sie zuerst einen Lebenslauf im "CV-Generator"-Tab. Wenn die Automatisierung in "Mein Stil" aktiv ist, erscheint Ihr Vorschlag hier automatisch.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center p-10 gap-4 border-2 border-dashed m-6 rounded-lg">
                <LinkedinIcon className="w-16 h-16 text-muted-foreground" />
                <p className="text-muted-foreground">Ihr optimiertes LinkedIn-Profil wartet hier auf Sie.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ihr LinkedIn-Profilvorschlag</CardTitle>
            <CardDescription>
              Dieser Text wurde für Sie erstellt. Sie können ihn hier bearbeiten, anpassen oder in einer anderen Sprache neu generieren. Ihre Änderungen werden automatisch in Ihrem Google Drive gespeichert.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              onBlur={() => {
                if (accessToken && editedSummary !== linkedinSummary) {
                  saveFileToDrive(accessToken, 'linkedin_summary.txt', editedSummary, 'text/plain');
                  onSummaryUpdated(editedSummary);
                  toast({ title: "Gespeichert", description: "Ihre Änderungen wurden in Google Drive gesichert."})
                }
              }}
              className="min-h-[400px] text-base"
              placeholder="Ihr LinkedIn-Text..."
            />
          </CardContent>
           <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-full sm:w-48">
                    <LanguageSelect onValueChange={setLanguage} defaultValue={language} />
                </div>
                <Button onClick={handleRegenerate} disabled={isRegenerating || !cvJson}>
                    {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>}
                    Neu generieren
                </Button>
           </CardFooter>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Anleitung & Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={copyToClipboard} className="w-full">
              <Copy className="mr-2 h-4 w-4" /> Text kopieren
            </Button>
            <Button variant="outline" asChild className="w-full">
              <a href="https://www.linkedin.com/in/me/edit/intro/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> LinkedIn öffnen
              </a>
            </Button>
             <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="help" className="border-none">
                    <AccordionTrigger className="text-base font-semibold hover:no-underline p-0 justify-start gap-3">
                        <div className="flex items-center gap-2">
                           <Info className="h-4 w-4" />
                           <span>So fügst du den Text ein</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                       <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mt-2 pl-1">
                          <li>Kopieren Sie den oben generierten Text.</li>
                          <li>Öffnen Sie Ihr LinkedIn-Profil.</li>
                          <li>Klicken Sie unter Ihrem Namen auf den Stift, um das Profil zu bearbeiten.</li>
                          <li>Scrollen Sie nach unten zur "Info"-Sektion (Zusammenfassung).</li>
                          <li>Fügen Sie den kopierten Text ein und speichern Sie die Änderungen.</li>
                       </ol>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
          </CardContent>
           <CardFooter>
                <p className="text-xs text-muted-foreground">
                    Die Textdatei können Sie zentral im "Export"-Tab herunterladen.
                </p>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
