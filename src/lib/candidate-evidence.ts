import type { GenerateCvFromDocumentsOutput } from '@/ai/schemas';

export type CandidateClaim = {
  id: string;
  category: 'experience' | 'qualification' | 'skill';
  title: string;
  detail: string;
  origin: string;
  checkedByApplicant: boolean;
};

/**
 * Derive reviewable claims from the *AI-created structured CV*.
 * Never claim that the original employment certificate proves the entry:
 * exact document, page and source text are not yet tracked.
 */
export function extractCandidateClaims(cv: GenerateCvFromDocumentsOutput): CandidateClaim[] {
  const result: CandidateClaim[] = [];
  cv.sections.forEach((section, sectionIndex) => {
    section.items.forEach((item, itemIndex) => {
      result.push({
        id: 'entry-' + sectionIndex + '-' + itemIndex,
        category: /ausbild|education|certif|diplom|qualifi|formation/i.test(section.title) ? 'qualification' : 'experience',
        title: item.title,
        detail: [item.subtitle, item.date, item.description].filter(Boolean).join(' · '),
        origin: 'KI-strukturierter Lebenslauf: ' + section.title,
        checkedByApplicant: false,
      });
    });
  });
  cv.skills.forEach((skill, index) => {
    result.push({
      id: 'skill-' + index, category: 'skill', title: skill,
      detail: '',
      origin: 'Kompetenzliste aus generiertem Lebenslauf',
      checkedByApplicant: false,
    });
  });
  return result;
}

export function getReviewStatistics(claims: CandidateClaim[]) {
  const reviewed = claims.filter(item => item.checkedByApplicant).length;
  return { total: claims.length, reviewed, unreviewed: claims.length - reviewed };
}

export function makeCandidatePortfolio(claims: CandidateClaim[], country: string, documentLanguage: string) {
  return {
    schemaVersion: 1,
    source: 'Self-reviewed CV draft. Source documents were not independently checked.',
    targetCountry: country,
    documentLanguage,
    exportedAt: new Date().toISOString(),
    reviewedClaims: claims.filter(claim => claim.checkedByApplicant),
    // Explicitly exclude unapproved claims from the portable validated portfolio.
  };
}
