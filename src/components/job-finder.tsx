
"use client";
import { LanguageSchema } from '@/ai/schemas';


import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod/v3';
import type { User } from 'firebase/auth';
import type { GenerateCvFromDocumentsOutput, SuggestJobOpportunitiesOutput, Language } from '@/ai/schemas';
import { suggestJobOpportunities } from '@/ai/flows/suggest-job-opportunities';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/core-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Info, Search, Send, Briefcase, Building, ExternalLink, Bot, Check, Copy } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import Link from 'next/link';
import { LanguageSelect } from './language-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/core-textarea';

const formSchema = z.object({
  location: z.string().min(3, { message: "Bitte geben Sie einen gültigen Ort ein." }),
  language: LanguageSchema,
});

interface JobFinderProps {
  user: User | null;
  cvJson: GenerateCvFromDocumentsOutput | null;
  language: Language;
}

export function JobFinder({ user, cvJson, language }: JobFinderProps) {
  const [result, setResult] = useState<SuggestJobOpportunitiesOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [playwrightJson, setPlaywrightJson] = useState<string>('');
  const [isJsonCopied, setIsJsonCopied] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { location: "", language: language },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!cvJson) {
      toast({
        title: "Lebenslauf fehlt",
        description: "Bitte generieren Sie zuerst einen Lebenslauf im 'CV-Generator'-Tab.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      const response = await suggestJobOpportunities({
        cvData: cvJson,
        location: values.location,
        language: values.language as Language,
      });
      setResult(response);
    } catch (error) {
      console.error("Error suggesting job opportunities:", error);
      toast({
        title: "Fehler",
        description: "Die Job-Strategie konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const prepareForApply = (job: SuggestJobOpportunitiesOutput['searchLinks'][0]) => {
    if (!cvJson) return;

    const preparedJson = {
        action: "prepareApplicationForHumanReview",
        platform: job.platform,
        url: job.url,
        fields: {
            firstName: cvJson.personalInfo.name.split(' ')[0] || '',
            lastName: cvJson.personalInfo.name.split(' ').slice(1).join(' ') || '',
            email: cvJson.personalInfo.email,
            phone: cvJson.personalInfo.phone,
            cvPath: "storage/cv.pdf", 
            coverLetterPath: "storage/cover_letter.pdf"
        }
    };
    setPlaywrightJson(JSON.stringify(preparedJson, null, 2));
  }
  
  const copyJsonToClipboard = () => {
      if (!playwrightJson) return;
      navigator.clipboard.writeText(playwrightJson);
      setIsJsonCopied(true);
      toast({ title: 'JSON kopiert!', description: 'Prüfvorlage kopiert. Bitte keine automatische Übermittlung ohne deine Zustimmung.' });
      setTimeout(() => setIsJsonCopied(false), 2000);
  };


  if (!user) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>KI-Job-Finder</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Bitte melden Sie sich an, um Ihre persönliche Job-Strategie zu erhalten.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>KI-Job-Finder & Bewerbungs-Vorbereitung</CardTitle>
        <CardDescription>Erhalten Sie eine auf Ihren Lebenslauf zugeschnittene Job-Suchstrategie und bereiten Sie Bewerbungen mit überprüfbaren Daten vor. Ein automatisches Versenden findet nicht statt.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <Accordion type="single" collapsible className="w-full rounded-lg border">
              <AccordionItem value="info" className="border-b-0">
                <AccordionTrigger className="px-4 py-3 text-base hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Info className="h-4 w-4"/>
                    <span className="font-semibold text-left">Wie funktioniert das?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground">
                    Unsere KI analysiert Ihren im "CV-Generator" erstellten Lebenslauf. Basierend auf Ihren Fähigkeiten und Erfahrungen schlägt sie optimierte Suchbegriffe und passende Unternehmen in Ihrer Wunschregion vor. Anschliessend können Sie eine Bewerbung vorbereiten, die alle nötigen Daten für eine Automatisierung mit Tools wie Playwright oder Selenium bereitstellt.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Ihr gewünschter Arbeitsort</FormLabel>
                    <FormControl>
                        <Input placeholder="z.B. Zürich, Schweiz" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sprache für Vorschläge</FormLabel>
                        <LanguageSelect onValueChange={field.onChange as (value: Language) => void} defaultValue={field.value} />
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || !cvJson}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Search className="mr-2 h-4 w-4" />
              {isLoading ? 'Analysiere...' : 'Job-Strategie erstellen'}
            </Button>
          </CardFooter>
        </form>
      </Form>
      
      {isLoading && (
        <CardContent>
            <div className="w-full text-center p-8 bg-secondary/30 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Erstelle Ihre persönliche Karriere-Strategie...</p>
            </div>
        </CardContent>
      )}

      {result && (
        <CardContent className="mt-6 border-t pt-6 space-y-6">
          <Alert>
            <Briefcase className="h-4 w-4" />
            <AlertTitle>Ihre Such-Strategie</AlertTitle>
            <AlertDescription>
              {result.strategySummary}\n              <p className="mt-2 text-sm">Hinweis: Dies sind KI-Suchideen. Arbeitgeber und offene Stellen sind nicht live verifiziert.</p>
            </AlertDescription>
          </Alert>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Search className="h-5 w-5"/>Vorgeschlagene Jobtitel</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    {result.suggestedJobTitles.map((title, i) => (
                        <Badge key={`title-${i}`} variant="secondary">{title}</Badge>
                    ))}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Building className="h-5 w-5"/>Arbeitgeber-Ideen (nicht verifizierte Stellen)</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                     {result.suggestedCompanies.map((company, i) => (
                        <Badge key={`comp-${i}`} variant="outline">{company}</Badge>
                    ))}
                </CardContent>
            </Card>
          </div>

          <div>
             <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Send className="h-5 w-5"/>Suchvorschläge & externe Suchlinks</h3>
             <div className="space-y-4">
                 {result.searchLinks.map((link, i) => (
                    <Card key={`job-${i}`} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-grow">
                           <Link href={link.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline flex items-center gap-1.5">
                                {link.platform} Jobsuche <ExternalLink className="h-3.5 w-3.5" />
                           </Link>
                           <p className="text-sm text-muted-foreground">Suchanfrage, keine bestätigte offene Stelle</p>
                        </div>
                         <Dialog>
                          <DialogTrigger asChild>
                              <Button onClick={() => prepareForApply(link)}><Bot className="mr-2 h-4 w-4" />Angaben prüfen</Button>
                          </DialogTrigger>
                          <DialogContent>
                              <DialogHeader>
                                  <DialogTitle>Bewerbung für "{link.platform}" vorbereitet</DialogTitle>
                                  <DialogDescription>
                                      Hier sind die aufbereiteten Daten im JSON-Format. Kopieren Sie diese und verwenden Sie sie in Ihrem lokalen Browser-Automatisierungs-Tool (z.B. Playwright), um das Formular automatisch auszufüllen.
                                  </DialogDescription>
                              </DialogHeader>
                              <div className="my-4 relative">
                                  <Textarea value={playwrightJson} readOnly className="h-64 font-mono text-xs bg-muted" />
                                  <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8" onClick={copyJsonToClipboard}>
                                      {isJsonCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                              </div>
                              <DialogFooter>
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Nächster Schritt</AlertTitle>
                                    <AlertDescription>
                                        Diese App bereitet nur die Daten vor. Die eigentliche Bewerbung müssen Sie aus Sicherheitsgründen selbst in Ihrem Browser starten.
                                    </AlertDescription>
                                </Alert>
                              </DialogFooter>
                          </DialogContent>
                      </Dialog>
                    </Card>
                 ))}
             </div>
          </div>
        </CardContent>
      )}

      {!cvJson && !isLoading && (
         <CardContent>
            <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Lebenslauf erforderlich</AlertTitle>
                <AlertDescription>
                   Bitte gehen Sie zum "CV-Generator"-Tab und erstellen Sie zuerst Ihren Lebenslauf. Die darin enthaltenen Informationen sind für eine genaue Job-Strategie unerlässlich.
                </AlertDescription>
            </Alert>
         </CardContent>
       )}
    </Card>
  );
}
