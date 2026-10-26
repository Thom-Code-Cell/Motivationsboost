
'use server';
/**
 * @fileOverview An AI agent that refines application documents for ATS compatibility.
 *
 * - refineDocumentsForATS - A function that handles the document refinement process.
 * - RefineDocumentsForATSInput - The input type for the refineDocumentsForATS function.
 * - RefineDocumentsForATSOutput - The return type for the refineDocumentsForATS function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
    RefineDocumentsForATSInputSchema,
    RefineDocumentsForATSOutputSchema,
    type RefineDocumentsForATSInput,
    type RefineDocumentsForATSOutput
} from '@/ai/schemas';

const languageMap: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  it: 'Italienisch',
};

export async function refineDocumentsForATS(input: RefineDocumentsForATSInput): Promise<RefineDocumentsForATSOutput> {
  return refineDocumentsForATSFlow(input);
}

const prompt = ai.definePrompt({
  name: 'refineDocumentsForATSPrompt',
  input: {schema: RefineDocumentsForATSInputSchema.extend({ languageName: z.string() })},
  output: {schema: RefineDocumentsForATSOutputSchema},
  prompt: `You are an application expert and copywriter. Your task is to optimize the following application texts by integrating the missing relevant terms from the job description—naturally, credibly, and subtly.

The goal is:
- The texts should be ATS-optimized.
- Only include a missing term if the ORIGINAL DOCUMENTS already give clear evidence the applicant possesses that qualification or skill.
- If a required keyword is unsupported, DO NOT add it or invent corresponding experience.
- Keep roles, employers, achievements, dates, qualifications and numbers factually unchanged.
- This is an editorial relevance check, not a measurement of ATS acceptance or job success.
- The style and tonality should remain human, direct, and individual.
- The text should sound professional and not like an AI text. Avoid clichés, repetitions, and artificial-sounding sentences.

IMPORTANT: The entire output must be in the language: {{{languageName}}}.

**Original CV:**
{{{cvText}}}

**Original Cover Letter:**
{{{coverLetterText}}}


**Here are the missing terms from the job posting to integrate:**
{{#each missingKeywords}}
- {{{this}}}
{{/each}}

Create an optimized version for both documents in {{{languageName}}}.
`,
});

const refineDocumentsForATSFlow = ai.defineFlow(
  {
    name: 'refineDocumentsForATSFlow',
    inputSchema: RefineDocumentsForATSInputSchema,
    outputSchema: RefineDocumentsForATSOutputSchema,
  },
  async input => {
    const languageName = languageMap[input.language] || 'Deutsch';
    const {output} = await prompt({...input, languageName});
    return output!;
  }
);
