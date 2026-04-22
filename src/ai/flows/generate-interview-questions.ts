
'use server';
/**
 * @fileOverview An AI agent that generates interview questions based on a job posting.
 *
 * - generateInterviewQuestions - A function that handles the question generation process.
 * - GenerateInterviewQuestionsInput - The input type for the function.
 * - GenerateInterviewQuestionsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
    GenerateInterviewQuestionsInputSchema,
    GenerateInterviewQuestionsOutputSchema,
    type GenerateInterviewQuestionsInput,
    type GenerateInterviewQuestionsOutput
} from '@/ai/schemas';

const languageMap: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  it: 'Italienisch',
};

export async function generateInterviewQuestions(input: GenerateInterviewQuestionsInput): Promise<GenerateInterviewQuestionsOutput> {
  return generateInterviewQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInterviewQuestionsPrompt',
  input: {schema: GenerateInterviewQuestionsInputSchema.extend({ languageName: z.string() })},
  output: {schema: GenerateInterviewQuestionsOutputSchema},
  prompt: `You are an experienced recruiter and interview coach. Analyze the job posting at the following URL: {{{jobUrl}}}
{{#if cvData}}
Also consider the applicant's CV to tailor the questions to their specific profile:
---
CV Data:
{{{cvData}}}
---
{{/if}}

Your task is to create a likely set of interview questions.
IMPORTANT: The entire output, including the summary and all questions, must be in the language: {{{languageName}}}.

1.  **Summary of the Ideal Candidate:** In 2-3 sentences, summarize the profile (hard skills, soft skills, experience) the company is looking for, considering the applicant's CV if provided.
2.  **Technical/Fachliche Fragen:** Generate a list of 5-7 specific questions that test the applicant's technical knowledge and experience, tailored to their CV.
3.  **Behavioral Questions:** Generate a list of 3-5 behavioral questions targeting the STAR method (Situation, Task, Action, Result).
4.  **Questions for the Company:** Generate a list of 3-4 intelligent questions the applicant can ask to show interest and understanding.

Ensure the questions are directly tailored to the requirements and context of the job posting and the applicant's profile.
`,
});

const generateInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateInterviewQuestionsFlow',
    inputSchema: GenerateInterviewQuestionsInputSchema,
    outputSchema: GenerateInterviewQuestionsOutputSchema,
  },
  async input => {
    const languageName = languageMap[input.language] || 'Deutsch';
    const {output} = await prompt({...input, languageName});
    return output!;
  }
);
