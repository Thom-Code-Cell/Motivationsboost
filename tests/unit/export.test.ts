import { describe, it, expect } from 'vitest';
import { createTextPdf } from '@/lib/export-documents';
import { applicationPrivacyNotices, appendApplicationPrivacyNotice } from '@/lib/application-privacy-notice';
import { parseDocument } from '@/lib/server/document-parser';
import { pcmToWav } from '@/lib/audio';
import { Document, Paragraph, Packer } from 'docx';

describe('document exports and extraction', () => {
  it('paginates a long document without truncating the final text', async () => {
    const doc = createTextPdf(Array.from({ length: 160 }, (_, i) => `Zeile ${i}: Berufserfahrung und Ausbildung`).join('\n'));
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    const bytes = Buffer.from(doc.output('arraybuffer'));
    const extracted = await parseDocument(bytes, 'application/pdf');
    expect(extracted).toContain('Zeile 0:'); expect(extracted).toContain('Zeile 159:');
  });
  it('roundtrips an actual Word document', async () => {
    const doc = new Document({ sections: [{ children: [new Paragraph('Arbeitszeugnis Thomas'), new Paragraph('Leitung und Personalführung')] }] });
    const bytes = await Packer.toBuffer(doc);
    const text = await parseDocument(bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(text).toContain('Arbeitszeugnis Thomas'); expect(text).toContain('Personalführung');
  });
  it('rejects non-PDF bytes masquerading as a PDF', async () => expect(parseDocument(Buffer.from('malformed'), 'application/pdf')).rejects.toThrow());
  it('reads UTF-8 text', async () => expect(await parseDocument(Buffer.from('Zeugnis Zürich'), 'text/plain')).toBe('Zeugnis Zürich'));
  it('writes a correct WAV header and PCM payload', () => {
    const bytes = pcmToWav(new Uint8Array([0, 1, 2, 3]));
    const buffer = Buffer.from(bytes);
    expect(buffer.toString('ascii', 0, 4)).toBe('RIFF'); expect(buffer.toString('ascii', 8, 12)).toBe('WAVE');
    expect(buffer.readUInt32LE(40)).toBe(4); expect([...bytes.slice(44)]).toEqual([0, 1, 2, 3]);
  });
});

describe('optional application privacy notice', () => {
  it('does not modify an unselected or empty application', () => {
    expect(appendApplicationPrivacyNotice('Original\n', false)).toBe('Original\n');
    expect(appendApplicationPrivacyNotice('', true)).toBe('');
  });
  it('appends only once and respects the selected language', () => {
    for (const language of ['de', 'en', 'fr', 'it'] as const) {
      const result = appendApplicationPrivacyNotice('Original', true, language);
      expect(result).toBe('Original\n\n' + applicationPrivacyNotices[language]);
      expect(appendApplicationPrivacyNotice(result, true, language)).toBe(result);
    }
  });
  it('includes the visible notice in exported PDF and Word documents', async () => {
    const text = appendApplicationPrivacyNotice('Meine Bewerbung', true);
    const pdf = await parseDocument(Buffer.from(createTextPdf(text).output('arraybuffer')), 'application/pdf');
    expect(pdf).toContain('Datenschutzhinweis zur Bewerbung');
    expect(pdf).toContain('natürliche Person');
    const doc = new Document({ sections: [{ children: text.split('\n').map(line => new Paragraph(line)) }] });
    const word = await parseDocument(await Packer.toBuffer(doc), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(word).toContain('Datenschutzhinweis zur Bewerbung');
    expect(word).toContain('natürliche Person');
  });
});
