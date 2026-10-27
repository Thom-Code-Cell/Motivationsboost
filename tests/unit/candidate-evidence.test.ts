import { describe, expect, it } from 'vitest';
import { countryApplicationGuides, isTargetCountry, supportedTargetCountries } from '../../src/lib/country-application-guides';
import { extractCandidateClaims, makeCandidatePortfolio } from '../../src/lib/candidate-evidence';

describe('applicant-verified evidence and country profiles', () => {
  const cv = {
    personalInfo: { name: 'Sample Person', email: '', phone: '', address: '' },
    summary: 'Experienced chef and team leader.',
    sections: [{ title: 'Experience', items: [{ title: 'Team Leader', subtitle: 'Example Store', date: '2018-2025', description: 'Managed a team.' }] }],
    skills: ['Team leadership', 'Stock planning'],
  };

  it('does not silently mark AI CV text as documentary evidence', () => {
    const claims = extractCandidateClaims(cv);
    expect(claims).toHaveLength(3);
    expect(claims.every(claim => !claim.checkedByApplicant)).toBe(true);
    expect(claims[0].origin).toMatch(/Lebenslauf/);
  });

  it('exports only explicitly applicant-approved facts', () => {
    const claims = extractCandidateClaims(cv);
    claims[1].checkedByApplicant = true;
    const exported = makeCandidatePortfolio(claims, 'CH', 'de');
    expect(exported.reviewedClaims).toHaveLength(1);
    expect(exported.reviewedClaims[0].title).toBe('Team leadership');
    expect(exported.source).toMatch(/not independently checked/);
  });

  it('keeps country-specific expectations separate', () => {
    expect(supportedTargetCountries.length).toBeGreaterThanOrEqual(10);
    expect(countryApplicationGuides.US.photo).toMatch(/not include/i);
    expect(countryApplicationGuides.CH.photo).not.toBe(countryApplicationGuides.US.photo);
    expect(isTargetCountry('CH')).toBe(true);
    expect(isTargetCountry('xx')).toBe(false);
  });
});
