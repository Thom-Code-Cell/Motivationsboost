
'use server';
/**
 * @fileOverview An AI agent that identifies and fills gaps in a CV.
 *
 * - autofillCVGaps - A function that handles the CV gap filling process.
 * - AutofillCVGapsInput - The input type for the autofillCVGaps function.
 * - AutofillCVGapsOutput - The return type for the autofillCVGaps function.
 */

import { authorizeAI } from '@/lib/server/session';
import {ai} from '@/ai/genkit';
import {z} from 'zod';
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
  input = AutofillCVGapsInputSchema.parse(input);
  await authorizeAI(input);
  return autofillCVGapsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'autofillCVGapsPrompt',
  input: {schema: AutofillCVGapsInputSchema.extend({ languageName: z.string() })},
  output: {schema: AutofillCVGapsOutputSchema},
  prompt: `You are an expert career advisor. You will review the provided CV text and identify any gaps in the work history. For each gap, mark it as requiring clarification from the applicant. Never invent education, employment, activities or explanations. Preserve dates and facts; suggestions must be explicitly labelled as suggestions awaiting confirmation.

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
    if (!output) throw new Error('Kein KI-Ergebnis.');
    return output;
  }
);
