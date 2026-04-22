
'use server';
/**
 * @fileOverview An AI agent that generates a LinkedIn profile summary from structured CV data.
 *
 * - generateLinkedInSummary - A function that handles the profile summary generation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  GenerateLinkedInSummaryInputSchema,
  GenerateLinkedInSummaryOutputSchema,
  type GenerateLinkedInSummaryInput,
  type GenerateLinkedInSummaryOutput,
  type GenerateCvFromDocumentsOutput,
} from '@/ai/schemas';

const languageMap: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  it: 'Italienisch',
};

// This wrapper function now explicitly allows cvData to be null, matching the UI's state.
export async function generateLinkedInSummary(
  input: GenerateLinkedInSummaryInput
): Promise<GenerateLinkedInSummaryOutput> {
  return generateLinkedInSummaryFlow(input);
}

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
  name: 'generateLinkedInSummaryPrompt',
  input: {
    schema: GenerateLinkedInSummaryInputSchema.extend({
      cvContext: z.string(),
      languageName: z.string(),
    }),
  },
  output: {schema: GenerateLinkedInSummaryOutputSchema},
  prompt: `You are an expert in personal branding and LinkedIn optimization.
Your task is to create a compelling LinkedIn summary ("About" section) from the following CV information.

IMPORTANT: The entire summary must be written in the language: {{{languageName}}}.

**Context from CV:**
{{{cvContext}}}

{{#if userStyleSample}}
**User's Style Sample (for guidance on tone and word choice):**
---
{{{userStyleSample}}}
---
{{/if}}

Based on this information, please generate an authentic, easy-to-read summary.
- Write in a motivational and professional tone, but not exaggerated.
- Avoid generic phrases.
- Structure the text into 3-5 meaningful paragraphs.
- The text is intended for the "About" section on LinkedIn.
`,
});

const generateLinkedInSummaryFlow = ai.defineFlow(
  {
    name: 'generateLinkedInSummaryFlow',
    inputSchema: GenerateLinkedInSummaryInputSchema,
    outputSchema: GenerateLinkedInSummaryOutputSchema,
  },
  async input => {
    if (!input.cvData) {
        throw new Error("CV data is required to generate a LinkedIn summary.");
    }
    const cvContext = formatCvForPrompt(input.cvData);
    const languageName = languageMap[input.language] || 'Deutsch';

    const {output} = await prompt({
      ...input,
      cvContext: cvContext,
      languageName: languageName,
    });

    return output!;
  }
);
