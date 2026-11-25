import { generateCvFromDocuments } from '@/ai/flows/generate-cv-from-documents';
import { generateMotivationLetter } from '@/ai/flows/generate-motivation-letter';
import { generateApplicationFeedback } from '@/ai/flows/generate-application-feedback';
import { generateInterviewQuestions } from '@/ai/flows/generate-interview-questions';
import { analyzeInterviewAnswer } from '@/ai/flows/analyze-interview-answer';
import { extractJobKeywords } from '@/ai/flows/extract-job-keywords';
import { analyzeRequiredDocuments } from '@/ai/flows/analyze-required-documents';
import { autofillCVGaps } from '@/ai/flows/autofill-cv-gaps';
import { refineDocumentsForATS } from '@/ai/flows/refine-documents-for-ats';
import { generateLinkedInSummary } from '@/ai/flows/generateLinkedInSummary';
import { analyzeWritingStyle } from '@/ai/flows/analyze-writing-style';
import { generateEmailResponse } from '@/ai/flows/generate-email-response';
import { predictSalaryRange } from '@/ai/flows/predict-salary-range';
import { suggestJobOpportunities } from '@/ai/flows/suggest-job-opportunities';
import { generateMarketingContent } from '@/ai/flows/generate-marketing-content';
import { generateAudioFromText } from '@/ai/flows/generate-audio-from-text';
import { generateProfessionalPhoto } from '@/ai/flows/generate-professional-photo';
import { evidenceCases } from '../../../../../tests/fixtures/letter-evidence-cases';

const context = {
  language: 'de',
  jobUrl: 'https://example.org/job',
  jobText: 'Fiktive Stelle als Disponentin. Einsatzplanung und Kommunikation sind wichtig. Ein Staplerausweis ist von Vorteil. Erforderliche Unterlagen: Lebenslauf und Arbeitszeugnisse.',
};
const history = 'Fiktiver Betrieb. Ich habe von Januar 2020 bis Dezember 2023 wöchentlich Bestandslisten überprüft und einen gemeinsamen Schichtkalender eingeführt. Ich habe keinen Staplerausweis.';
const aim = 'Ich möchte lernen, Materialengpässe früh zu erkennen.';
const cv = {
  personalInfo: { name: 'Mira Testprofil', email: '', phone: '', address: '' },
  summary: 'Wöchentliche Prüfung von Bestandslisten und Einführung eines gemeinsamen Schichtkalenders.',
  sections: [{ title: 'Erfahrung', items: [{ title: 'Lagerassistenz', subtitle: 'Fiktiver Betrieb', date: '2020–2023', description: 'Wöchentliche Prüfung von Bestandslisten' }] }],
  skills: ['Bestandslisten prüfen'],
};
const syntheticPortrait = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAADJUlEQVR42u2dvWocMRSFx8JdXsLvEkNqQwoXJmBcmbQOuAvpAkkbtgoLwYWLQGqD8yiGdClTpU9hWIzjGc+PNOdc6bvVssMI3fPpHmmkWXbv7vefjtBFQgIAAIAAAAAIAACAAAAACAAAgAAAAAgANBH7ETt9cXLUd+nz1Y9YuexFOQ8YED00jAAAZkgfCIM1gIXSh8BgCiCj9OYYUjvqF225HgClNXJj4GVBI9X5cHrYd+n99jaWFxkBeFb9Ad1nkDBh4AJgWP1J0o/H4MAgVaz+s/c6zAfue0FL1M/VQuUW1DcMswvXZ0daI0qe6rfTB1MLKuEbnl6UDIdeOaX6WhYWAQcyrILWNQo3I5IBcNuTUfUnNTX8DYuAOaBJAIb78qpeGVXAms7g40JYEADajv1mM//fhV68fEsFNBey7ei/P7+4adFQBRiqr+qV9Rzw5uP1/Ydvl8eqFtqdA3baPfq8ZgtMwjwHEM0CeOja8xx8eQvVLkM9V0GSlSgWhAUBgAAAAAgAAKDm1Z5tr6gALAgABAAA4D3jbbY3m+3NpPan3qJaF1ABWNCIOD99dT+oxw//3V0AyFn1YxhMNSvtc0kYC9oN52F9d1dDDP9O/jPVqSczD9V/JPHAJecK0P9OeAmD4VrxV7+L+G5onxdF8Ry7CuikR8TybUGeA3gO0A1Dh11xlwpYXwuTMwksCACKIelzJOdVAevoYnUgamdBpdVxO452nAPKaWT4MoDpJFxCKc9XMXxXQXn18lTffRmaSzVb9bsof+Awe7PIWfpIAGZg8Jc+AIDj83dPfv/19UHfLWfffz35/fXmEwCW6p4l3EgYASiquy0JCwArS2+FQQxAKL0JBhkAE+nlGAQADKUXYkior+1hQn1tP1eyoCjSr29HCfW1PU+or+1/Qn1tFryWIo7E8NfmklBfm1FCfW1ezAHVzQG1Dv9C2VEB9a6CCAGAuv2nRI5UABYEAPxHmCkVgAUBgAAAAAgAAIAAAACWhO2PILJHxkypACwIALiQMEcqAAsCAC4kzI4KqNGCai2CEnmlQH2tT/2yFlQTg3K5MAeI4x98Dzc2/L/a4wAAAABJRU5ErkJggg==';

function mediaSummary(data: string, kind: 'audio' | 'photo') {
  const bytes = Buffer.from(data.split(',')[1] ?? '', 'base64');
  return { kind, byteLength: bytes.length, header: bytes.subarray(0, 12).toString('hex') };
}

export const acceptanceCases = {
  evidence: {
    'cv-de': () => generateCvFromDocuments({ documentTexts: [history, aim], language: 'de' }),
    ...Object.fromEntries(evidenceCases.filter(item => item.locale !== 'de').slice(0, 3).map(item => [
      'cv-' + item.locale, () => generateCvFromDocuments({ documentTexts: [item.target.text, item.example, item.development], language: item.locale }),
    ])),
    letter: () => generateMotivationLetter({ ...context, cvDaten: history, benutzerprofil: 'Fiktives Profil', companyReason: 'Ich schätze die Zusammenarbeit zwischen Team und Lager und möchte sie verlässlich unterstützen.', realExample: 'Ich habe eine gemeinsame Schichtübersicht eingeführt und die offenen Aufgaben mit dem Team besprochen.', contribution: aim + ' Ich möchte die Einsatzplanung unterstützen.', factsConfirmed: true }),
    ats: () => refineDocumentsForATS({ cvText: history, coverLetterText: aim, missingKeywords: ['Staplerausweis', 'Materialengpässe früh erkennen'], language: 'de' }),
    cvGaps: () => autofillCVGaps({ cvText: history + ' Für 2024 gibt es keine Angaben.', language: 'de' }),
    linkedIn: () => generateLinkedInSummary({ cvData: { ...cv, summary: cv.summary + ' ' + aim }, language: 'de' }),
    interviewAnswer: () => analyzeInterviewAnswer({ ...context, question: 'Wie haben Sie Engpässe früh erkannt?', userAnswer: 'Ich habe Bestandslisten geprüft. ' + aim, cvData: history }),
    email: () => generateEmailResponse({ scenario: 'follow_up', companyName: 'Fiktiver Betrieb', jobTitle: 'Disponentin', language: 'de' }),
  },
  analysis: {
    feedback: () => generateApplicationFeedback({ ...context, cv: history, coverLetter: aim }),
    interviewQuestions: () => generateInterviewQuestions({ ...context, cvData: history }),
    keywords: () => extractJobKeywords(context),
    requiredDocuments: () => analyzeRequiredDocuments(context),
    writingStyle: () => analyzeWritingStyle({ textSample: 'Ich habe Bestandslisten geprüft. Später möchte ich die Einsatzplanung kennenlernen.', language: 'de' }),
    salary: () => predictSalaryRange({ ...context, cvData: cv, location: 'Zürich' }),
    jobSearch: () => suggestJobOpportunities({ cvData: cv, location: 'Zürich', language: 'de' }),
    marketing: () => generateMarketingContent({ topic: 'Synthetische Probe zum bestehenden Interviewtraining', format: 'LinkedIn Post', language: 'de' }),
  },
  media: {
    audio: async () => mediaSummary((await generateAudioFromText({ text: 'Synthetischer Test. Erzählen Sie uns von einer Situation, in der Sie Abläufe verbessert haben.', language: 'de' })).audioDataUri, 'audio'),
    photo: async () => mediaSummary((await generateProfessionalPhoto({ userPhoto: syntheticPortrait, style: 'business' })).generatedPhoto, 'photo'),
  },
} satisfies Record<string, Record<string, () => Promise<unknown>>>;
