
'use server';
/**
 * @fileOverview An AI agent that generates marketing content for various platforms.
 *
 * - generateMarketingContent - A function that handles the content generation.
 * - GenerateMarketingContentInput - The input type for the function.
 * - GenerateMarketingContentOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  GenerateMarketingContentInputSchema,
  GenerateMarketingContentOutputSchema,
  type GenerateMarketingContentInput,
  type GenerateMarketingContentOutput,
} from '@/ai/schemas';

const languageMap: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  it: 'Italienisch'
};

export async function generateMarketingContent(input: GenerateMarketingContentInput): Promise<GenerateMarketingContentOutput> {
  return generateMarketingContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMarketingContentPrompt',
  input: {schema: GenerateMarketingContentInputSchema.extend({ languageName: z.string() })},
  output: {schema: GenerateMarketingContentOutputSchema},
  prompt: `You are a creative and experienced social media marketing expert for a SaaS application called "Bewerbung leicht gemacht mit AI". This app helps users create better job applications.

Your task is to generate compelling marketing content in the specified format and language.

**Language:** {{{languageName}}}
**Format:** {{{format}}}
**Topic/Core Message:**
{{{topic}}}

**Instructions:**
-   **For 'LinkedIn Post' or 'Blog Article':**
    -   Create an engaging headline.
    -   Write a professional, value-oriented text.
    -   Structure the text with clear paragraphs and maybe bullet points.
    -   End with a clear call-to-action (e.g., "Try it now!", "Optimize your CV today!").
    -   Include 3-5 relevant hashtags (e.g., #Bewerbung, #Karriere, #Jobsuche, #Lebenslauf, #AI).
-   **For 'Tweet':**
    -   Be concise and impactful (under 280 characters).
    -   Use a strong hook to grab attention.
    -   Include 2-3 relevant hashtags.
    -   A call-to-action is optional but recommended.

Generate the content now based on these instructions.`,
});

const generateMarketingContentFlow = ai.defineFlow(
  {
    name: 'generateMarketingContentFlow',
    inputSchema: GenerateMarketingContentInputSchema,
    outputSchema: GenerateMarketingContentOutputSchema,
  },
  async input => {
    const languageName = languageMap[input.language] || 'Deutsch';
    const {output} = await prompt({...input, languageName});
    return output!;
  }
);
