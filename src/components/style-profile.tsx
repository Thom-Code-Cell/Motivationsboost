
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { User } from 'firebase/auth';
import { updateUserStyleProfile } from '@/services/user';
import { analyzeWritingStyle } from '@/ai/flows/analyze-writing-style';
import type { AnalyzeWritingStyleOutput, Language } from '@/ai/schemas';
import type { UserData } from '@/types/user';


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/core-textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Languages, Type, Check, Lightbulb } from 'lucide-react';
import { Separator } from './ui/separator';
import { LanguageSelect } from './language-select';
import { Input } from './ui/core-input';

const styleProfileSchema = z.object({
  userStyleSample: z.string().max(3000, "Der Text darf maximal 3000 Zeichen lang sein.").optional(),
  useStyleSample: z.boolean(),
  useAutoLinkedInBooster: z.boolean(),
  jobSearchPreferences: z.object({
      keywords: z.string().optional(),
      locations: z.string().optional(),
      roles: z.string().optional(),
  }).optional(),
});

type FormValues = z.infer<typeof styleProfileSchema>;

interface StyleProfileProps {
  user: User | null;
  initialUserData: UserData | null;
  language: Language;
}

export function StyleProfile({ user, initialUserData, language: initialLanguage }: StyleProfileProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<AnalyzeWritingStyleOutput | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [language, setLanguage] = useState<Language>(initialLanguage);
    
    const form = useForm<FormValues>({
        resolver: zodResolver(styleProfileSchema),
        values: {
            userStyleSample: initialUserData?.userStyleSample || '',
            useStyleSample: initialUserData?.useStyleSample ?? true,
            useAutoLinkedInBooster: initialUserData?.useAutoLinkedInBooster ?? true,
            jobSearchPreferences: {
                keywords: initialUserData?.jobSearchPreferences?.keywords?.join(', ') || '',
                locations: initialUserData?.jobSearchPreferences?.locations?.join(', ') || '',
                roles: initialUserData?.jobSearchPreferences?.roles?.join(', ') || '',
            },
        },
    });

    useEffect(() => {
        form.reset({
            userStyleSample: initialUserData?.userStyleSample || '',
            useStyleSample: initialUserData?.useStyleSample ?? true,
            useAutoLinkedInBooster: initialUserData?.useAutoLinkedInBooster ?? true,
            jobSearchPreferences: {
                keywords: initialUserData?.jobSearchPreferences?.keywords?.join(', ') || '',
                locations: initialUserData?.jobSearchPreferences?.locations?.join(', ') || '',
                roles: initialUserData?.jobSearchPreferences?.roles?.join(', ') || '',
            },
        });
    }, [initialUserData, form]);
    
    useEffect(() => {
        setLanguage(initialLanguage);
    }, [initialLanguage]);


    async function onSubmit(values: FormValues) {
        if (!user) {
            toast({ title: "Fehler", description: "Sie müssen angemeldet sein, um Ihre Einstellungen zu speichern.", variant: "destructive" });
            return;
        }
        
        const preferences = values.jobSearchPreferences;
        
        const dataToUpdate = {
            userStyleSample: values.userStyleSample,
            useStyleSample: values.useStyleSample,
            useAutoLinkedInBooster: values.useAutoLinkedInBooster,
            jobSearchPreferences: {
                keywords: preferences?.keywords?.split(',').map(k => k.trim()).filter(Boolean) ?? [],
                locations: preferences?.locations?.split(',').map(l => l.trim()).filter(Boolean) ?? [],
                roles: preferences?.roles?.split(',').map(r => r.trim()).filter(Boolean) ?? [],
            }
        };

        try {
            await updateUserStyleProfile(user.uid, dataToUpdate);
            toast({
                title: "Gespeichert",
                description: "Ihre persönlichen Einstellungen wurden aktualisiert.",
            });
        } catch (error) {
            console.error("Error saving style profile:", error);
            toast({
                title: "Fehler beim Speichern",
                description: "Ihre Einstellungen konnten nicht gespeichert werden.",
                variant: "destructive",
            });
        }
    }
    
    async function handleAnalyzeStyle() {
        const textSample = form.getValues('userStyleSample');
        if (!textSample || textSample.length < 50) {
            toast({ title: "Zu wenig Text", description: "Bitte geben Sie mindestens 50 Zeichen für eine aussagekräftige Analyse ein.", variant: 'destructive' });
            return;
        }
        
        setIsAnalyzing(true);
        setAnalysisResult(null);
        
        try {
            const result = await analyzeWritingStyle({ textSample, language });
            setAnalysisResult(result);
            toast({ title: "Analyse erfolgreich", description: "Ihr 'Style-Fingerprint' wurde erstellt." });
        } catch (error) {
            console.error("Error analyzing writing style:", error);
            toast({ title: "Analyse fehlgeschlagen", variant: "destructive" });
        } finally {
            setIsAnalyzing(false);
        }
    }

    if (!user) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Mein Stil & Einstellungen</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Bitte melden Sie sich an, um Ihre persönlichen Einstellungen zu verwalten.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle>Mein Stil & Einstellungen</CardTitle>
                        <CardDescription>Passen Sie die KI an Ihre Bedürfnisse an. Ihr Schreibstil und Ihre Automatisierungs-Präferenzen werden hier gespeichert.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Automatisierungen & Personalisierung</h3>
                          <div className="space-y-4">
                              <FormField
                                  control={form.control}
                                  name="useStyleSample"
                                  render={({ field }) => (
                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                          <div className="space-y-0.5">
                                              <FormLabel className="text-base">Stilprobe verwenden</FormLabel>
                                              <FormDescription>
                                                  Wenn aktiviert, wird Ihr Textbeispiel zur Personalisierung der Anschreiben genutzt.
                                              </FormDescription>
                                          </div>
                                          <FormControl>
                                              <Switch
                                                  checked={field.value}
                                                  onCheckedChange={field.onChange}
                                              />
                                          </FormControl>
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="useAutoLinkedInBooster"
                                  render={({ field }) => (
                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                          <div className="space-y-0.5">
                                              <FormLabel className="text-base">Automatischer LinkedIn-Booster</FormLabel>
                                              <FormDescription>
                                                  Wenn aktiviert, wird nach der CV-Generierung automatisch ein optimiertes LinkedIn-Profil erstellt.
                                              </FormDescription>
                                          </div>
                                          <FormControl>
                                              <Switch
                                                  checked={field.value}
                                                  onCheckedChange={field.onChange}
                                              />
                                          </FormControl>
                                      </FormItem>
                                  )}
                              />
                          </div>
                        </div>

                        <Separator />
                        
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Job-Präferenzen für "Job Finder"</h3>
                           <div className="space-y-4">
                               <FormField
                                    control={form.control}
                                    name="jobSearchPreferences.keywords"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Keywords</FormLabel>
                                            <FormControl>
                                                <Input placeholder="z.B. Projektmanagement, SaaS, B2B" {...field} />
                                            </FormControl>
                                            <FormDescription>Geben Sie relevante Fähigkeiten oder Branchen an, getrennt durch Kommas.</FormDescription>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="jobSearchPreferences.locations"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bevorzugte Orte</FormLabel>
                                            <FormControl>
                                                <Input placeholder="z.B. Zürich, Remote, Bern" {...field} />
                                            </FormControl>
                                             <FormDescription>Geben Sie die gewünschten Arbeitsorte an, getrennt durch Kommas.</FormDescription>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="jobSearchPreferences.roles"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bevorzugte Rollen</FormLabel>
                                            <FormControl>
                                                <Input placeholder="z.B. Product Manager, Teamleiter, Fullstack Entwickler" {...field} />
                                            </FormControl>
                                            <FormDescription>Geben Sie die gewünschten Jobtitel an, getrennt durch Kommas.</FormDescription>
                                        </FormItem>
                                    )}
                                />
                           </div>
                        </div>


                        <Separator />
                        <FormField
                            control={form.control}
                            name="userStyleSample"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg font-semibold">✍️ Dein persönlicher Stil</FormLabel>
                                    <FormDescription>
                                        Geben Sie hier einen beliebigen, von Ihnen verfassten Text ein (z.B. eine E-Mail, einen Blog-Kommentar), damit die KI Ihren Schreibstil lernen kann. Je authentischer, desto besser.
                                    </FormDescription>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Schreiben Sie hier, um Ihren Stil zu zeigen..."
                                            className="min-h-[200px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="w-full sm:w-48">
                                <FormItem>
                                    <FormLabel>Sprache der Analyse</FormLabel>
                                    <LanguageSelect onValueChange={setLanguage} defaultValue={language} />
                                </FormItem>
                            </div>
                            <Button type="button" onClick={handleAnalyzeStyle} disabled={isAnalyzing}>
                                {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Meinen Stil analysieren
                            </Button>
                        </div>
                        
                        {isAnalyzing && (
                            <div className="flex items-center justify-center h-40 w-full rounded-md border border-dashed bg-secondary/30">
                                <div className="text-center text-muted-foreground">
                                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                    <p className="mt-2">Erstelle deinen Style-Fingerprint...</p>
                                </div>
                            </div>
                        )}
                        
                        {analysisResult && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Ihr Style-Fingerprint</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <Card>
                                        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                                            <Sparkles className="h-5 w-5 text-primary" />
                                            <CardTitle className="text-base">Tonalität</CardTitle>
                                        </CardHeader>
                                        <CardContent><p className="text-muted-foreground">{analysisResult.tonality}</p></CardContent>
                                    </Card>
                                     <Card>
                                        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                                            <Languages className="h-5 w-5 text-primary" />
                                            <CardTitle className="text-base">Wortwahl</CardTitle>
                                        </CardHeader>
                                        <CardContent><p className="text-muted-foreground">{analysisResult.vocabulary}</p></CardContent>
                                    </Card>
                                     <Card>
                                        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                                            <Type className="h-5 w-5 text-primary" />
                                            <CardTitle className="text-base">Satzstruktur</CardTitle>
                                        </CardHeader>
                                        <CardContent><p className="text-muted-foreground">{analysisResult.sentenceStructure}</p></CardContent>
                                    </Card>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <Card>
                                        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                                            <Check className="h-5 w-5 text-green-500" />
                                            <CardTitle className="text-base">Positiver Eindruck</CardTitle>
                                        </CardHeader>
                                        <CardContent><p className="text-muted-foreground">{analysisResult.positiveImpression}</p></CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                                            <Lightbulb className="h-5 w-5 text-yellow-500" />
                                            <CardTitle className="text-base">Verbesserungspotenzial</CardTitle>
                                        </CardHeader>
                                        <CardContent><p className="text-muted-foreground">{analysisResult.improvementPotential}</p></CardContent>
                                    </Card>
                                </div>
                            </div>
                        )}
                         
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Einstellungen speichern
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
