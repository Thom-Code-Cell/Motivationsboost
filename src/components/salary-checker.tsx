
"use client";
import { LanguageSchema } from '@/ai/schemas';

import { Textarea } from '@/components/ui/core-textarea';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { User } from 'firebase/auth';
import type { GenerateCvFromDocumentsOutput, PredictSalaryRangeOutput, Language } from '@/ai/schemas';
import { predictSalaryRange } from '@/ai/flows/predict-salary-range';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/core-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Info, DollarSign, Lightbulb } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { LanguageSelect } from './language-select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const formSchema = z.object({
  jobText: z.string().max(50000).optional(),
  jobUrl: z.string().url({ message: "Bitte geben Sie eine gültige URL zur Stellenanzeige ein." }),
  location: z.string().min(3, { message: "Bitte geben Sie einen gültigen Ort ein." }),
  language: LanguageSchema.default('de'),
});

interface SalaryCheckerProps {
  user: User | null;
  cvJson: GenerateCvFromDocumentsOutput | null;
  language: Language;
}

export function SalaryChecker({ user, cvJson, language }: SalaryCheckerProps) {
  const [result, setResult] = useState<PredictSalaryRangeOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { jobUrl: "", location: "", language },
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
      const response = await predictSalaryRange({
        cvData: cvJson,
        jobUrl: values.jobUrl,
          jobText: values.jobText,
        location: values.location,
        language: values.language as Language,
      });
      setResult(response);
    } catch (error) {
      console.error("Error predicting salary range:", error);
      toast({
        title: "Fehler",
        description: "Die Gehaltsspanne konnte nicht berechnet werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat(form.getValues('language'), {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!user) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>KI-Gehalts-Check</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Bitte melden Sie sich an, um dieses Feature zu nutzen.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>KI-Gehalts-Check</CardTitle>
        <CardDescription>Erhalten Sie eine datengestützte Gehaltsprognose, basierend auf Ihrem Profil, der Stelle und dem Standort.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <Accordion type="single" collapsible className="w-full rounded-lg border">
              <AccordionItem value="info" className="border-b-0">
                <AccordionTrigger className="px-4 py-3 text-base hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Info className="h-4 w-4"/>
                    <span className="font-semibold text-left">Sicher in die Gehaltsverhandlung</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground">
                    Die Frage nach dem Gehalt ist oft heikel. Dieses Tool gibt Ihnen eine realistische, KI-basierte Einschätzung, damit Sie selbstbewusst und gut vorbereitet in die Verhandlung gehen können.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<FormField control={form.control} name="jobText" render={({ field }) => (<FormItem><FormLabel>Stellenanzeige als Text (optional)</FormLabel><FormControl><Textarea {...field} value={field.value || ""} placeholder="Falls der Link nicht lesbar ist, hier den vollständigen Anzeigentext einfügen." /></FormControl><FormMessage /></FormItem>)} />

                <FormField
                control={form.control}
                name="jobUrl"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Link zur Stellenanzeige</FormLabel>
                    <FormControl>
                        <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Arbeitsort</FormLabel>
                    <FormControl>
                        <Input placeholder="z.B. Zürich, Schweiz" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

             <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Sprache für die Analyse</FormLabel>
                    <LanguageSelect onValueChange={field.onChange} defaultValue={field.value} />
                    <FormMessage />
                    </FormItem>
                )}
            />

          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || !cvJson}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <DollarSign className="mr-2 h-4 w-4" />
              {isLoading ? 'Analysiere...' : 'Gehaltsprognose erstellen'}
            </Button>
          </CardFooter>
        </form>
      </Form>

      {isLoading && (
        <CardContent>
            <div className="w-full text-center p-8 bg-secondary/30 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Analysiere Markt, Stelle und Profil...</p>
            </div>
        </CardContent>
      )}

      {result && (
        <CardContent className="mt-6 border-t pt-6 space-y-6">
            <Card className="text-center bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="text-lg text-muted-foreground">Prognostizierte jährliche Gehaltsspanne</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl md:text-5xl font-bold text-primary">
                        {formatCurrency(result.lowerBound, result.currency)} – {formatCurrency(result.upperBound, result.currency)}
                    </p>
                </CardContent>
            </Card>

            <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>Begründung der KI</AlertTitle>
                <AlertDescription>
                    {result.justification}
                </AlertDescription>
            </Alert>
        </CardContent>
      )}
       {!cvJson && !isLoading && (
         <CardContent>
            <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Lebenslauf erforderlich</AlertTitle>
                <AlertDescription>
                   Bitte gehen Sie zum "CV-Generator"-Tab und erstellen Sie zuerst Ihren Lebenslauf. Die darin enthaltenen Informationen sind für eine genaue Gehaltsprognose unerlässlich.
                </AlertDescription>
            </Alert>
         </CardContent>
       )}
    </Card>
  );
}
