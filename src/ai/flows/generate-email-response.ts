
'use server';
import { getLanguageName } from '@/lib/document-languages';

/**
 * @fileOverview An AI agent that generates professional email responses for various job application scenarios.
 *
 * - generateEmailResponse - A function that handles the email generation.
 * - GenerateEmailResponseInput - The input type for the function.
 * - GenerateEmailResponseOutput - The return type for the function.
 */

import { authorizeAI } from '@/lib/server/session';
import {ai} from '@/ai/genkit';
import {z} from 'zod/v3';
import {
  GenerateEmailResponseInputSchema,
  GenerateEmailResponseOutputSchema,
  type GenerateEmailResponseInput,
  type GenerateEmailResponseOutput,
} from '@/ai/schemas';

// Language names resolve from any valid language tag, not just four fixed locales.

const scenarioMap: Record<string, Record<string, string>> = {
    de: {
        follow_up: 'Nachfassen, weil ich seit über einer Woche keine Rückmeldung auf meine Bewerbung erhalten habe.',
        thank_you: 'Dankes-E-Mail einen Tag nach einem positiven Vorstellungsgespräch.',
        rejection_response: 'Professionelle und positive Antwort auf eine Jobabsage, um in Kontakt zu bleiben.',
        acceptance: 'Formelle Annahme eines Jobangebots.',
    },
    en: {
        follow_up: 'Follow up because I have not received a response to my application for over a week.',
        thank_you: 'Thank you email one day after a positive job interview.',
        rejection_response: 'Professional and positive response to a job rejection to stay in touch.',
        acceptance: 'Formal acceptance of a job offer.',
    },
    fr: {
        follow_up: "Relancer car je n'ai pas reçu de réponse à ma candidature depuis plus d'une semaine.",
        thank_you: "E-mail de remerciement un jour après un entretien d'embauche positif.",
        rejection_response: "Réponse professionnelle et positive à un refus d'emploi pour rester en contact.",
        acceptance: "Acceptation formelle d'une offre d'emploi.",
    },
    it: {
        follow_up: 'Sollecito perché non ho ricevuto risposta alla mia candidatura da oltre una settimana.',
        thank_you: "E-mail di ringraziamento un giorno dopo un colloquio di lavoro positivo.",
        rejection_response: "Risposta professionale e positiva a un rifiuto per rimanere in contatto.",
        acceptance: "Accettazione formale di un'offerta di lavoro.",
    },
};

export async function generateEmailResponse(input: GenerateEmailResponseInput): Promise<GenerateEmailResponseOutput> {
  input = GenerateEmailResponseInputSchema.parse(input);
  await authorizeAI(input);
  return generateEmailResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateEmailResponsePrompt',
  input: {
    schema: GenerateEmailResponseInputSchema.extend({
        languageName: z.string(),
        scenarioDescription: z.string(),
    }),
  },
  output: {schema: GenerateEmailResponseOutputSchema},
  prompt: `You are an expert in professional communication for job applicants.
Your task is to write a concise, polite, and professional email for a specific scenario.

**Language:** {{{languageName}}}
**Company Name:** {{{companyName}}}
**Job Title:** {{{jobTitle}}}
**Scenario:** {{{scenarioDescription}}}

**Instructions:**
1.  **Subject Line:** Create a clear and professional subject line. For a follow-up or thank-you email, it should include the job title.
2.  **Email Body:**
    -   Write a complete, ready-to-send email.
    -   Maintain a professional and respectful tone appropriate for the language ({{{languageName}}}).
    -   Keep the email brief and to the point.
    -   End with a professional closing.
    -   Use "[Ihr Name]" (or the equivalent in the target language) as a placeholder for the applicant's name.

Generate the email now based on these instructions.
`,
});

const generateEmailResponseFlow = ai.defineFlow(
  {
    name: 'generateEmailResponseFlow',
    inputSchema: GenerateEmailResponseInputSchema,
    outputSchema: GenerateEmailResponseOutputSchema,
  },
  async input => {
    const languageName = getLanguageName(input.language);
    const scenarioDescription = scenarioMap[input.language]?.[input.scenario] || scenarioMap['de'][input.scenario];

    const {output} = await prompt({
        ...input,
        languageName,
        scenarioDescription
    });
    if (!output) throw new Error('Die KI hat kein verwertbares Ergebnis geliefert. Bitte erneut versuchen.');
    return output;
  }
);
