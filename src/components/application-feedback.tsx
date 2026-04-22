
"use client";

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { generateApplicationFeedback } from '@/ai/flows/generate-application-feedback';
import { refineDocumentsForATS } from '@/ai/flows/refine-documents-for-ats';
import { updateProgress } from '@/services/progress';
import { BadgeConfig } from '@/types/progress';
import type { GenerateApplicationFeedbackOutput, Language } from '@/ai/schemas';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/core-input";
import { Textarea } from "@/components/ui/core-textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Target, ListChecks, Wrench, Wand2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { LanguageSelect } from './language-select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

const formSchema = z.object({
  jobUrl: z.string().url({ message: "Bitte geben Sie eine gültige URL zur Stellenanzeige ein." }),
  coverLetter: z.string().min(1, { message: "Bitte geben Sie Ihr Motivationsschreiben ein oder generieren Sie es." }),
  cv: z.string().min(1, { message: "Bitte geben Sie Ihren Lebenslauf ein oder generieren Sie ihn." }),
  language: z.enum(['de', 'en', 'fr', 'it']).default('de'),
});

interface ApplicationFeedbackProps {
    user: User | null;
    language: Language;
    cvText: string | null;
    coverLetterText: string | null;
}

export function ApplicationFeedback({ user, language, cvText, coverLetterText }: ApplicationFeedbackProps) {
  const [feedback, setFeedback] = useState<GenerateApplicationFeedbackOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        jobUrl: "",
        coverLetter: coverLetterText || "",
        cv: cvText || "",
        language: language
    },
  });

  useEffect(() => {
    form.reset({
        jobUrl: form.getValues().jobUrl, // Keep jobUrl if already entered
        coverLetter: coverLetterText || "",
        cv: cvText || "",
        language: language,
    });
  }, [cvText, coverLetterText, language, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setFeedback(null);
    try {
      const result = await generateApplicationFeedback({
          jobUrl: values.jobUrl,
          coverLetter: values.coverLetter,
          cv: values.cv,
          language: values.language as Language
      });
      setFeedback(result);
      if (user) {
          const newBadge = await updateProgress(user.uid, { type: 'ATS_CHECK_COMPLETED', score: result.atsScore });
          if (newBadge) {
              const config = BadgeConfig[newBadge];
              toast({
                  title: "🎉 Abzeichen freigeschaltet!",
                  description: `Du hast das Abzeichen "${config.name}" erhalten.`,
              });
          }
      }
    } catch (error) {
      console.error("Error generating feedback:", error);
      toast({
        title: "Fehler",
        description: "Das Feedback konnte nicht generiert werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOptimize() {
    if (!feedback) return;
    const currentValues = form.getValues();
    setIsOptimizing(true);
    try {
      const result = await refineDocumentsForATS({
        cvText: currentValues.cv,
        coverLetterText: currentValues.coverLetter,
        missingKeywords: feedback.missingKeywords,
        language: currentValues.language as Language,
      });

      form.setValue('cv', result.refinedCvText, { shouldValidate: true });
      form.setValue('coverLetter', result.refinedCoverLetterText, { shouldValidate: true });

      toast({
        title: "Optimierung erfolgreich",
        description: "Ihre Dokumente wurden aktualisiert. Starten Sie die Analyse erneut, um den neuen Score zu sehen.",
      });
      setFeedback(null); 
    } catch (error) {
      console.error("Error optimizing documents:", error);
      toast({
        title: "Optimierung fehlgeschlagen",
        description: "Die Dokumente konnten nicht automatisch optimiert werden.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  }

  const getScoreColor = (score: number) => {
    if (score < 70) return "bg-destructive";
    if (score < 90) return "bg-accent";
    return "bg-primary";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>ATS-Check & Bewerbungs-Feedback</CardTitle>
        <CardDescription>Prüfen Sie, wie gut Ihre Unterlagen auf eine Stelle passen. Unsere KI analysiert sie wie ein Bewerber-Tracking-System (ATS) und gibt Ihnen Tipps zur Optimierung.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
             <Accordion type="single" collapsible className="w-full rounded-lg border">
                <AccordionItem value="info" className="border-b-0">
                    <AccordionTrigger className="px-4 py-3 text-base hover:no-underline">
                        <div className="flex items-center gap-3">
                            <Info className="h-4 w-4"/>
                            <span className="font-semibold">Was ist ein ATS-Check?</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground">
                        Viele Firmen nutzen Applicant Tracking Systems (ATS), um Bewerbungen vorzusortieren. Diese KI simuliert einen solchen Check, gibt einen "Match-Score" und zeigt Ihnen fehlende Keywords, damit Sie Ihre Unterlagen optimieren und Ihre Chancen erhöhen können.
                        </p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="jobUrl"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Job-Link</FormLabel>
                    <FormControl>
                        <Input placeholder="https://www.beispiel-firma.de/karriere/job123" {...field} />
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
                        <FormLabel>Sprache des Feedbacks</FormLabel>
                         <LanguageSelect onValueChange={field.onChange} defaultValue={field.value} />
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            </div>
            <FormField
              control={form.control}
              name="coverLetter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ihr Motivationsschreiben</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Wird automatisch aus dem 'Generator'-Tab geladen..." className="min-h-[200px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cv"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ihr Lebenslauf</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Wird automatisch aus dem 'CV-Generator'-Tab geladen..." className="min-h-[200px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex-col items-start gap-6">
            <Button type="submit" disabled={isLoading || isOptimizing}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Analysiere...' : 'Feedback generieren'}
            </Button>
            
            {isLoading && (
                 <div className="w-full text-center p-8 bg-secondary/30 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Analysiere Dokumente und Job-Link...</p>
                 </div>
            )}

            {feedback && (
              <div className="w-full space-y-6 pt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
                    <Target className="h-6 w-6 text-primary" />
                    <div className="flex-grow">
                      <CardTitle className="text-lg">ATS-Match-Score: {feedback.atsScore}%</CardTitle>
                      <Progress value={feedback.atsScore} className="mt-2 h-2" indicatorClassName={getScoreColor(feedback.atsScore)} />
                    </div>
                  </CardHeader>
                   <CardContent className="p-4 pt-0">
                     <p className="text-sm text-muted-foreground">{feedback.scoreReasoning}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center gap-3 p-4">
                    <ListChecks className="h-6 w-6" />
                    <CardTitle className="text-lg">Fehlende Keywords</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {feedback.missingKeywords.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {feedback.missingKeywords.map((keyword, index) => (
                                <Badge key={index} variant="destructive">{keyword}</Badge>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Sehr gut! Alle wichtigen Keywords wurden gefunden.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center gap-3 p-4">
                    <Wrench className="h-6 w-6" />
                    <CardTitle className="text-lg">Verbesserungsvorschläge</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feedback.improvementSuggestions}</p>
                  </CardContent>
                </Card>

                {feedback.atsScore < 90 && (
                    <div className="w-full border-t pt-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Wand2 className="h-6 w-6 text-primary"/>
                            <h3 className="text-lg font-semibold">Nächster Schritt: KI-Optimierung</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">Ihr Score ist gut, aber es gibt noch Verbesserungspotenzial. Lassen Sie die KI Ihre Unterlagen mit einem Klick automatisch verbessern, um die Chancen weiter zu erhöhen.</p>
                        <Button onClick={handleOptimize} disabled={isOptimizing || isLoading}>
                            {isOptimizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isOptimizing ? 'Optimiere...' : 'Dokumente mit KI optimieren'}
                        </Button>
                    </div>
                )}
              </div>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
