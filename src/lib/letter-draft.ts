import { z } from 'zod/v3';
import { evidenceItem, letterEvidence, renderEvidenceLetter } from './letter-evidence';
import { productLocales } from './product-locale';

export const letterDraftInput = z.object({
  cv: z.string().trim().min(40).max(12000),
  job: z.string().trim().min(40).max(12000),
  motivation: z.string().trim().min(10).max(1500),
  example: z.string().trim().min(10).max(2000),
  contribution: z.string().trim().min(10).max(1500),
  language: z.enum(productLocales).optional(),
  evidence: z.array(evidenceItem).max(12).optional(),
}).strict();

type LetterDraftInput = z.infer<typeof letterDraftInput>;

export function guidedLetter(values: LetterDraftInput) {
  const bank = letterEvidence(values);
  return renderEvidenceLetter(values.language ?? 'de', values.motivation, bank.filter(item => item.id === 'e1'), bank);
}

function redactDraftText(value: string): string {
  return value
    .replace(/^(?:wohnadresse|adresse|geburtsdatum|ahv(?:-nummer)?|passnummer|unterschrift|referenz(?:person)?|postal address|date of birth|passport number|signature|date de naissance|numéro de passeport|firma autografa|data di nascita|numero di passaporto)\s*[:：].*$/gimu, '[Persönliche Angabe entfernt]')
    .replace(/[\p{L}\p{N}.!#$%&'*+/=?^_{}|~-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/giu, '[E-Mail entfernt]')
    .replace(/(?:\+\d{1,3}|0\d{2})(?:[ .()-]?\d){7,12}(?!\d)/g, '[Telefon entfernt]');
}

export function prepareExternalDraftInput(values: LetterDraftInput): LetterDraftInput {
  const { cv, job, motivation, example, contribution, language, evidence } = values;
  return {
    cv: redactDraftText(cv), job: redactDraftText(job), motivation: redactDraftText(motivation),
    example: redactDraftText(example), contribution: redactDraftText(contribution),
    ...(language ? { language } : {}),
    ...(evidence ? { evidence: evidence.map(item => ({ ...item, text: redactDraftText(item.text) })) } : {}),
  };
}
