
'use server';
/**
 * @fileOverview An AI agent that generates a structured CV from a collection of document texts.
 *
 * - generateCvFromDocuments - A function that handles the CV generation process.
 * - GenerateCvFromDocumentsInput - The input type for the generateCvFromDocuments function.
 * - GenerateCvFromDocumentsOutput - The return type for the generateCvFromDocuments function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GenerateCvFromDocumentsOutputSchema, GenerateCvFromDocumentsInputSchema, type GenerateCvFromDocumentsOutput, type GenerateCvFromDocumentsInput } from '@/ai/schemas';

const languageMap: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  it: 'Italienisch',
};

export async function generateCvFromDocuments(input: GenerateCvFromDocumentsInput): Promise<GenerateCvFromDocumentsOutput> {
  return generateCvFromDocumentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCvFromDocumentsPrompt',
  input: {schema: GenerateCvFromDocumentsInputSchema.extend({ languageName: z.string() })},
  output: {schema: GenerateCvFromDocumentsOutputSchema},
  prompt: `You are an expert HR manager specializing in creating professional CVs (Lebenslauf) in a structured JSON format.
You will be given the text content from multiple documents.

IMPORTANT: The entire output, including section titles (e.g., 'Work Experience' or 'Berufserfahrung') and all content, must be in the language: {{{languageName}}}.

Your task is to:
1.  Read and understand all provided document texts. Extract personal information (name, contact details if available), work experience (company, title, dates, responsibilities), education, and skills.
2.  Synthesize this information into a single, cohesive, and structured CV object.
3.  The main sections (e.g., Berufserfahrung, Ausbildung, Work Experience, Education) must be sorted chronologically, with the most recent experience at the top of each section.
4.  For descriptions, use Markdown bullet points (e.g., "- Verantwortlich für...").
5.  Infer personal data like name from the documents. If contact details are missing, use plausible placeholders like 'max.mustermann@email.de'.

Here are the document texts:
---
{{#each documentTexts}}
Dokument {{@index + 1}}:
{{{this}}}
---
{{/each}}

Generate the structured JSON output for the CV in {{{languageName}}}.
`,
});

const generateCvFromDocumentsFlow = ai.defineFlow(
  {
    name: 'generateCvFromDocumentsFlow',
    inputSchema: GenerateCvFromDocumentsInputSchema,
    outputSchema: GenerateCvFromDocumentsOutputSchema,
  },
  async input => {
    const languageName = languageMap[input.language] || 'Deutsch';
    const {output} = await prompt({...input, languageName});
    return output!;
  }
);
