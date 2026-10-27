import { LanguageSchema } from '@/ai/schemas';

"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { generateEmailResponse } from '@/ai/flows/generate-email-response';
import type { GenerateEmailResponseOutput, Language } from '@/ai/schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/core-textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/core-input';
import { Loader2, Copy, Sparkles, Send } from 'lucide-react';
import { LanguageSelect } from './language-select';

const formSchema = z.object({
  scenario: z.enum(['follow_up', 'thank_you', 'rejection_response', 'acceptance']),
  companyName: z.string().min(2, "Bitte geben Sie den Firmennamen an."),
  jobTitle: z.string().min(2, "Bitte geben Sie den Jobtitel an."),
  language: LanguageSchema.default('de'),
});

export function EmailGenerator() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<GenerateEmailResponseOutput | null>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            companyName: '',
            jobTitle: '',
            language: 'de'
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setResult(null);
        try {
            const response = await generateEmailResponse({
                ...values,
                scenario: values.scenario as 'follow_up' | 'thank_you' | 'rejection_response' | 'acceptance',
                language: values.language as Language,
            });
            setResult(response);
        } catch (error) {
            console.error("Error generating email:", error);
            toast({
                title: "Fehler",
                description: "Die E-Mail konnte nicht generiert werden.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }

    const copyToClipboard = () => {
        if (!result) return;
        const fullEmail = `Betreff: ${result.subjectLine}\n\n${result.emailBody}`;
        navigator.clipboard.writeText(fullEmail);
        toast({ title: 'E-Mail kopiert!', description: 'Betreff und Text wurden in die Zwischenablage kopiert.' });
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardHeader>
                            <CardTitle>E-Mail-Generator</CardTitle>
                            <CardDescription>
                                Erstellen Sie professionelle E-Mails für jede Phase des Bewerbungsprozesses. Die KI formuliert den Text für Sie.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <FormField
                                control={form.control}
                                name="scenario"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Wählen Sie ein Szenario</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="In welcher Situation sind Sie?" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="follow_up">Nachfassen (keine Rückmeldung)</SelectItem>
                                            <SelectItem value="thank_you">Dankes-E-Mail (nach Interview)</SelectItem>
                                            <SelectItem value="rejection_response">Antwort auf Absage</SelectItem>
                                            <SelectItem value="acceptance">Annahme eines Jobangebots</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="companyName"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Firma</FormLabel>
                                    <FormControl>
                                        <Input placeholder="z.B. Beispiel AG" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="jobTitle"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Jobtitel</FormLabel>
                                    <FormControl>
                                        <Input placeholder="z.B. Softwareentwickler" {...field} />
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
                                    <FormLabel>Sprache</FormLabel>
                                    <LanguageSelect onValueChange={field.onChange} defaultValue={field.value} />
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                E-Mail erstellen
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
            
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Generierte E-Mail-Vorschau</CardTitle>
                    <CardDescription>
                       Hier erscheint der von der KI erstellte Vorschlag. Kopieren Sie ihn und fügen Sie ihn in Ihr E-Mail-Programm ein.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                    {isLoading ? (
                         <div className="w-full text-center p-8 bg-muted rounded-lg flex items-center justify-center flex-1">
                            <div>
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                                <p className="mt-2 text-sm text-muted-foreground">Formuliere E-Mail...</p>
                            </div>
                        </div>
                    ) : result ? (
                        <div className="w-full space-y-4 flex-1 flex flex-col">
                             <Input 
                                id="subject" 
                                value={result.subjectLine} 
                                readOnly 
                                className="font-semibold bg-muted" 
                            />
                            <Textarea 
                                id="body" 
                                value={result.emailBody} 
                                className="flex-1 bg-muted" 
                                readOnly 
                            />
                        </div>
                    ) : (
                         <div className="w-full text-center p-8 bg-muted rounded-lg flex items-center justify-center flex-1">
                            <p className="text-sm text-muted-foreground">Ihr E-Mail-Vorschlag wartet hier.</p>
                        </div>
                    )}
                </CardContent>
                {result && (
                    <CardFooter>
                        <Button onClick={copyToClipboard} variant="outline">
                            <Copy className="mr-2 h-4 w-4" />
                            Betreff & Text kopieren
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
