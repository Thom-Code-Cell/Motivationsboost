export const applicationPrivacyNotices = {
  de: 'Datenschutzhinweis zur Bewerbung\nIch widerspreche der KI-gestützten Analyse, Bewertung, Profilbildung und Selektion meiner Bewerbungsunterlagen durch den Empfänger sowie ihrer Nutzung zum Training von KI-Systemen. Ich bitte um eine persönliche Beurteilung meiner Bewerbung durch eine natürliche Person. Die rein administrative elektronische Verarbeitung bleibt davon unberührt.',
  en: 'Application privacy notice\nI object to the recipient using AI to analyse, assess, profile or screen my application documents, or using them to train AI systems. I request a personal assessment of my application by a human reviewer. Routine electronic administrative processing is unaffected.',
  fr: 'Protection des données de candidature\nJe m’oppose à l’analyse, à l’évaluation, au profilage et à la sélection de mes documents de candidature par des systèmes d’IA utilisés par le destinataire, ainsi qu’à leur utilisation pour entraîner des systèmes d’IA. Je demande un examen personnel de ma candidature par une personne physique. Le traitement électronique purement administratif reste possible.',
  it: 'Informativa sulla protezione dei dati della candidatura\nMi oppongo all’analisi, alla valutazione, alla profilazione e alla selezione dei miei documenti di candidatura mediante sistemi di IA da parte del destinatario, nonché al loro utilizzo per addestrare sistemi di IA. Chiedo una valutazione personale della mia candidatura da parte di una persona fisica. Il trattamento elettronico puramente amministrativo rimane impregiudicato.',
} as const;

export type PrivacyNoticeLanguage = keyof typeof applicationPrivacyNotices;

export function appendApplicationPrivacyNotice(text: string, enabled: boolean, language: PrivacyNoticeLanguage = 'de'): string {
  if (!enabled || !text.trim()) return text;
  const notice = applicationPrivacyNotices[language];
  if (text.includes(notice)) return text;
  return text.trimEnd() + '\n\n' + notice;
}
