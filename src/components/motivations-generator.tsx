
"use client";
import { Textarea } from '@/components/ui/core-textarea';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { User } from 'firebase/auth';
import { generateMotivationLetter } from '@/ai/flows/generate-motivation-letter';
import { extractJobKeywords } from '@/ai/flows/extract-job-keywords';
import { updateProgress } from '@/services/progress';
import { BadgeConfig } from '@/types/progress';
import type { ExtractJobKeywordsOutput, Language } from '@/ai/schemas';
import { saveFileToDrive } from '@/services/drive';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/core-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { LanguageSelect } from './language-select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

const motivationStyles = [
  { name: "Laura", description: "Modern, individuell, direkt, konkret, auf Mehrwert fokussiert" },
  { name: "Klassisch", description: "Formell, höflich, sicher, geeignet für Verwaltungen & Banken" },
  { name: "Kreativ/Storytelling", description: "Mit persönlicher Geschichte, emotionaler Einstieg" },
  { name: "Strukturiert", description: "Analytisch, logisch aufgebaut, für Technik & Consulting" },
  { name: "Sozial", description: "Warm, empathisch, für Pflege, Soziales, NGOs" },
  { name: "Startup/Locker", description: "Smart, locker, LinkedIn-Style für junge Unternehmen" },
  { name: "Kurz & Klar", description: "Minimalistisch, prägnant, 5–8 Sätze, für Tech & Führungskräfte" },
  { name: "Stärkenbasiert", description: "Fokus auf 3–5 Stärken mit Beispielen" },
  { name: "Problem-Lösungs-Stil", description: "Zeigt gezielt, wie man ein konkretes Unternehmensproblem löst" }
];

const formSchema = z.object({
  jobText: z.string().max(50000).optional(),
  jobUrl: z.string().url({ message: "Bitte geben Sie eine gültige URL ein." }),
  stilwahl: z.string({ required_error: "Bitte wählen Sie einen Stil." }).min(1, "Bitte wählen Sie einen Stil."),
  language: z.enum(['de', 'en', 'fr', 'it']).default('de'),
});

interface MotivationsGeneratorProps {
  onExport: () => void;
  user: User | null;
  accessToken: string | null;
  cvData: string | null;
  userProfile: string;
  userStyleSample: string | null | undefined;
  useStyleSample: boolean | null | undefined;
  language: Language;
  initialLetter: string | null;
  onLetterUpdated: (letter: string | null) => void;
}

export function MotivationsGenerator({ onExport, user, accessToken, cvData, userProfile, userStyleSample, useStyleSample, language, initialLetter, onLetterUpdated }: MotivationsGeneratorProps) {
  const [editedLetter, setEditedLetter] = useState(initialLetter || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractJobKeywordsOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobUrl: "",
      language: language,
    },
  });

  useEffect(() => {
    setEditedLetter(initialLetter || "");
  }, [initialLetter]);

  useEffect(() => {
    form.setValue('language', language);
  }, [language, form]);

  async function handleExtractKeywords(jobUrl: string) {
    if (!jobUrl || form.getFieldState('jobUrl').invalid) {
      setExtractedData(null);
      return;
    }
    setIsExtractingKeywords(true);
    setExtractedData(null);
    try {
      const result = await extractJobKeywords({ jobUrl, jobText: form.getValues('jobText'), language: form.getValues('language') });
      setExtractedData(result);
    } catch (error) {
      console.error("Error extracting keywords:", error);
      toast({
        title: "Fehler bei Keyword-Analyse",
        description: "Die Keywords konnten nicht aus dem Link extrahiert werden.",
        variant: "destructive",
      });
    } finally {
      setIsExtractingKeywords(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !accessToken) {
      toast({ title: "Fehler", description: "Sie müssen angemeldet sein.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setEditedLetter("");


    try {
       const allKeywords = extractedData ? [
            ...extractedData.fachlicheKompetenzen,
            ...extractedData.softSkills,
            ...extractedData.schluesselbegriffe,
        ] : [];

      const result = await generateMotivationLetter({
        ...values,
        cvDaten: cvData || '',
        benutzerprofil: userProfile,
        keywords: allKeywords,
        jobSummary: extractedData?.zusammenfassung,
        ...(useStyleSample && userStyleSample && { userStyleSample: userStyleSample }),
      });

      setEditedLetter(result.motivationLetter);
      onLetterUpdated(result.motivationLetter);

      await saveFileToDrive(accessToken, 'motivation_letter.txt', result.motivationLetter, 'text/plain');

      const newBadge = await updateProgress(user.uid, { type: 'LETTER_GENERATED' });
      if (newBadge) {
          const config = BadgeConfig[newBadge];
          toast({
              title: "🎉 Abzeichen freigeschaltet!",
              description: `Du hast das Abzeichen "${config.name}" erhalten.`,
          });
      }
    } catch (error) {
      console.error("Error generating motivation letter:", error);
      toast({
        title: "Fehler",
        description: "Das Motivationsschreiben konnte nicht generiert werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSaveToDrive = async () => {
    if (accessToken && editedLetter !== initialLetter) {
        try { await saveFileToDrive(accessToken, 'motivation_letter.txt', editedLetter, 'text/plain'); }
        catch { toast({ title: 'Speichern fehlgeschlagen', description: 'Ihre Änderungen sind noch nicht in Drive gespeichert.', variant: 'destructive' }); return; }
        onLetterUpdated(editedLetter);
        toast({ title: "Gespeichert", description: "Ihre Änderungen wurden in Google Drive gesichert."})
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Motivationsschreiben-Generator</CardTitle>
        <CardDescription>Erstellen Sie mit KI in Minuten ein persönliches Anschreiben, das auf die Stelle und Ihren Stil zugeschnitten ist.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <Accordion type="single" collapsible className="w-full rounded-lg border">
                <AccordionItem value="info" className="border-b-0">
                    <AccordionTrigger className="px-4 py-3 text-base hover:no-underline">
                        <div className="flex items-center gap-3">
                            <Info className="h-4 w-4"/>
                            <span className="font-semibold text-left">Ziel: Ein überzeugendes Anschreiben in Minuten</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground">
                            Hier erstellt die KI Ihr Motivationsschreiben – zugeschnitten auf die konkrete Stelle, Ihren Lebenslauf und Ihre persönlichen Stärken. Fügen Sie den Link zur Stellenanzeige ein und wählen Sie einen Stil, um zu beginnen.
                        </p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
<FormField control={form.control} name="jobText" render={({ field }) => (<FormItem><FormLabel>Stellenanzeige als Text (optional)</FormLabel><FormControl><Textarea {...field} value={field.value || ""} placeholder="Falls der Link nicht lesbar ist, hier den vollständigen Anzeigentext einfügen." /></FormControl><FormMessage /></FormItem>)} />

            <FormField
              control={form.control}
              name="jobUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job-Link</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.beispiel-firma.de/karriere/job123" {...field} onBlur={(e) => {
                      field.onBlur();
                      handleExtractKeywords(e.target.value);
                    }}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(isExtractingKeywords || extractedData) && (
              <div className="space-y-4 pt-2">
                <Label>Analyse der Stellenanzeige</Label>
                {isExtractingKeywords ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analysiere Stellenanzeige...</span>
                  </div>
                ) : extractedData && (
                    <div className="space-y-4 rounded-md border bg-secondary/30 p-4">
                        <div>
                            <h4 className="font-semibold text-sm mb-2">Zusammenfassung</h4>
                            <p className="text-sm text-muted-foreground">{extractedData.zusammenfassung}</p>
                        </div>
                        {extractedData.fachlicheKompetenzen.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-sm mb-2">Fachliche Kompetenzen & Tools</h4>
                                <div className="flex flex-wrap gap-2">
                                    {extractedData.fachlicheKompetenzen.map((keyword, index) => (
                                    <Badge key={`fachlich-${index}`} variant="secondary">{keyword}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        {extractedData.softSkills.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-sm mb-2">Soft Skills & Persönlichkeit</h4>
                                <div className="flex flex-wrap gap-2">
                                    {extractedData.softSkills.map((keyword, index) => (
                                    <Badge key={`soft-${index}`} variant="secondary">{keyword}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        {extractedData.schluesselbegriffe.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-sm mb-2">Schlüsselbegriffe & Aufgaben</h4>
                                <div className="flex flex-wrap gap-2">
                                    {extractedData.schluesselbegriffe.map((keyword, index) => (
                                    <Badge key={`schluessel-${index}`} variant="secondary">{keyword}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="stilwahl"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Stil-Auswahl</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Wählen Sie einen Motivationsstil" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {motivationStyles.map((style) => (
                            <SelectItem key={style.name} value={style.name}>
                            {style.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sprache der Bewerbung</FormLabel>
                         <LanguageSelect onValueChange={field.onChange} defaultValue={field.value} />
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || isExtractingKeywords}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Generiere...' : 'Motivationsschreiben generieren'}
            </Button>
          </CardFooter>
        </form>
      </Form>

      {(isLoading || editedLetter) && (
        <CardContent className="mt-6 border-t pt-6">
           {isLoading ? (
               <div className="w-full space-y-2">
                 <Label>Ihr generiertes Motivationsschreiben</Label>
                 <div className="flex items-center justify-center h-[300px] w-full rounded-md border border-dashed bg-secondary/30">
                     <div className="text-center text-muted-foreground">
                         <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                         <p className="mt-2">Die KI schreibt für Sie...</p>
                     </div>
                 </div>
               </div>
           ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <Label htmlFor="editor">Editor</Label>
                     <Textarea
                        id="editor"
                        value={editedLetter}
                        onChange={(e) => setEditedLetter(e.target.value)}
                        onBlur={handleSaveToDrive}
                        className="min-h-[400px] bg-background"
                        />
                </div>
                <div className="space-y-2">
                    <Label>Live-Vorschau</Label>
                    <div className="p-8 bg-white shadow-lg rounded-md aspect-[210/297] min-h-[400px] overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm font-sans text-black">{editedLetter}</pre>
                    </div>
                </div>
            </div>
           )}
        </CardContent>
      )}

      {editedLetter && !isLoading && (
          <CardFooter className="mt-6 border-t pt-6 flex-col items-start gap-4">
              <p className="text-sm text-muted-foreground">Ihr Dokument wurde gespeichert. Sie können es nun im "Export"-Tab als Teil Ihrer Bewerbungsmappe herunterladen.</p>
               <Button onClick={onExport}>Zum Export-Tab</Button>
          </CardFooter>
      )}

    </Card>
  );
}
