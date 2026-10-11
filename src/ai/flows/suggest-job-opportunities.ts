
'use server';
/**
 * @fileOverview An AI career strategist that suggests job opportunities based on a user's CV.
 *
 * - suggestJobOpportunities - A function that handles the job suggestion process.
 * - SuggestJobOpportunitiesInput - The input type for the function.
 * - SuggestJobOpportunitiesOutput - The return type for the function.
 */

import { authorizeAI } from '@/lib/server/session';
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {
  SuggestJobOpportunitiesInputSchema,
  SuggestJobOpportunitiesOutputSchema,
  type SuggestJobOpportunitiesInput,
  type SuggestJobOpportunitiesOutput,
  type GenerateCvFromDocumentsOutput,
} from '@/ai/schemas';

const languageMap: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  it: 'Italienisch',
};

// This wrapper function now explicitly allows cvData to be null, matching the UI's state.
export async function suggestJobOpportunities(
  input: SuggestJobOpportunitiesInput
): Promise<SuggestJobOpportunitiesOutput> {
  input = SuggestJobOpportunitiesInputSchema.parse(input);
  await authorizeAI(input);
  return suggestJobOpportunitiesFlow(input);
}

// Helper to format CV data for the prompt
function formatCvForPrompt(cvData: GenerateCvFromDocumentsOutput): string {
    let cvContext = `Summary: ${cvData.summary}\n\n`;
    cvData.sections.forEach(section => {
      cvContext += `Section: ${section.title}\n`;
      section.items.forEach(item => {
        cvContext += `- ${item.title} at ${item.subtitle} (${item.date})\n  Description: ${item.description.replace(/\n/g, ' ')}\n`;
      });
    });
    cvContext += `\nSkills: ${cvData.skills.join(', ')}`;
    return cvContext;
}

const prompt = ai.definePrompt({
  name: 'suggestJobOpportunitiesPrompt',
  input: {
    schema: SuggestJobOpportunitiesInputSchema.extend({
      cvContext: z.string(),
      languageName: z.string(),
    }),
  },
  output: {schema: SuggestJobOpportunitiesOutputSchema},
  prompt: `You are an expert career strategist and headhunter. Your task is to analyze the provided CV and create a targeted job search strategy for the user's desired location.

IMPORTANT: All output text (summaries, titles, company names) must be in the language: {{{languageName}}}.

**User's Location:**
{{{location}}}

**User's CV Data:**
---
{{{cvContext}}}
---

Based on this information, please generate the following:

1.  **Strategy Summary:** A 2-3 sentence summary of the recommended job search strategy, highlighting the user's key strengths for the market.
2.  **Suggested Job Titles:** A list of 5-7 specific and relevant job titles or search keywords. Include both common and niche titles to broaden the search.
3.  **Suggested Companies:** A list of 5-7 potential employers in or around the user's location that are known to hire for these roles. Include a mix of large corporations and interesting smaller companies if possible.
4.  **Search Links:** Create direct, pre-filled search URLs for Google Jobs and LinkedIn. Use the top 3 most relevant suggested job titles (URL-encoded) and the user's location in the query. For example: \`https://www.linkedin.com/jobs/search/?keywords=URL_ENCODED_TITLE_1%20OR%20URL_ENCODED_TITLE_2&location=URL_ENCODED_LOCATION\`
`,
});

const suggestJobOpportunitiesFlow = ai.defineFlow(
  {
    name: 'suggestJobOpportunitiesFlow',
    inputSchema: SuggestJobOpportunitiesInputSchema,
    outputSchema: SuggestJobOpportunitiesOutputSchema,
  },
  async input => {
    if (!input.cvData) {
      throw new Error("CV data is required to suggest job opportunities.");
    }
    const cvContext = formatCvForPrompt(input.cvData);
    const languageName = languageMap[input.language] || 'Deutsch';

    const {output} = await prompt({
      ...input,
      cvContext,
      languageName,
    });

    if (!output) throw new Error('Die KI hat kein verwertbares Ergebnis geliefert. Bitte erneut versuchen.');
    return output;
  }
);
