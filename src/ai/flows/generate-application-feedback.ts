
'use server';

/**
 * @fileOverview A flow that provides feedback on a cover letter and CV based on a job posting.
 *
 * - generateApplicationFeedback - A function that handles the generation of application feedback.
 * - GenerateApplicationFeedbackInput - The input type for the generateApplicationFeedback function.
 * - GenerateApplicationFeedbackOutput - The return type for the generateApplicationFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
    GenerateApplicationFeedbackInputSchema,
    GenerateApplicationFeedbackOutputSchema,
    type GenerateApplicationFeedbackInput,
    type GenerateApplicationFeedbackOutput
} from '@/ai/schemas';

const languageMap: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  it: 'Italienisch',
};

export async function generateApplicationFeedback(input: GenerateApplicationFeedbackInput): Promise<GenerateApplicationFeedbackOutput> {
  return generateApplicationFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateApplicationFeedbackPrompt',
  input: {schema: GenerateApplicationFeedbackInputSchema.extend({ languageName: z.string() })},
  output: {schema: GenerateApplicationFeedbackOutputSchema},
  prompt: `You are an expert ATS (Applicant Tracking System) checker and career coach.
Your task is to analyze the provided CV and cover letter against the job description found at the given URL.

IMPORTANT: The entire analysis and all output fields must be in the language: {{{languageName}}}.

Job Description URL: {{{jobUrl}}}
Cover Letter:
{{coverLetter}}
CV:
{{cv}}

Please perform the following analysis and provide the output in the specified format and language ({{{languageName}}}):
1.  **Offer a strictly heuristic, not predictive, ATS orientation score:** This model is not connected to employers' actual ATS. A URL alone does not prove the job ad has been read. If job description text is not actually present in the input, use 0 as 'not evaluable' and explicitly explain this limitation. Never pretend you fetched the URL or saw requirements that were not provided.
2.  **Provide Score Reasoning:** Briefly explain the main factors that led to this score (e.g., "Good match on core skills, but missing specific technical terms.").
3.  **Identify Missing Keywords:** Extract the most important keywords, skills, and qualifications from the job description that are NOT present in the CV or cover letter.
4.  **Give Improvement Suggestions:** Provide clear, actionable advice on how to integrate the missing keywords and better tailor the documents to the job description to improve the score.
`,
});

const generateApplicationFeedbackFlow = ai.defineFlow(
  {
    name: 'generateApplicationFeedbackFlow',
    inputSchema: GenerateApplicationFeedbackInputSchema,
    outputSchema: GenerateApplicationFeedbackOutputSchema,
  },
  async input => {
    const languageName = languageMap[input.language] || 'Deutsch';
    const {output} = await prompt({...input, languageName});
    return output!;
  }
);
