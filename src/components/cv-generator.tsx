
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { generateCvFromDocuments } from '@/ai/flows/generate-cv-from-documents';
import { generateLinkedInSummary } from '@/ai/flows/generateLinkedInSummary';
import { listDriveFiles, extractTextFromDriveFile, saveFileToDrive } from '@/services/drive';
import { updateProgress } from '@/services/progress';
import { BadgeConfig } from '@/types/progress';
import type { User } from 'firebase/auth';
import { Loader2, Palette, Info, Paintbrush } from 'lucide-react';
import type { GenerateCvFromDocumentsOutput, Language } from '@/ai/schemas';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CvPreview } from './cv-preview';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { LanguageSelect } from './language-select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

const formSchema = z.object({
  fileIds: z.array(z.string()).refine(value => value.some(item => item), {
    message: "Sie müssen mindestens ein Dokument auswählen.",
  }),
});

interface CvGeneratorProps {
    accessToken: string | null;
    user: User | null;
    useAutoLinkedInBooster: boolean;
    userStyleSample: string;
    language: Language;
    onCvGenerated: (cv: GenerateCvFromDocumentsOutput | null) => void;
    onSummaryGenerated: (summary: string | null) => void;
}

interface DriveFile {
    id: string;
    name: string;
}

export function CvGenerator({ accessToken, user, useAutoLinkedInBooster, userStyleSample, language: initialLanguage, onCvGenerated, onSummaryGenerated }: CvGeneratorProps) {
  const [localCvJson, setLocalCvJson] = useState<GenerateCvFromDocumentsOutput | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("modern");
  const [selectedColor, setSelectedColor] = useState("primary");
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { fileIds: [] },
  });
  
  useEffect(() => {
    setLanguage(initialLanguage);
  }, [initialLanguage]);


  useEffect(() => {
    if (accessToken) {
        const fetchFiles = async () => {
            try {
                const files = await listDriveFiles(accessToken);
                setDriveFiles(files);
            } catch (error) {
                 toast({
                    title: "Fehler beim Laden der Drive-Dateien",
                    description: "Stellen Sie sicher, dass Sie Dokumente im 'Uploads'-Tab hochgeladen haben.",
                    variant: "destructive",
                });
            }
        };
        fetchFiles();
    }
  }, [accessToken, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!accessToken || !user) {
        toast({ title: "Fehler", description: "Keine Anmeldung bei Google Drive.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    setLocalCvJson(null);
    onCvGenerated(null);
    onSummaryGenerated(null);
    
    try {
      setLoadingMessage(`Extrahiere Text aus ${values.fileIds.length} Dokument(en)...`);
      const documentTexts: string[] = [];
      for (const fileId of values.fileIds) {
          const text = await extractTextFromDriveFile(fileId, accessToken);
          documentTexts.push(text);
      }
      
      setLoadingMessage("Generiere Lebenslauf aus Dokumenten...");
      const result = await generateCvFromDocuments({ documentTexts, language: language });
      setLocalCvJson(result);
      await saveFileToDrive(accessToken, 'cv_data.json', JSON.stringify(result, null, 2), 'application/json');
      onCvGenerated(result);

      if (user) {
        const newBadge = await updateProgress(user.uid, { type: 'CV_GENERATED' });
        if (newBadge) {
            const config = BadgeConfig[newBadge];
            toast({
                title: "🎉 Abzeichen freigeschaltet!",
                description: `Du hast das Abzeichen "${config.name}" erhalten.`,
            });
        }
      }

      if (useAutoLinkedInBooster) {
        setLoadingMessage("Optimiere LinkedIn Profil...");
        const linkedinResult = await generateLinkedInSummary({
            cvData: result,
            userStyleSample: userStyleSample,
            language: language
        });
        await saveFileToDrive(accessToken, 'linkedin_summary.txt', linkedinResult.linkedinSummary, 'text/plain');
        onSummaryGenerated(linkedinResult.linkedinSummary);

        toast({
            title: "LinkedIn Profil automatisch aktualisiert!",
            description: "Wechseln Sie zum 'LinkedIn'-Tab, um das Ergebnis zu sehen.",
        });
      }

    } catch (error) {
      console.error("Error generating CV from documents:", error);
      toast({
        title: "Fehler",
        description: "Der Lebenslauf konnte nicht aus den Dokumenten generiert werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  }


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card className="w-full sticky top-8">
          <CardHeader>
            <CardTitle>CV-Generator aus Zeugnissen</CardTitle>
            <CardDescription>Wählen Sie Ihre Dokumente, und unsere KI erstellt daraus einen professionellen, visuellen Lebenslauf für Sie.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <Accordion type="single" collapsible className="w-full rounded-lg border">
                    <AccordionItem value="info" className="border-b-0">
                        <AccordionTrigger className="px-4 py-3 text-base hover:no-underline">
                            <div className="flex items-center gap-3">
                                <Info className="h-4 w-4"/>
                                <span className="font-semibold text-left">Vom Dokument zum perfekten Lebenslauf</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                            <p className="text-sm text-muted-foreground">
                            Laden Sie im "Dokumente"-Tab Ihre Zeugnisse & Diplome hoch. Die KI analysiert sie und erstellt einen strukturierten Lebenslauf, den Sie hier gestalten und exportieren können.
                            </p>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                
                {!accessToken && (
                    <p className="text-sm text-muted-foreground">Bitte melden Sie sich an, um Ihre Dokumente aus Google Drive zu laden.</p>
                )}

                {accessToken && driveFiles.length === 0 && !isLoading && (
                    <p className="text-sm text-muted-foreground">Keine Dokumente im Ordner "Bewerbungsunterlagen AI" in Ihrem Google Drive gefunden. Bitte laden Sie zuerst Dokumente im "Dokumente"-Tab hoch.</p>
                )}
                 
                 <FormItem>
                    <FormLabel>Sprache der Bewerbung</FormLabel>
                    <LanguageSelect onValueChange={setLanguage} defaultValue={language} />
                 </FormItem>

                {accessToken && driveFiles.length > 0 && (
                    <FormField
                        control={form.control}
                        name="fileIds"
                        render={() => (
                            <FormItem>
                                <div className="mb-4">
                                    <FormLabel className="text-base">Dokumente auswählen</FormLabel>
                                </div>
                                <ScrollArea className="h-40 w-full rounded-md border p-4">
                                    {driveFiles.map((item) => (
                                    <FormField
                                        key={item.id}
                                        control={form.control}
                                        name="fileIds"
                                        render={({ field }) => (
                                            <FormItem
                                                key={item.id}
                                                className="flex flex-row items-start space-x-3 space-y-0 py-2"
                                            >
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(item.id)}
                                                        onCheckedChange={(checked) => {
                                                        return checked
                                                            ? field.onChange([...(field.value || []), item.id])
                                                            : field.onChange(
                                                                field.value?.filter(
                                                                    (value) => value !== item.id
                                                                )
                                                            )
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    {item.name}
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                    ))}
                                </ScrollArea>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
              </CardContent>
              <CardFooter className="flex-col items-start gap-4">
                <Button type="submit" disabled={isLoading || !accessToken || driveFiles.length === 0} className="w-full">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? loadingMessage : 'Lebenslauf generieren'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
      <div className="lg:col-span-2">
         {isLoading && !localCvJson && (
            <div className="flex items-center justify-center h-full rounded-lg border-2 border-dashed bg-muted/50 p-12 text-center">
              <div>
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
                <p className="mt-4 text-lg font-medium text-muted-foreground">{loadingMessage || "Generiere Lebenslauf..."}</p>
              </div>
            </div>
         )}
        
        {localCvJson && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Design anpassen</CardTitle>
                 <CardDescription>
                    Ihr Lebenslauf wurde in Ihrem Google Drive gespeichert. Sie können ihn nun im "Export"-Tab als Teil Ihrer Bewerbungsmappe herunterladen.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="font-semibold">Layout-Stil</Label>
                  <RadioGroup value={selectedTemplate} onValueChange={setSelectedTemplate} className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-2">
                      <RadioGroupItem value="modern" id="modern" className="sr-only peer" />
                      <Label htmlFor="modern" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Modern</Label>
                      
                      <RadioGroupItem value="classic" id="classic" className="sr-only peer" />
                      <Label htmlFor="classic" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Klassisch</Label>
                      
                      <RadioGroupItem value="minimalist" id="minimalist" className="sr-only peer" />
                      <Label htmlFor="minimalist" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Minimalistisch</Label>
                      
                      <RadioGroupItem value="creative" id="creative" className="sr-only peer" />
                      <Label htmlFor="creative" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Kreativ</Label>

                      <RadioGroupItem value="compact" id="compact" className="sr-only peer" />
                      <Label htmlFor="compact" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Kompakt</Label>
                  </RadioGroup>
                </div>

                <div>
                    <Label className="font-semibold">Farb-Thema</Label>
                    <RadioGroup value={selectedColor} onValueChange={setSelectedColor} className="grid sm:grid-cols-3 gap-4 mt-2">
                        <div>
                            <RadioGroupItem value="primary" id="color-primary" className="peer sr-only" />
                            <Label htmlFor="color-primary" className="flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                <span className="h-5 w-5 rounded-full bg-primary"></span>
                                Primär
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="elegant" id="color-elegant" className="peer sr-only" />
                            <Label htmlFor="color-elegant" className="flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                 <span className="h-5 w-5 rounded-full bg-gray-800"></span>
                                Elegant
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="vibrant" id="color-vibrant" className="peer sr-only" />
                            <Label htmlFor="color-vibrant" className="flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                <span className="h-5 w-5 rounded-full bg-blue-600"></span>
                                Kräftig
                            </Label>
                        </div>
                    </RadioGroup>
                </div>
              </CardContent>
               <CardFooter>
                 <Button onClick={() => {
                    const tabs = document.querySelector('[role="tablist"]');
                    const exportButton = tabs?.querySelector('[value="export"]') as HTMLButtonElement | null;
                    exportButton?.click();
                 }}>Zum Export-Tab</Button>
                </CardFooter>
            </Card>

            <div className="shadow-lg">
                <CvPreview cvData={localCvJson} template={selectedTemplate} color={selectedColor} />
            </div>
          </div>
        )}

         {!isLoading && !localCvJson && (
            <div className="flex items-center justify-center h-full rounded-lg border-2 border-dashed bg-muted/50 p-12 text-center">
              <div>
                <Paintbrush className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium text-muted-foreground">Ihre Lebenslauf-Vorschau erscheint hier</h3>
                <p className="mt-2 text-sm text-muted-foreground">Wählen Sie links Ihre Dokumente aus und klicken Sie auf "Generieren".</p>
              </div>
            </div>
         )}
      </div>
    </div>
  );
}
