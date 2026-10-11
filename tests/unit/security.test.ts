import { describe, expect, it } from 'vitest';
import { isSameOrigin, safeWebUrl } from '@/lib/security';
import { isPublicAddress, getJobPosting } from '@/lib/server/job-posting';
import { GenerateCvFromDocumentsInputSchema, GenerateCvFromDocumentsOutputSchema } from '@/ai/schemas';

describe('request and URL security', () => {
  it('rejects missing and cross-site origins', () => {
    expect(isSameOrigin(null, 'https://app.example/api/session')).toBe(false);
    expect(isSameOrigin('https://evil.example', 'https://app.example/api/session')).toBe(false);
    expect(isSameOrigin('https://app.example', 'https://app.example/api/session')).toBe(true);
  });
  it.each(['javascript:alert(1)', 'file:///etc/passwd', 'https://user:pass@example.org/'])('rejects unsafe links: %s', value => expect(() => safeWebUrl(value)).toThrow());
  it.each(['127.0.0.1', '10.1.2.3', '169.254.169.254', '192.168.1.1', '172.16.1.1', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1', '0.0.0.0'])('blocks private addresses: %s', value => expect(isPublicAddress(value)).toBe(false));
  it('accepts public IPv4 and IPv6', () => {
    expect(isPublicAddress('8.8.8.8')).toBe(true);
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
  });
  it('refuses requests to the metadata service', async () => expect(getJobPosting('http://169.254.169.254/latest/meta-data')).rejects.toThrow());
  it('uses the actual pasted advert without a network call', async () => {
    const text = 'Gesucht wird eine erfahrene Betriebsleitung mit Personalführung und Organisation.';
    expect(await getJobPosting('https://invalid.example', text)).toBe(text);
  });
});
describe('document input contracts', () => {
  it.each([[], [''], ['x'.repeat(100001)], Array(21).fill('Text')])('rejects invalid document batches', documentTexts => expect(GenerateCvFromDocumentsInputSchema.safeParse({ documentTexts, language: 'de' }).success).toBe(false));
  it('allows missing email without inventing contact details', () => {
    expect(GenerateCvFromDocumentsOutputSchema.safeParse({ personalInfo: { name: 'Thomas', email: '', phone: '', address: '' }, summary: 'Erfahrung', sections: [], skills: [] }).success).toBe(true);
  });
});
