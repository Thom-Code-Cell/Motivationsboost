import { describe, expect, it } from 'vitest';
import { groundCvDraft, groundedEmailDraft, preservesSourceText } from '@/lib/application-evidence';

describe('source requirements for applicant documents', () => {
  it('does not allow a second sentence qualifying the first to be removed', () => {
    const source = 'Ich habe das Ziel, SAP zu lernen. Ich habe noch keine SAP-Erfahrung.';
    expect(preservesSourceText('Ich habe das Ziel, SAP zu lernen.', [source])).toBe(false);
    expect(preservesSourceText('Ich beherrsche SAP.', [source])).toBe(false);
    expect(preservesSourceText(source.replace('lernen. ', 'lernen.\n\n'), [source])).toBe(true);
  });

  it.each([
    ['de', 'Ich möchte SAP lernen.', 'Entwicklungsziele'],
    ['en', 'I plan to study for the ITIL exam.', 'Development goals'],
    ['fr', 'Je souhaite apprendre la gestion des stocks.', 'Objectifs de développement'],
    ['it', 'Vorrei imparare a programmare i robot.', 'Obiettivi di sviluppo'],
  ])('separates %s goals and removes invented qualifications', (language, goal, heading) => {
    const result = groundCvDraft({
      personalInfo: { name: 'Falscher Name', email: '', phone: '', address: '' },
      summary: 'Zertifizierte Fachperson',
      sections: [{ title: 'Zertifikate', items: [{ title: 'Ein nicht vorhandenes Zertifikat', subtitle: '', date: '2025', description: goal }] }],
      skills: ['Nicht nachgewiesene Kompetenz'],
    }, [goal], language);
    expect(result.personalInfo.name).toBe('');
    expect(result.skills).toEqual([]);
    expect(result.summary).toBe('');
    expect(result.sections[1]).toMatchObject({ title: heading, items: [{ title: goal }] });
    expect(JSON.stringify(result)).not.toContain('nicht vorhandenes Zertifikat');
  });

  it('constructs a follow-up without asserting an unknown past date', () => {
    const draft = groundedEmailDraft({ scenario: 'follow_up', companyName: 'Test AG', jobTitle: 'Assistenz', language: 'de-CH' });
    expect(draft.emailBody).toContain('Assistenz');
    expect(draft.emailBody).not.toMatch(/Woche|Monat|\d/u);
  });
});
