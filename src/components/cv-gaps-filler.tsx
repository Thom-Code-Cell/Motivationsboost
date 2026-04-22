
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { autofillCVGaps } from '@/ai/flows/autofill-cv-gaps';
import { listDriveFiles, extractTextFromDriveFile } from '@/services/drive';
import type { Language } from '@/ai/schemas';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/core-textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSelect } from './language-select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

const formSchema = z.object({
  cvText: z.string().min(50, { message: "Bitte geben Sie mindestens 50 Zeichen ein." }),
  language: z.enum(['de', 'en', 'fr', 'it']).default('de'),
});

interface CvGapsFillerProps {
    accessToken: string | null;
    language: Language;
}

interface DriveFile {
    id: string;
    name: string;
}

export function CvGapsFiller({ accessToken, language }: CvGapsFillerProps) {
  const [filledCv, setFilledCv] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { cvText: "", language: language },
  });

   useEffect(() => {
    form.setValue('language', language);
  }, [language, form]);


  useEffect(() => {
    if (accessToken) {
        const fetchFiles = async () => {
            try {
                const files = await listDriveFiles(accessToken);
                setDriveFiles(files);
            } catch (error) {
                 toast({
                    title: "Fehler beim Laden der Drive-Dateien",
                    variant: "destructive",
                });
            }
        };
        fetchFiles();
    }
  }, [accessToken, toast]);

  const handleFileSelect = async (fileId: string) => {
    if (!fileId || !accessToken) return;

    setIsExtractingText(true);
    form.setValue('cvText', '');
    try {
      const text = await extractTextFromDriveFile(fileId, accessToken);
      form.setValue('cvText', text, { shouldValidate: true });
      toast({
          title: "Text extrahiert",
          description: "Der Inhalt des Dokuments wurde in das Textfeld geladen.",
      });
    } catch (error) {
      console.error("Error extracting text:", error);
      toast({
        title: "Fehler beim Extrahieren",
        description: error instanceof Error ? error.message : "Der Text konnte nicht aus der Datei gelesen werden. Die Datei ist möglicherweise leer oder beschädigt.",
        variant: "destructive",
      });
    } finally {
        setIsExtractingText(false);
    }
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setFilledCv("");
    try {
      const result = await autofillCVGaps({
        cvText: values.cvText,
        language: values.language as Language,
      });
      setFilledCv(result.filledCvText);
    } catch (error) {
      console.error("Error filling CV gaps:", error);
      toast({
        title: "Fehler",
        description: "Lücken im Lebenslauf konnten nicht gefüllt werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>CV-Editor & Lücken-Analyse</CardTitle>
        <CardDescription>Hier können Sie Ihren Lebenslauf-Text bearbeiten und Lücken von der KI füllen lassen. So wirkt Ihr Werdegang lückenlos und überzeugend.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <Accordion type="single" collapsible className="w-full rounded-lg border">
                <AccordionItem value="info" className="border-b-0">
                    <AccordionTrigger className="px-4 py-3 text-base hover:no-underline">
                        <div className="flex items-center gap-3">
                            <Info className="h-4 w-4"/>
                            <span className="font-semibold">Warum Lücken füllen?</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground">
                            Lücken im Lebenslauf können Fragen aufwerfen. Dieses Tool hilft Ihnen, diese Zeiten proaktiv zu erklären – zum Beispiel als Phase der Neuorientierung, Weiterbildung oder für private Projekte. Das schafft Transparenz und Vertrauen.
                        </p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sprache für Vorschläge</FormLabel>
                        <LanguageSelect onValueChange={field.onChange} defaultValue={field.value} />
                        <FormMessage />
                        </FormItem>
                    )}
                 />

                {accessToken && driveFiles.length > 0 && (
                    <FormItem>
                        <FormLabel>Oder Lebenslauf aus Google Drive importieren</FormLabel>
                        <Select onValueChange={handleFileSelect} disabled={isExtractingText}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Wählen Sie einen Lebenslauf aus Ihrem Drive..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {driveFiles.map((file) => (
                                    <SelectItem key={file.id} value={file.id}>
                                        {file.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormItem>
                )}
            </div>

            <FormField
              control={form.control}
              name="cvText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ihr Lebenslauf-Text</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Textarea placeholder="Fügen Sie hier den Text Ihres Lebenslaufs ein oder importieren Sie ihn aus Google Drive..." className="min-h-[250px]" {...field} />
                       {isExtractingText && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span className="ml-2 text-sm text-muted-foreground">Lese Dokument...</span>
                            </div>
                        )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex-col items-start gap-4">
            <Button type="submit" disabled={isLoading || isExtractingText}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Prüfe...' : 'Lücken füllen'}
            </Button>
            {filledCv && (
              <div className="w-full space-y-2">
                <Label htmlFor="filled-cv">Vervollständigter Lebenslauf</Label>
                <Textarea
                  id="filled-cv"
                  readOnly
                  value={filledCv}
                  className="min-h-[300px] bg-secondary/30"
                />
              </div>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
