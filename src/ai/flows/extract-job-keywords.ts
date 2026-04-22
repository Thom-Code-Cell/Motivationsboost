
'use server';
/**
 * @fileOverview An AI agent that extracts structured keywords and a summary from a job posting URL.
 *
 * - extractJobKeywords - A function that handles the keyword extraction process.
 * - ExtractJobKeywordsInput - The input type for the extractJobKeywords function.
 * - ExtractJobKeywordsOutput - The return type for the extractJobKeywords function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
    ExtractJobKeywordsInputSchema,
    ExtractJobKeywordsOutputSchema,
    type ExtractJobKeywordsInput,
    type ExtractJobKeywordsOutput,
} from '@/ai/schemas';

const languageMap: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  it: 'Italienisch',
};


export async function extractJobKeywords(input: ExtractJobKeywordsInput): Promise<ExtractJobKeywordsOutput> {
  return extractJobKeywordsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractJobKeywordsPrompt',
  input: {schema: ExtractJobKeywordsInputSchema.extend({ languageName: z.string() })},
  output: {schema: ExtractJobKeywordsOutputSchema},
  prompt: `You are an ATS optimization assistant. Analyze the job posting at this URL: {{{jobUrl}}}

Extract a structured list of the most important keywords for application documents.

IMPORTANT: The output, including all keywords and the summary, must be in the language: {{{languageName}}}.

Provide three lists, each with a maximum of 10 entries:

1.  **Fachliche Kompetenzen & Tools** (Technical Skills & Tools) – e.g., SAP, Excel, Projektmanagement, CRM, JavaScript
2.  **Soft Skills & Persönlichkeitsmerkmale** (Soft Skills & Personality Traits) – e.g., teamfähig, flexibel, analytisch, belastbar
3.  **Schlüsselbegriffe & Aufgabenbeschreibungen** (Keywords & Task Descriptions) – e.g., Kundenberatung, Prozessoptimierung, Personalführung

Additionally, provide a short text (2–3 sentences) with a **kompakten Zusammenfassung der Anzeigenschwerpunkte** (concise summary of the job's focus) to align a cover letter later.
`,
});

const extractJobKeywordsFlow = ai.defineFlow(
  {
    name: 'extractJobKeywordsFlow',
    inputSchema: ExtractJobKeywordsInputSchema,
    outputSchema: ExtractJobKeywordsOutputSchema,
  },
  async input => {
    const languageName = languageMap[input.language] || 'Deutsch';
    const {output} = await prompt({...input, languageName});
    return output!;
  }
);
