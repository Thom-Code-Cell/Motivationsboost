
"use client";
import { LanguageSchema } from '@/ai/schemas';

import { Textarea } from '@/components/ui/core-textarea';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod/v3';
import dynamic from 'next/dynamic';
import { generateInterviewQuestions } from '@/ai/flows/generate-interview-questions';
import { analyzeInterviewAnswer } from '@/ai/flows/analyze-interview-answer';
import { generateAudioFromText } from '@/ai/flows/generate-audio-from-text';
import type { GenerateInterviewQuestionsOutput, AnalyzeInterviewAnswerOutput, Language } from '@/ai/schemas';
import { updateProgress } from '@/services/progress';
import { BadgeConfig } from '@/types/progress';
import type { User } from 'firebase/auth';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/core-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, BrainCircuit, UserCheck, Building, Lightbulb, Info, Sparkles, PencilRuler, CheckCircle, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { LanguageSelect } from './language-select';

const SpeechInput = dynamic(() => import('./speech-input').then(mod => mod.SpeechInput), {
    ssr: false,
    loading: () => <Textarea placeholder="Spracheingabe wird geladen..." className="min-h-[100px]" disabled />
});

const formSchema = z.object({
  jobText: z.string().max(50000).optional(),
  jobUrl: z.string().url({ message: "Bitte geben Sie eine gültige URL zur Stellenanzeige ein." }),
  language: LanguageSchema,
  cvData: z.string().optional(),
});

type AnalysisState = {
    [question: string]: {
        isLoading: boolean;
        data: AnalyzeInterviewAnswerOutput | null;
        error: string | null;
    }
};

interface InterviewCoachProps {
  user: User | null;
  language: Language;
  cvData?: string | null;
  userStyleSample?: string | null;
}

export function InterviewCoach({ user, language, cvData, userStyleSample }: InterviewCoachProps) {
  const [questions, setQuestions] = useState<GenerateInterviewQuestionsOutput | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<AnalysisState>({});

  const [isAudioPlaying, setIsAudioPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { jobUrl: "", language: language, cvData: cvData || "" },
  });

  useEffect(() => {
    form.setValue('language', language);
    form.setValue('cvData', cvData || "");
  }, [language, cvData, form]);

   useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  async function onGenerateQuestions(values: z.infer<typeof formSchema>) {
    setIsLoadingQuestions(true);
    setQuestions(null);
    setAnswers({});
    setAnalysis({});
    try {
      const result = await generateInterviewQuestions({
          ...values,
          language: values.language,
          cvData: values.cvData || undefined,
      });
      setQuestions(result);
      if (user) {
        const newBadge = await updateProgress(user.uid, { type: 'INTERVIEW_PREPARED' });
        if (newBadge) {
            const config = BadgeConfig[newBadge];
            toast({
                title: "🎉 Abzeichen freigeschaltet!",
                description: `Du hast das Abzeichen "${config.name}" erhalten.`,
            });
        }
      }
    } catch (error) {
      console.error("Error generating interview questions:", error);
      toast({
        title: "Fehler",
        description: "Die Interviewfragen konnten nicht generiert werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuestions(false);
    }
  }

  const handleAnalyzeAnswer = async (question: string) => {
    const userAnswer = answers[question];
    if (!userAnswer) {
        toast({ title: "Keine Antwort", description: "Bitte geben Sie zuerst eine Antwort ein.", variant: "destructive" });
        return;
    }

    setAnalysis(prev => ({ ...prev, [question]: { isLoading: true, data: null, error: null } }));

    try {
        const result = await analyzeInterviewAnswer({
            question,
            userAnswer,
            jobUrl: form.getValues("jobUrl"),
            jobText: form.getValues("jobText"),
            cvData: cvData || undefined,
            userStyleSample: userStyleSample || undefined,
            language: form.getValues("language"),
        });
        setAnalysis(prev => ({ ...prev, [question]: { isLoading: false, data: result, error: null } }));
    } catch (error) {
        console.error("Error analyzing answer:", error);
        const errorMessage = error instanceof Error ? error.message : "Die Antwort konnte nicht analysiert werden.";
        setAnalysis(prev => ({ ...prev, [question]: { isLoading: false, data: null, error: errorMessage } }));
        toast({ title: "Analyse fehlgeschlagen", description: errorMessage, variant: "destructive" });
    }
  };

  const playQuestionAudio = async (question: string) => {
    if (isAudioPlaying !== null) {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsAudioPlaying(null);
        return;
    }
    setIsAudioPlaying(question);
    try {
        const result = await generateAudioFromText({ text: question, language: form.getValues('language') });

        if (audioRef.current) {
          audioRef.current.pause();
        }

        const newAudio = new Audio(result.audioDataUri);
        audioRef.current = newAudio;
        newAudio.play();
        newAudio.onended = () => setIsAudioPlaying(null);

    } catch (error) {
        console.error('Error generating or playing audio:', error);
        toast({ title: 'Audio-Fehler', description: 'Die Frage konnte nicht vorgelesen werden.', variant: 'destructive' });
        setIsAudioPlaying(null);
    }
  };


  const handleAnswerChange = (question: string, value: string) => {
      setAnswers(prev => ({ ...prev, [question]: value }));
  };

  const renderQuestionBlock = (question: string, index: number) => {
    const currentAnalysis = analysis[question];

    return (
        <div key={index} className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-start">
                <p className="font-semibold text-muted-foreground pr-4">{question}</p>
                <Button variant="ghost" size="icon" onClick={() => playQuestionAudio(question)} title="Frage vorlesen">
                    {isAudioPlaying === question ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5" />}
                </Button>
            </div>

            <SpeechInput
              value={answers[question] || ''}
              onTextChange={(value) => handleAnswerChange(question, value)}
              language={form.getValues('language')}
            />

            <Button onClick={() => handleAnalyzeAnswer(question)} disabled={currentAnalysis?.isLoading}>
                {currentAnalysis?.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Antwort analysieren
            </Button>

            {currentAnalysis?.isLoading && (
                 <div className="w-full text-center p-4 bg-secondary/30 rounded-lg">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Analysiere Antwort...</p>
                 </div>
            )}

            {currentAnalysis?.data && (
                <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-bold">Analyse deiner Antwort</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Relevanz-Score</CardTitle>
                                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{currentAnalysis.data.relevanceScore}%</div>
                            </CardContent>
                        </Card>
                         <Card className="md:col-span-2">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Verbesserungsvorschläge</CardTitle>
                                <PencilRuler className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentAnalysis.data.improvementSuggestions}</p>
                            </CardContent>
                        </Card>
                    </div>
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Beispiel für eine Top-Antwort</CardTitle>
                            <Sparkles className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                             <p className="text-sm text-primary/90 whitespace-pre-wrap">{currentAnalysis.data.exampleAnswer}</p>
                        </CardContent>
                    </Card>
                </div>
            )}
             {currentAnalysis?.error && (
                <Alert variant="destructive">
                    <AlertTitle>Analysefehler</AlertTitle>
                    <AlertDescription>{currentAnalysis.error}</AlertDescription>
                </Alert>
            )}
        </div>
    )
  };


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>KI-Interview-Coach</CardTitle>
        <CardDescription>Bereiten Sie sich optimal auf Ihr nächstes Vorstellungsgespräch vor. Geben Sie den Link zur Stellenanzeige ein, und unsere KI generiert wahrscheinliche Interviewfragen und gibt Feedback auf Ihre Antworten.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onGenerateQuestions)}>
          <CardContent className="space-y-6">
             <Accordion type="single" collapsible className="w-full rounded-lg border">
                <AccordionItem value="info" className="border-b-0">
                    <AccordionTrigger className="px-4 py-3 text-base hover:no-underline">
                        <div className="flex items-center gap-3">
                            <Info className="h-4 w-4"/>
                            <span className="font-semibold">Sicher ins Gespräch</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground">
                            Nervös vor dem Interview? Kein Problem. Diese KI analysiert die Stellenanzeige und erstellt einen Katalog mit wahrscheinlichen Fragen. Üben Sie Ihre Antworten und erhalten Sie direktes Feedback, um selbstbewusst aufzutreten.
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
                        <FormLabel>Sprache für Fragen & Analyse</FormLabel>
                         <LanguageSelect onValueChange={field.onChange} defaultValue={field.value} />
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            </div>
            <FormField
              control={form.control}
              name="cvData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ihr Lebenslauf (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Fügen Sie hier optional Ihren Lebenslauf als Text ein, um noch präzisere Fragen zu erhalten." className="min-h-[150px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoadingQuestions}>
              {isLoadingQuestions && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoadingQuestions ? 'Analysiere...' : 'Fragen generieren'}
            </Button>
          </CardFooter>
        </form>
      </Form>

      {isLoadingQuestions && (
        <CardContent>
          <div className="w-full text-center p-8 bg-secondary/30 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Analysiere Stellenanzeige und generiere Fragen...</p>
          </div>
        </CardContent>
      )}

      {questions && (
        <CardContent className="mt-6 border-t pt-6 space-y-6">
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>Profil des Idealkandidaten</AlertTitle>
              <AlertDescription>
                {questions.summary}
              </AlertDescription>
            </Alert>

            <Separator />

            <h3 className="text-xl font-semibold">Ihre personalisierten Fragen</h3>
            <Accordion type="multiple" defaultValue={['technical']} className="w-full space-y-4">
                <AccordionItem value="technical">
                    <AccordionTrigger className="text-lg"><BrainCircuit className="mr-2 h-5 w-5 text-primary" /> Fachliche & technische Fragen</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                        {questions.technicalQuestions.map(renderQuestionBlock)}
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="behavioral">
                    <AccordionTrigger className="text-lg"><UserCheck className="mr-2 h-5 w-5 text-primary" /> Verhaltensfragen (STAR-Methode)</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                        {questions.behavioralQuestions.map(renderQuestionBlock)}
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="company">
                    <AccordionTrigger className="text-lg"><Building className="mr-2 h-5 w-5 text-primary" /> Deine Fragen an das Unternehmen</AccordionTrigger>
                    <AccordionContent>
                         <p className="text-sm text-muted-foreground py-4">Nutzen Sie diese Fragen, um Ihr Interesse zu zeigen und mehr über die Rolle und das Unternehmen zu erfahren. Sie müssen dafür keine Antworten vorbereiten.</p>
                         <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            {questions.questionsForCompany.map((q, i) => <li key={`comp-${i}`}>{q}</li>)}
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
      )}
    </Card>
  );
}
