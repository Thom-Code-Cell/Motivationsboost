
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a personalized cover letter based on a job URL, a selected motivation style, and user data.
 *
 * - generateMotivationLetter - A function that orchestrates the cover letter generation process.
 * - GenerateMotivationLetterInput - The input type for the generateMotivationLetter function, including the job URL, style selection, CV data, and user profile.
 * - GenerateMotivationLetterOutput - The return type for the generateMotivationLetter function, providing the generated cover letter text.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
    GenerateMotivationLetterInputSchema,
    GenerateMotivationLetterOutputSchema,
    type GenerateMotivationLetterInput,
    type GenerateMotivationLetterOutput
} from '@/ai/schemas';

const languageMap: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  it: 'Italienisch',
};

export async function generateMotivationLetter(input: GenerateMotivationLetterInput): Promise<GenerateMotivationLetterOutput> {
  return generateMotivationLetterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMotivationLetterPrompt',
  input: {schema: GenerateMotivationLetterInputSchema.extend({ languageName: z.string() })},
  output: {schema: GenerateMotivationLetterOutputSchema},
  prompt: `Create a modern, personalized cover letter in the style *{{{stilwahl}}}* for an application to the following job posting: {{{jobUrl}}}.
IMPORTANT: The entire cover letter must be written in the language: {{{languageName}}}. Consider cultural nuances for that language (e.g., more formal in French, more direct in English).

{{#if jobSummary}}
The focus of the job ad is: {{{jobSummary}}}. Align the letter to show how you meet these key points.
{{/if}}
{{#if keywords}}
Naturally integrate the following keywords and requirements to maximize ATS compatibility: {{#each keywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}. Avoid just listing them; build them meaningfully into the text.
{{/if}}

Also use the following information about the applicant:
- CV excerpt: {{{cvDaten}}}
- Applicant profile: {{{benutzerprofil}}}

{{#if userStyleSample}}
IMPORTANT: For tonality, word choice, and sentence structure, subtly draw inspiration from the following text sample from the applicant, without copying the content, to achieve a personal style:
---
{{{userStyleSample}}}
---
{{/if}}

Focus on creating a unique text that provides concrete value to the company and avoid generic phrases.`,
});

const generateMotivationLetterFlow = ai.defineFlow(
  {
    name: 'generateMotivationLetterFlow',
    inputSchema: GenerateMotivationLetterInputSchema,
    outputSchema: GenerateMotivationLetterOutputSchema,
  },
  async input => {
    const languageName = languageMap[input.language] || 'Deutsch';
    const {output} = await prompt({...input, languageName});
    return output!;
  }
);
