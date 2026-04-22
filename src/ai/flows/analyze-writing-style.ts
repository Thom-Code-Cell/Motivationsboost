
'use server';
/**
 * @fileOverview An AI agent that analyzes a user's writing style from a text sample.
 *
 * - analyzeWritingStyle - A function that handles the style analysis.
 * - AnalyzeWritingStyleInput - The input type for the function.
 * - AnalyzeWritingStyleOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  AnalyzeWritingStyleInputSchema,
  AnalyzeWritingStyleOutputSchema,
  type AnalyzeWritingStyleInput,
  type AnalyzeWritingStyleOutput,
} from '@/ai/schemas';

const languageMap: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  it: 'Italienisch',
};

export async function analyzeWritingStyle(input: AnalyzeWritingStyleInput): Promise<AnalyzeWritingStyleOutput> {
  return analyzeWritingStyleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeWritingStylePrompt',
  input: {schema: AnalyzeWritingStyleInputSchema.extend({ languageName: z.string() })},
  output: {schema: AnalyzeWritingStyleOutputSchema},
  prompt: `You are an expert writing coach and linguist. Analyze the following text sample provided by the user to create a "Style Fingerprint".

IMPORTANT: The entire analysis and all output fields must be in the language: {{{languageName}}}.

**Text Sample to Analyze:**
---
{{{textSample}}}
---

Please perform the following analysis in {{{languageName}}}:
1.  **Tonality:** Describe the overall tone of the text in 2-3 adjectives (e.g., "Formell, sachlich, distanziert" or "Locker, enthusiastisch, persönlich").
2.  **Vocabulary:** Characterize the vocabulary used (e.g., "Einfach und klar", "Komplex und akademisch", "Reich an branchenspezifischen Begriffen").
3.  **Sentence Structure:** Describe the sentence structure (e.g., "Kurze, prägnante Sätze", "Lange, verschachtelte Sätze mit vielen Nebensätzen").
4.  **Positive Impression:** What is good about this writing style? What are its strengths? (2-3 sentences).
5.  **Improvement Potential:** What could be improved or adapted depending on the context (e.g., for a formal application vs. a creative one)? Provide actionable advice. (2-3 sentences).
`,
});

const analyzeWritingStyleFlow = ai.defineFlow(
  {
    name: 'analyzeWritingStyleFlow',
    inputSchema: AnalyzeWritingStyleInputSchema,
    outputSchema: AnalyzeWritingStyleOutputSchema,
  },
  async (input) => {
    const languageName = languageMap[input.language] || 'Deutsch';
    const {output} = await prompt({...input, languageName});
    return output!;
  }
);
