
'use server';
/**
 * @fileOverview An AI agent that identifies and fills gaps in a CV.
 *
 * - autofillCVGaps - A function that handles the CV gap filling process.
 * - AutofillCVGapsInput - The input type for the autofillCVGaps function.
 * - AutofillCVGapsOutput - The return type for the autofillCVGaps function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
    AutofillCVGapsInputSchema,
    AutofillCVGapsOutputSchema,
    type AutofillCVGapsInput,
    type AutofillCVGapsOutput
} from '@/ai/schemas';

const languageMap: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  it: 'Italienisch',
};

export async function autofillCVGaps(input: AutofillCVGapsInput): Promise<AutofillCVGapsOutput> {
  return autofillCVGapsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'autofillCVGapsPrompt',
  input: {schema: AutofillCVGapsInputSchema.extend({ languageName: z.string() })},
  output: {schema: AutofillCVGapsOutputSchema},
  prompt: `You are an expert career advisor. You will review the provided CV text and identify any gaps in the work history. Never fill a gap with a plausible but unverified explanation. The goal is to IDENTIFY open date ranges, preserve every documented experience unchanged and insert a clearly marked [OFFENE RÜCKFRAGE: Zeitraum ... bitte vom Bewerber erklären] for the applicant to answer. Do not invent education, travel, work, family leave or personal development. This output requires manual review before use.

IMPORTANT: The entire revised CV must be written in the language: {{{languageName}}}.

CV Text: {{{cvText}}}

Revised CV Text with Gaps Filled:`,
});

const autofillCVGapsFlow = ai.defineFlow(
  {
    name: 'autofillCVGapsFlow',
    inputSchema: AutofillCVGapsInputSchema,
    outputSchema: AutofillCVGapsOutputSchema,
  },
  async input => {
    const languageName = languageMap[input.language] || 'Deutsch';
    const {output} = await prompt({...input, languageName});
    return {filledCvText: output!.filledCvText!};
  }
);
