/**
 * Editorial starting points, not law or a guaranteed employer preference.
 * Do not infer protected traits and never auto-insert sensitive information.
 */
export const countryApplicationGuides = {
  CH: { name: 'Schweiz', locales: ['de-CH', 'fr-CH', 'it-CH', 'en'], cv: 'Üblicherweise ein klar gegliederter Lebenslauf mit relevanten Stationen; Arbeitszeugnisse sind häufig wichtig.', photo: 'Foto kann vorkommen, ist jedoch nicht überall nötig.', avoid: 'Private Angaben und Foto nur aufnehmen, wenn sinnvoll und freiwillig.', checklist: ['Stelleninserat und geforderte Dokumente prüfen', 'Berufszeugnisse auf Relevanz prüfen', 'Sprachregion und lokale Schreibweise beachten'] },
  DE: { name: 'Deutschland', locales: ['de-DE', 'en'], cv: 'Klar strukturierter tabellarischer Lebenslauf; Nachweise nach Aufforderung.', photo: 'Bewerbungsfoto ist freiwillig.', avoid: 'Keine sensiblen Merkmale ohne Notwendigkeit angeben.', checklist: ['Aufgaben und Ergebnisse konkret beschreiben', 'Nachweise passend auswählen', 'Arbeitsort und Arbeitsmodell klären'] },
  AT: { name: 'Österreich', locales: ['de-AT', 'en'], cv: 'Tabellarischer Lebenslauf mit relevanter Berufserfahrung.', photo: 'Foto ist keine allgemeine Pflicht.', avoid: 'Persönliche Daten minimieren.', checklist: ['Regionale Stellenanforderungen prüfen', 'Sprach- und Ausbildungsnachweise ergänzen', 'Motivation auf Arbeitgeber beziehen'] },
  FR: { name: 'France', locales: ['fr-FR', 'en'], cv: 'CV concis et ciblé sur les compétences liées au poste.', photo: 'Photo facultative, selon le contexte.', avoid: 'Ne pas inclure d’informations sensibles inutiles.', checklist: ['Adapter le CV au poste', 'Vérifier les diplômes exigés', 'Présenter des exemples concrets'] },
  GB: { name: 'United Kingdom', locales: ['en-GB'], cv: 'Tailored CV, commonly focused on achievements and relevant experience.', photo: 'Normally omit a photograph.', avoid: 'Usually omit date of birth, marital status and similar personal details.', checklist: ['Use UK spelling consistently', 'Focus on measurable contributions', 'Check right-to-work requirements'] },
  US: { name: 'United States', locales: ['en-US'], cv: 'Use a concise resume for most non-academic roles; describe impact and relevant skills.', photo: 'Do not include a photograph.', avoid: 'Do not include age, date of birth, marital status or unrelated personal characteristics.', checklist: ['Match the job requirements honestly', 'Use clear section headings', 'Confirm any work authorization requirements'] },
  CA: { name: 'Canada', locales: ['en-CA', 'fr-CA'], cv: 'Highlight role-relevant achievements, skills and experience.', photo: 'Do not generally include a photo.', avoid: 'Avoid unnecessary personal information.', checklist: ['Choose English or French for the position', 'Check regional and licensing requirements', 'Use accessible formatting'] },
  AU: { name: 'Australia', locales: ['en-AU'], cv: 'Role-focused resume with relevant results and skills.', photo: 'Usually omit a photograph.', avoid: 'Avoid unnecessary sensitive details.', checklist: ['Use Australian English', 'Check registrations and local work rights', 'Tailor examples to the role'] },
  IN: { name: 'India', locales: ['en-IN', 'hi'], cv: 'A relevant and readable resume; detailed requirements differ significantly by employer.', photo: 'Include only when explicitly relevant or requested, and permitted.', avoid: 'Do not assume every employer expects the same personal details.', checklist: ['Verify local qualification requirements', 'Identify preferred application language', 'Emphasize skills supported by examples'] },
  BR: { name: 'Brasil', locales: ['pt-BR'], cv: 'Currículo objetivo, adaptado à vaga e às competências.', photo: 'Foto normalmente não é necessária.', avoid: 'Evitar dados pessoais sensíveis sem motivo.', checklist: ['Adaptar o currículo à vaga', 'Indicar resultados verificáveis', 'Confirmar exigências locais'] },
  JP: { name: '日本', locales: ['ja'], cv: '応募先に応じて履歴書・職務経歴書などの書式を確認してください。', photo: '写真の扱いは応募形式や採用企業によって異なります。', avoid: '不要な個人情報は入力しないでください。', checklist: ['指定書式を確認', '資格・経歴を正確に記載', '応募企業の手順を確認'] },
} as const;

export type TargetCountry = keyof typeof countryApplicationGuides;
export const supportedTargetCountries = Object.keys(countryApplicationGuides) as TargetCountry[];

export function isTargetCountry(value: string): value is TargetCountry {
  return Object.prototype.hasOwnProperty.call(countryApplicationGuides, value);
}
