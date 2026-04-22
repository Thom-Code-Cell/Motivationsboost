
'use server';
/**
 * @fileOverview An AI agent that analyzes a user's answer to an interview question.
 *
 * - analyzeInterviewAnswer - A function that handles the answer analysis.
 * - AnalyzeInterviewAnswerInput - The input type for the function.
 * - AnalyzeInterviewAnswerOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  AnalyzeInterviewAnswerInputSchema,
  AnalyzeInterviewAnswerOutputSchema,
  type AnalyzeInterviewAnswerInput,
  type AnalyzeInterviewAnswerOutput,
} from '@/ai/schemas';

const languageMap: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  it: 'Italienisch',
};

export async function analyzeInterviewAnswer(input: AnalyzeInterviewAnswerInput): Promise<AnalyzeInterviewAnswerOutput> {
  return analyzeInterviewAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeInterviewAnswerPrompt',
  input: {schema: AnalyzeInterviewAnswerInputSchema.extend({ languageName: z.string() })},
  output: {schema: AnalyzeInterviewAnswerOutputSchema},
  prompt: `You are an expert interview coach. Your task is to analyze the user's answer to an interview question in the context of a specific job posting and the applicant's CV.

IMPORTANT: The entire analysis and all output fields must be in the language: {{{languageName}}}.

**Job Posting URL (for context):**
{{{jobUrl}}}

{{#if cvData}}
**Applicant's CV (for context):**
---
{{{cvData}}}
---
{{/if}}

**Interview Question:**
"{{{question}}}"

**User's Answer:**
"{{{userAnswer}}}"

{{#if userStyleSample}}
**User's Writing Style Sample (for Tonal-Inspiration for the example answer):**
---
{{{userStyleSample}}}
---
{{/if}}

Please perform the following analysis in {{{languageName}}}:
1.  **Rate the Answer (Relevance Score):** Give a score from 0 to 100. Consider relevance to the question, relevance to the CV and job, use of examples, structure (like the STAR method for behavioral questions), and clarity.
2.  **Provide Improvement Suggestions:** Give specific, constructive feedback. What could be clearer? Where could the user add a better example from their experience shown in the CV? Is the STAR method (Situation, Task, Action, Result) used effectively?
3.  **Provide an Example Answer:** Write a strong, example answer to the question. It should be professional, confident, and well-structured. If a user style sample is provided, subtly incorporate its tone and vocabulary to make the example feel more authentic to the user, but maintain professionalism.
`,
});

const analyzeInterviewAnswerFlow = ai.defineFlow(
  {
    name: 'analyzeInterviewAnswerFlow',
    inputSchema: AnalyzeInterviewAnswerInputSchema,
    outputSchema: AnalyzeInterviewAnswerOutputSchema,
  },
  async (input) => {
    const languageName = languageMap[input.language] || 'Deutsch';
    const {output} = await prompt({...input, languageName});
    return output!;
  }
);
