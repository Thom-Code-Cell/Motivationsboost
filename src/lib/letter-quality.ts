/**
 * Heuristic writing feedback. This deliberately cannot detect AI authorship,
 * verify facts or estimate hiring probability.
 */
export type QualityFinding = {
  code: 'EMPTY' | 'GENERIC' | 'UNVERIFIED_FIGURES' | 'LONG' | 'SHORT';
  title: string;
  guidance: string;
};

const genericExpressions = [
  /hiermit bewerbe ich mich/iu,
  /mit gro(?:ß|ss)em interesse habe ich/iu,
  /mit meiner ausgepr(?:ä|ae)gten leidenschaft/iu,
  /ich bin (?:ein|eine) teamf(?:ä|ae)hig/iu,
  /dynamisches unternehmen/iu,
  /spannende herausforderung/iu,
  /stets zu meiner vollsten zufriedenheit/iu,
];

export function checkLetterQuality(text: string): QualityFinding[] {
  const normalized = text.trim();
  if (!normalized) {
    return [{ code: 'EMPTY', title: 'Kein Text vorhanden', guidance: 'Erst einen Entwurf erstellen.' }];
  }
  const findings: QualityFinding[] = [];
  const words = normalized.split(/\s+/u).filter(Boolean).length;
  if (genericExpressions.some(expression => expression.test(normalized))) {
    findings.push({
      code: 'GENERIC',
      title: 'Austauschbare Formulierung gefunden',
      guidance: 'Ersetze allgemeine Behauptungen durch dein konkretes Erlebnis und den Nutzen für diese Stelle.',
    });
  }
  if (/(?:\b\d{2,}(?:[.,]\d+)?\s*(?:%|prozent|mitarbeitende|mitarbeiter|franken|chf|eur|euro)\b)/iu.test(normalized)) {
    findings.push({
      code: 'UNVERIFIED_FIGURES',
      title: 'Zahl oder Kennzahl überprüfen',
      guidance: 'Sind Zahlen korrekt, aktuell und mit eigenen Unterlagen oder Erfahrungen belegbar?',
    });
  }
  if (words < 75) {
    findings.push({
      code: 'SHORT',
      title: 'Sehr kurzer Text',
      guidance: 'Prüfe, ob Motivation, konkretes Beispiel und Mehrwert für die Firma verständlich sind.',
    });
  }
  if (words > 350) {
    findings.push({
      code: 'LONG',
      title: 'Langes Motivationsschreiben',
      guidance: 'Kürze auf die stärksten zwei bis drei Argumente, ohne Fakten zu verlieren.',
    });
  }
  return findings;
}
