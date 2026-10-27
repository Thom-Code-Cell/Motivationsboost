
"use client";
import { Textarea } from '@/components/ui/core-textarea';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod/v3';
import { useToast } from '@/hooks/use-toast';
import { checkLetterQuality } from '@/lib/letter-quality';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileArchive, Loader2, Info, Lock, ListChecks, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { createTextPdf } from '@/lib/export-documents';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import type { UserData } from '@/types/user';
import { type GenerateCvFromDocumentsOutput, type AnalyzeRequiredDocumentsOutput } from '@/ai/schemas';
import { analyzeRequiredDocuments } from '@/ai/flows/analyze-required-documents';
import { listDriveFiles } from '@/services/drive';
import { Input } from './ui/core-input';
import { Separator } from './ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface ExportCenterProps {
    cvTextOverride?: string | null;
    userData: UserData | null;
    accessToken: string | null;
    cvJson: GenerateCvFromDocumentsOutput | null;
    linkedinSummary: string | null;
    motivationLetter: string | null;
}

const formSchema = z.object({
  jobText: z.string().max(50000).optional(),
  jobUrl: z.string().url({ message: "Bitte geben Sie eine gültige URL zur Stellenanzeige ein." }),
});


// Helper function to generate a text representation of the CV for PDF
const generateCvTextForPdf = (cv: GenerateCvFromDocumentsOutput): string => {
    let text = `${cv.personalInfo.name}\n\n`;
    text += `Kontakt:\n`;
    text += `${cv.personalInfo.email} | ${cv.personalInfo.phone}\n`;
    text += `${cv.personalInfo.address}\n`;
    if (cv.personalInfo.linkedin) text += `LinkedIn: ${cv.personalInfo.linkedin}\n`;

    text += `\n----------------------\nZUSAMMENFASSUNG\n----------------------\n${cv.summary}\n\n`;

    cv.sections.forEach(section => {
        text += `----------------------\n${section.title.toUpperCase()}\n----------------------\n\n`;
        section.items.forEach(item => {
            text += `${item.date}\n`;
            text += `${item.title.toUpperCase()} bei ${item.subtitle.toUpperCase()}\n`;
            text += `${item.description.replace(/^- /gm, '  • ')}\n\n`;
        });
    });

    text += `----------------------\nKENNTNISSE\n----------------------\n${cv.skills.join(' | ')}`;
    return text;
};

// Helper for DOCX CV generation
const generateCvDocx = (cv: GenerateCvFromDocumentsOutput): Document => {
     const formatDescription = (desc: string) => {
       return desc.split('\n').filter(d => d.trim() !== '').map(line => new Paragraph({ text: line.replace(/^- /, ''), bullet: { level: 0 } }))
    }

    return new Document({
        sections: [{
            children: [
                new Paragraph({ text: cv.personalInfo.name, heading: HeadingLevel.TITLE }),
                new Paragraph({
                    children: [
                        new TextRun(cv.personalInfo.email),
                        new TextRun("\t|\t"),
                        new TextRun(cv.personalInfo.phone),
                        new TextRun("\t|\t"),
                        new TextRun(cv.personalInfo.address),
                    ],
                    alignment: AlignmentType.CENTER
                }),
                new Paragraph({ children: [new TextRun({ text: cv.personalInfo.linkedin || '', style: "Hyperlink" })], alignment: AlignmentType.CENTER }),

                new Paragraph({ text: "Zusammenfassung", heading: HeadingLevel.HEADING_1, border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } } }),
                new Paragraph(cv.summary),
                new Paragraph(""),

                ...cv.sections.flatMap(section => [
                    new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1, border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } } }),
                    ...section.items.flatMap(item => [
                         new Paragraph({
                            children: [
                                new TextRun({ text: `${item.title} bei ${item.subtitle}`, bold: true }),
                                new TextRun({ text: `\t${item.date}`, italics: true }),
                            ],
                            spacing: { before: 200 }
                        }),
                        ...formatDescription(item.description),
                    ]),
                     new Paragraph(""),
                ]),

                new Paragraph({ text: "Kenntnisse", heading: HeadingLevel.HEADING_1, border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } } }),
                new Paragraph(cv.skills.join(' • ')),
            ],
        }],
    });
}


export function ExportCenter({ cvTextOverride, userData, accessToken, cvJson, linkedinSummary, motivationLetter }: ExportCenterProps) {
    const [includeCv, setIncludeCv] = useState(true);
    const [includeLetter, setIncludeLetter] = useState(true);
    const [includeLinkedin, setIncludeLinkedin] = useState(true);
    const [exportConfirmed, setExportConfirmed] = useState(false);
    const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingDocs, setIsCheckingDocs] = useState(false);
    const [checkResult, setCheckResult] = useState<AnalyzeRequiredDocumentsOutput | null>(null);
    const [driveFiles, setDriveFiles] = useState<string[]>([]);
    const { toast } = useToast();
    const isPro = userData?.plan === 'pro_month' || userData?.subscriptionStatus === 'active';
    const letterFindings = includeLetter && motivationLetter ? checkLetterQuality(motivationLetter) : [];

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { jobUrl: "" },
    });

    useEffect(() => {
        if (accessToken) {
            listDriveFiles(accessToken).then(files => setDriveFiles(files.map(f => f.name))).catch(() => toast({ title: 'Drive-Dateien konnten nicht geladen werden', variant: 'destructive' }));
        }
    }, [accessToken]);


    useEffect(() => { setExportConfirmed(false); }, [cvJson, cvTextOverride, motivationLetter, linkedinSummary, includeCv, includeLetter, includeLinkedin]);

    const handleExport = async () => {
        if (!exportConfirmed) {
            toast({ title: 'Freigabe fehlt', description: 'Bitte kontrolliere alle Angaben und bestätige die Freigabe.', variant: 'destructive' });
            return;
        }
        setIsLoading(true);
        try {
            if (!userData) throw new Error("Benutzerdaten nicht gefunden.");

            if (format === 'docx' && !isPro) throw new Error('Der Word-Export erfordert einen aktiven Pro-Zugang.');
            const zip = new JSZip();
            let fileCount = 0;

            // --- CV Generation ---
            if (includeCv && (cvJson || cvTextOverride)) {
                if (format === 'pdf') {
                    const doc = createTextPdf(cvTextOverride || generateCvTextForPdf(cvJson!));
                    zip.file("Lebenslauf.pdf", doc.output('blob'));
                } else if (format === 'docx' && isPro) {
                    const doc = cvTextOverride ? new Document({ sections: [{ children: cvTextOverride.split('\n').map(text => new Paragraph(text)) }] }) : generateCvDocx(cvJson!);
                    const blob = await Packer.toBlob(doc);
                    zip.file("Lebenslauf.docx", blob);
                }
                fileCount++;
            }

            // --- Letter Generation ---
            if (includeLetter && motivationLetter) {
                 if (format === 'pdf') {
                    const doc = createTextPdf(motivationLetter);
                    zip.file("Motivationsschreiben.pdf", doc.output('blob'));
                } else if (format === 'docx' && isPro) {
                    const doc = new Document({ sections: [{ children: motivationLetter.split('\n').map(t => new Paragraph(t)) }] });
                    const blob = await Packer.toBlob(doc);
                    zip.file("Motivationsschreiben.docx", blob);
                }
                 fileCount++;
            }

            // --- LinkedIn Summary (always as .txt) ---
            if (includeLinkedin && linkedinSummary) {
                zip.file("LinkedIn_Profil.txt", linkedinSummary);
                fileCount++;
            }

            if (fileCount === 0) {
                toast({
                    title: "Keine Dokumente ausgewählt",
                    description: "Bitte wählen Sie mindestens ein Dokument für den Export aus oder generieren Sie zuerst welche.",
                    variant: "destructive"
                });
                setIsLoading(false);
                return;
            }

            const zipBlob = await zip.generateAsync({ type: "blob" });
            saveAs(zipBlob, `Bewerbungsmappe_${new Date().toISOString().split('T')[0]}_${format}.zip`);

            toast({
                title: "Export erfolgreich",
                description: `Ihre Bewerbungsmappe im ${format.toUpperCase()}-Format wird heruntergeladen.`
            });

        } catch (error) {
            console.error("Export failed:", error);
            const message = error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten.";
            toast({
                title: "Export fehlgeschlagen",
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckDocuments = async (values: z.infer<typeof formSchema>) => {
        setIsCheckingDocs(true);
        setCheckResult(null);
        try {
            if (!userData) throw new Error("Benutzerdaten nicht gefunden.");
            const result = await analyzeRequiredDocuments({
                jobUrl: values.jobUrl,
          jobText: values.jobText,
                language: userData.language,
            });
            setCheckResult(result);
            if (accessToken) {
                // Refresh drive file list
                listDriveFiles(accessToken).then(files => setDriveFiles(files.map(f => f.name))).catch(() => toast({ title: 'Drive-Dateien konnten nicht geladen werden', variant: 'destructive' }));
            }

        } catch (error) {
            toast({
                title: "Fehler beim Dokumenten-Check",
                description: "Die Analyse konnte nicht durchgeführt werden.",
                variant: "destructive"
            });
        } finally {
            setIsCheckingDocs(false);
        }
    }

    const doesFileExist = (requiredDoc: string) => {
        const normalizedDoc = requiredDoc.toLowerCase().replace(/[\s-]/g, '');
        return driveFiles.some(driveFile => {
            const normalizedDriveFile = driveFile.toLowerCase().replace(/[\s-]/g, '').split('.')[0];
            return normalizedDriveFile.includes(normalizedDoc) || normalizedDoc.includes(normalizedDriveFile);
        });
    };


    return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card>
            <CardHeader>
                <CardTitle>Export-Zentrale</CardTitle>
                <CardDescription>Stellen Sie hier Ihre Bewerbungsmappe zusammen und exportieren Sie alle Dokumente gebündelt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-semibold">Dokumente für ZIP-Mappe auswählen</h3>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="cv" checked={includeCv} onCheckedChange={(checked) => setIncludeCv(!!checked)} disabled={!cvJson && !cvTextOverride} />
                        <Label htmlFor="cv" className="flex-grow">Lebenslauf</Label>
                        {!cvJson && <span className="text-xs text-muted-foreground">Noch nicht generiert</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="letter" checked={includeLetter} onCheckedChange={(checked) => setIncludeLetter(!!checked)} disabled={!motivationLetter} />
                        <Label htmlFor="letter" className="flex-grow">Motivationsschreiben</Label>
                        {!motivationLetter && <span className="text-xs text-muted-foreground">Noch nicht generiert</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="linkedin" checked={includeLinkedin} onCheckedChange={(checked) => setIncludeLinkedin(!!checked)} disabled={!linkedinSummary} />
                        <Label htmlFor="linkedin" className="flex-grow">LinkedIn Profiltext (.txt)</Label>
                         {!linkedinSummary && <span className="text-xs text-muted-foreground">Noch nicht generiert</span>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="format">Exportformat (für CV & Anschreiben)</Label>
                    <Select value={format} onValueChange={(value) => setFormat(value as 'pdf' | 'docx')} disabled={isLoading}>
                        <SelectTrigger id="format">
                            <SelectValue placeholder="Format wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="docx" disabled={!isPro}>
                                <div className="flex items-center justify-between w-full">
                                    <span>DOCX (Word)</span>
                                    {!isPro && <Lock className="h-3 w-3 text-muted-foreground" />}
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                     {!isPro && <p className="text-xs text-muted-foreground">Der DOCX-Export ist eine Pro-Funktion.</p>}
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                    <p className="font-medium">Deine letzte Prüfung vor dem Versand</p>
                    <p className="text-sm text-muted-foreground">
                        Prüfe sämtliche Zeiträume, Stellenbezeichnungen, Diplome, Zahlen, Kontaktdaten
                        und den Arbeitgeberbezug. Eine KI kann diese Angaben nicht selbst zuverlässig bestätigen.
                    </p>
                    {letterFindings.length > 0 && (
                        <ul className="list-disc pl-5 text-sm space-y-1">
                            {letterFindings.map(finding => (
                                <li key={finding.code}><strong>{finding.title}:</strong> {finding.guidance}</li>
                            ))}
                        </ul>
                    )}
                    <label className="flex items-start gap-3 text-sm">
                        <Checkbox checked={exportConfirmed} onCheckedChange={checked => setExportConfirmed(checked === true)} />
                        <span>Ich habe die ausgewählten Unterlagen geprüft. Alle Angaben entsprechen meinen tatsächlichen Erfahrungen und Nachweisen.</span>
                    </label>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleExport} disabled={isLoading || !exportConfirmed || (!includeCv && !includeLetter && !includeLinkedin)}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileArchive className="mr-2 h-4 w-4" />}
                    Bewerbungsmappe als ZIP exportieren
                </Button>
            </CardFooter>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Dokumenten-Vollständigkeits-Check</CardTitle>
                <CardDescription>Prüfen Sie, ob Sie alle für eine bestimmte Stelle benötigten Dokumente in Ihrem Drive-Ordner haben.</CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCheckDocuments)}>
                    <CardContent className="space-y-4">
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
                         <Button type="submit" disabled={isCheckingDocs}>
                            {isCheckingDocs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
                            Dokumente prüfen
                        </Button>
                    </CardContent>
                </form>
            </Form>

            {isCheckingDocs && (
                <CardContent>
                    <div className="flex items-center justify-center p-8 text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        <span>Analysiere Anforderungen...</span>
                    </div>
                </CardContent>
            )}

            {checkResult && (
                <CardContent className="space-y-4">
                     <Separator />
                     <h3 className="font-semibold">Ergebnis der Prüfung:</h3>
                     <ul className="space-y-2">
                        {checkResult.requiredDocuments.map((doc, i) => {
                             const exists = doesFileExist(doc);
                             return (
                                <li key={i} className="flex items-center gap-2 text-sm">
                                    {exists ? (
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-destructive" />
                                    )}
                                    <span>{doc}</span>
                                </li>
                            );
                        })}
                    </ul>
                </CardContent>
            )}

        </Card>
    </div>
    );
}
