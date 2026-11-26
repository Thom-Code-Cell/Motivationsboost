import type { GenerateCvFromDocumentsOutput, GenerateEmailResponseInput } from '@/ai/schemas';
import { isProductLocale } from './product-locale';

function normalize(text: string) {
  return text.normalize('NFC').replace(/\s+/gu, ' ').trim().toLowerCase();
}

function statements(text: string): string[] {
  return text.split(/\r?\n|(?<=[.!?])\s+/u).map(line => line.replace(/^(?:[-*•]\s*)/u, '').trim()).filter(Boolean);
}

const future = /(?:\b(?:möchte|würde|künftig|zukünftig|ich will|plane|angestrebt|gegebenenfalls|wunsch|geplant)\b|\b(?:would like|wish to|want to|aim to|plan(?:ning)? to|intend to|hope to|will learn|looking to)\b|\b(?:souhaite|aimerais|envisage|prévois|voudrais|j['’]espère)\b|\b(?:vorrei|desidero|intendo|mi piacerebbe|mio obiettivo|in futuro)\b)/iu;
const uncertain = /\b(?:kein(?:e|en|er|es|em)?|nicht|fehlen|unklar|ohne|no|not|never|missing|unknown|without|aucun(?:e)?|sans|pas|jamais|non|nessun(?:o|a)?|senza|mancant[ei])\b/iu;

export function preservesSourceText(proposed: string, sources: readonly string[]) {
  const original = sources.flatMap(statements).map(normalize);
  const lines = statements(proposed).map(normalize);
  return lines.length > 0 && lines.length === original.length && lines.every((line, index) => line === original[index]);
}

const headings = {
  de: { review: 'Dokumentauszüge zur Prüfung', goals: 'Entwicklungsziele', opening: 'Guten Tag', closing: 'Freundliche Grüsse', follow: 'Nachfrage zur Bewerbung', thanks: 'Danke für das Gespräch', rejection: 'Danke für Ihre Rückmeldung', acceptance: 'Annahme Ihres Angebots',
    followText: (role: string) => 'Ich möchte mich nach dem Stand meiner Bewerbung für die Stelle «' + role + '» erkundigen.',
    thanksText: 'Vielen Dank für das Gespräch und Ihre Zeit.', rejectionText: 'Vielen Dank für Ihre Rückmeldung zu meiner Bewerbung.', acceptanceText: 'Ich nehme Ihr Angebot gerne an.' },
  en: { review: 'Source excerpts for review', goals: 'Development goals', opening: 'Hello,', closing: 'Kind regards,', follow: 'Application follow-up', thanks: 'Thank you for the interview', rejection: 'Thank you for your reply', acceptance: 'Acceptance of your offer',
    followText: (role: string) => 'I would like to ask about the status of my application for the role of ' + role + '.',
    thanksText: 'Thank you for the conversation and for your time.', rejectionText: 'Thank you for getting back to me about my application.', acceptanceText: 'I am pleased to accept your offer.' },
  fr: { review: 'Extraits à vérifier', goals: 'Objectifs de développement', opening: 'Bonjour,', closing: 'Meilleures salutations,', follow: 'Suivi de ma candidature', thanks: 'Merci pour votre entretien', rejection: 'Merci pour votre réponse', acceptance: 'Acceptation de votre offre',
    followText: (role: string) => 'Je me permets de vous demander où en est ma candidature au poste de « ' + role + ' ».',
    thanksText: 'Je vous remercie pour notre entretien et pour votre temps.', rejectionText: 'Je vous remercie pour votre réponse à ma candidature.', acceptanceText: 'J’accepte votre offre avec plaisir.' },
  it: { review: 'Estratti da verificare', goals: 'Obiettivi di sviluppo', opening: 'Buongiorno,', closing: 'Cordiali saluti,', follow: 'Aggiornamento sulla mia candidatura', thanks: 'Grazie per il colloquio', rejection: 'Grazie per la risposta', acceptance: 'Accettazione della Sua offerta',
    followText: (role: string) => 'Le scrivo per chiedere un aggiornamento sulla mia candidatura per il ruolo di «' + role + '».',
    thanksText: 'La ringrazio per il colloquio e per il tempo che mi ha dedicato.', rejectionText: 'La ringrazio per la risposta alla mia candidatura.', acceptanceText: 'Accetto con piacere la Sua offerta.' },
} as const;

function wording(language: string) {
  const base = language.toLowerCase().split('-')[0];
  if (!isProductLocale(base)) throw new Error('Für diese Ausgabesprache ist die Belegprüfung noch nicht freigegeben.');
  return headings[base];
}

export function groundCvDraft(candidate: GenerateCvFromDocumentsOutput, sources: readonly string[], language: string): GenerateCvFromDocumentsOutput {
  const labels = wording(language);
  const lines = Array.from(new Set(sources.flatMap(statements)));
  const asserted = lines.filter(line => !future.test(line) && !uncertain.test(line));
  const goals = lines.filter(line => future.test(line));
  const originalFacts = new Set(asserted.map(normalize));

  const selected = Array.from(new Set(candidate.sections.flatMap(section =>
    section.items.flatMap(item => [item.title, ...statements(item.description)])
      .filter(value => originalFacts.has(normalize(value))),
  )));
  const entries = selected.length ? selected : asserted;
  const blank = { name: '', email: '', phone: '', address: '' };
  const contact = Object.fromEntries(Object.entries(candidate.personalInfo).map(
    ([key, value]) => [key, value && asserted.some(line => normalize(line) === normalize(value)) ? value : ''],
  ));

  return {
    personalInfo: { ...blank, ...contact },
    summary: '',
    sections: [
      { title: labels.review, items: entries.map(title => ({ title, subtitle: '', date: '', description: '' })) },
      ...(goals.length ? [{ title: labels.goals, items: goals.map(title => ({ title, subtitle: '', date: '', description: '' })) }] : []),
    ],
    skills: [],
  };
}

export function groundedEmailDraft(input: GenerateEmailResponseInput) {
  const labels = wording(input.language);
  const messages = {
    follow_up: [labels.follow, labels.followText(input.jobTitle)],
    thank_you: [labels.thanks, labels.thanksText],
    rejection_response: [labels.rejection, labels.rejectionText],
    acceptance: [labels.acceptance, labels.acceptanceText],
  };
  const [subjectLine, text] = messages[input.scenario];
  return { subjectLine, emailBody: [labels.opening, text, labels.closing].join('\n\n') };
}
