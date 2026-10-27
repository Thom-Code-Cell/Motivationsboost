
"use client";
import { LanguageSchema } from '@/ai/schemas';


import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod/v3';
import { useToast } from '@/hooks/use-toast';
import { generateMarketingContent } from '@/ai/flows/generate-marketing-content';
import type { GenerateMarketingContentOutput, Language } from '@/ai/schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/core-textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Copy, Sparkles, Send } from 'lucide-react';
import { LanguageSelect } from './language-select';

const formSchema = z.object({
  topic: z.string().min(10, "Bitte beschreiben Sie das Thema mit mindestens 10 Zeichen."),
  format: z.enum(['LinkedIn Post', 'Tweet', 'Blog Article']),
  language: LanguageSchema,
});

export function MarketingCopilot() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<GenerateMarketingContentOutput | null>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            topic: '',
            format: 'LinkedIn Post',
            language: 'de'
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setResult(null);
        try {
            const response = await generateMarketingContent({
                ...values,
                format: values.format as 'LinkedIn Post' | 'Tweet' | 'Blog Article',
            });
            setResult(response);
        } catch (error) {
            console.error("Error generating marketing content:", error);
            toast({
                title: "Fehler",
                description: "Der Marketing-Inhalt konnte nicht generiert werden.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }

    const copyToClipboard = () => {
        if (!result?.content) return;
        const fullText = result.headline ? `${result.headline}\n\n${result.content}` : result.content;
        navigator.clipboard.writeText(fullText);
        toast({ title: 'Inhalt kopiert!', description: 'Der Text wurde in die Zwischenablage kopiert.' });
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardHeader>
                            <CardTitle>Marketing-Generator</CardTitle>
                            <CardDescription>
                                Geben Sie ein Thema vor und die KI erstellt den passenden Inhalt für Ihre Marketing-Kanäle.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <FormField
                                control={form.control}
                                name="topic"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Thema oder Kernaussage</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="z.B. Launch eines neuen Features: der Interview-Coach. Oder: Ein Nutzer hat dank unserer App seinen Traumjob gefunden." {...field} className="min-h-[120px]" />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="format"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Format</FormLabel>
                                        <Select onValueChange={(value) => field.onChange(value as 'LinkedIn Post' | 'Tweet' | 'Blog Article')} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="LinkedIn Post">LinkedIn Post</SelectItem>
                                                <SelectItem value="Tweet">Tweet (X)</SelectItem>
                                                <SelectItem value="Blog Article">Blog Artikel</SelectItem>
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
                                        <FormLabel>Sprache</FormLabel>
                                        <LanguageSelect onValueChange={field.onChange} defaultValue={field.value} />
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Inhalt erstellen
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
            
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Generierter Inhalt</CardTitle>
                    <CardDescription>
                        Hier erscheint der von der KI erstellte Text. Sie können ihn bei Bedarf anpassen und dann kopieren.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex">
                    {isLoading ? (
                         <div className="w-full text-center p-8 bg-muted rounded-lg flex items-center justify-center">
                            <div>
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                                <p className="mt-2 text-sm text-muted-foreground">Marketing-KI ist kreativ...</p>
                            </div>
                        </div>
                    ) : result ? (
                        <div className="w-full space-y-4">
                            {result.headline && (
                                <h3 className="text-xl font-bold">{result.headline}</h3>
                            )}
                            <Textarea value={result.content} className="min-h-[300px] flex-1 bg-muted" readOnly />
                        </div>
                    ) : (
                         <div className="w-full text-center p-8 bg-muted rounded-lg flex items-center justify-center">
                            <p className="text-sm text-muted-foreground">Ihr Marketing-Text wartet hier.</p>
                        </div>
                    )}
                </CardContent>
                {result && (
                    <CardFooter>
                        <Button onClick={copyToClipboard} variant="outline">
                            <Copy className="mr-2 h-4 w-4" />
                            Text kopieren
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
