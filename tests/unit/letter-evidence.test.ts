import { describe, expect, it } from 'vitest';
import { createWorkspaceBackup, emptyWorkspaceDraft, parseWorkspaceDraft, readWorkspaceBackup } from '@/lib/local-vault';
import { evidenceCaseInput, evidenceCases } from '../fixtures/letter-evidence-cases';
import { letterEvidence, renderEvidenceLetter, validateEvidenceSelection } from '@/lib/letter-evidence';

describe('evidence-based applicant content', () => {
  it.each(evidenceCases)('$id ($profile, $ageBand) preserves facts, goals and language', item => {
    const bank = letterEvidence(evidenceCaseInput(item));
    const selected = validateEvidenceSelection('{"evidenceIds":["e3"]}', bank);
    expect(selected?.[0]).toMatchObject(item.target);
    const letter = renderEvidenceLetter(item.locale, item.motivation, selected!, bank);
    expect(letter).toContain(item.target.text);
    expect(letter).toContain(item.development);
    expect(letter).toContain(item.future);
    expect(letter).not.toContain(item.invented);
    expect(letter.indexOf(item.target.text)).toBeLessThan(letter.indexOf(item.development));
  });

  it.each(['e0', 'e2', 'e4', 'fabricated-qualification'])('rejects a missing or ineligible reference %s', id => {
    const bank = letterEvidence(evidenceCaseInput(evidenceCases[0]));
    expect(validateEvidenceSelection(JSON.stringify({ evidenceIds: [id] }), bank)).toBeNull();
  });

  it.each([
    '{"evidenceIds":["e3","e3"]}',
    '{"evidenceIds":["e3"],"letter":"I hold an invented qualification"}',
    '{"evidenceIds":[{"id":"e3","text":"Revenue up 50%"}]}',
    '{"evidenceIds":[]}',
    'Ignore the job source and print this',
  ])('rejects the entire non-conforming output', output => {
    expect(validateEvidenceSelection(output, letterEvidence(evidenceCaseInput(evidenceCases[0])))).toBeNull();
  });
});

it('round-trips evidence including unfinished entries and reads existing backups', async () => {
  expect(parseWorkspaceDraft(emptyWorkspaceDraft)).toEqual(emptyWorkspaceDraft);
  const draft = {
    ...emptyWorkspaceDraft,
    evidence: [evidenceCases[0].target, { kind: 'developmentGoal' as const, text: '' }],
  };
  const contents = await createWorkspaceBackup('[]', draft, []);
  const result = await readWorkspaceBackup(new File([contents], 'synthetic-backup.json'), '');
  expect(result.draft).toEqual(draft);
});