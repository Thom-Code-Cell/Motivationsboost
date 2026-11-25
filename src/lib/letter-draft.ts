import { z } from 'zod/v3';

export const letterDraftInput = z.object({
  cv: z.string().trim().min(40).max(12000),
  job: z.string().trim().min(40).max(12000),
  motivation: z.string().trim().min(10).max(1500),
  example: z.string().trim().min(10).max(2000),
  contribution: z.string().trim().min(10).max(1500),
}).strict();

type LetterDraftInput = z.infer<typeof letterDraftInput>;

export function guidedLetter({ motivation, example, contribution }: LetterDraftInput) {
  return [
    'Sehr geehrte Damen und Herren,', '',
    `Ihre ausgeschriebene Stelle interessiert mich, weil ${motivation.replace(/[.!?]+$/, '')}.`, '',
    `Ein konkretes Beispiel aus meiner Erfahrung: ${example.replace(/[.!?]+$/, '')}.`, '',
    `In Ihrem Unternehmen möchte ich Folgendes beitragen: ${contribution.replace(/[.!?]+$/, '')}.`, '',
    'Mein Lebenslauf und Ihre Stellenanzeige bilden die Grundlage für die weitere Anpassung dieses Entwurfs. Bitte ergänze Anrede, Unternehmen und konkrete Bezüge zur Stelle und prüfe alle Aussagen.', '',
    'Freundliche Grüsse', '[Name ergänzen]',
  ].join('\n');
}

export function prepareExternalDraftInput(values: LetterDraftInput): LetterDraftInput {
  const result = { ...values };
  for (const field of Object.keys(values) as Array<keyof LetterDraftInput>) {
    result[field] = values[field]
      .replace(/^(?:wohnadresse|adresse|geburtsdatum|ahv(?:-nummer)?|passnummer|unterschrift|referenz(?:person)?|postal address|date of birth|passport number|signature)\s*[:：].*$/gimu, '[Persönliche Angabe entfernt]')
      .replace(/[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/giu, '[E-Mail entfernt]')
      .replace(/(?:\+\d{1,3}|0\d{2})(?:[ .()-]?\d){7,12}(?!\d)/g, '[Telefon entfernt]');
  }
  return result;
}
