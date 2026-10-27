import { describe, expect, it } from 'vitest';
import { makeApplicantDataExport } from '../../src/lib/applicant-data-export';
describe('personal data download', () => {
  it('exports only explicit loaded applicant state, not authentication tokens', () => {
    const exported = makeApplicantDataExport({
      uid:'test-123', email:'person@example.test',displayName:'Example Person',
      profile: null, applications: [], progress: null, cv: null,
      approvedLetter: null, linkedinSummary: null,
    });
    expect(exported.identity.uid).toBe('test-123');
    expect(exported.applications).toEqual([]);
    expect(JSON.stringify(exported)).not.toContain('accessToken');
    expect(JSON.stringify(exported)).not.toContain('privateKey');
    expect(exported.note).toMatch(/Google Drive/);
  });
});
