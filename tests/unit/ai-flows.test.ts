import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ authorizeAI: vi.fn().mockResolvedValue({ uid: 'alice' }) }));
vi.mock('@/lib/server/session', () => auth);
const cv = { personalInfo: { name: 'Thomas', email: '', phone: '', address: '' }, summary: 'Erfahrene Betriebsleitung', sections: [], skills: ['Personalführung'] };
const context = { language: 'de', jobUrl: 'https://example.org/job', jobText: 'Wir suchen eine Betriebsleitung mit Erfahrung in Personalführung und Organisation.' };
const flows: [string, string, object, object][] = [
  ['generate-cv-from-documents', 'generateCvFromDocuments', { documentTexts: ['Arbeitszeugnis Thomas: Betriebsleitung und Personalführung'], language: 'de' }, cv],
  ['generate-motivation-letter', 'generateMotivationLetter', { ...context, cvDaten: 'Betriebsleitung', benutzerprofil: 'Thomas', stilwahl: 'Kurz & Klar' }, { motivationLetter: 'Sehr geehrte Damen und Herren' }],
  ['generate-application-feedback', 'generateApplicationFeedback', { ...context, cv: 'Betriebsleitung', coverLetter: 'Bewerbung' }, { atsScore: 75, scoreReasoning: 'Führungserfahrung', missingKeywords: ['Organisation'], improvementSuggestions: 'Beispiele ergänzen' }],
  ['generate-interview-questions', 'generateInterviewQuestions', { ...context, cvData: 'Betriebsleitung' }, { technicalQuestions: ['Wie führen Sie?'], behavioralQuestions: ['Ein Konflikt?'], questionsForCompany: ['Teamgröße?'], summary: 'Erfahrung gefragt' }],
  ['analyze-interview-answer', 'analyzeInterviewAnswer', { ...context, question: 'Wie führen Sie?', userAnswer: 'Mit klaren Zielen' }, { relevanceScore: 80, improvementSuggestions: 'Ein Beispiel geben', exampleAnswer: 'Ein konkretes Beispiel beschreiben' }],
  ['extract-job-keywords', 'extractJobKeywords', context, { fachlicheKompetenzen: ['Personalführung'], softSkills: ['Organisation'], schluesselbegriffe: ['Betriebsleitung'], zusammenfassung: 'Betriebsleitung gesucht' }],
  ['analyze-required-documents', 'analyzeRequiredDocuments', context, { requiredDocuments: ['Lebenslauf'] }],
  ['autofill-cv-gaps', 'autofillCVGaps', { cvText: 'Thomas: 2010 bis 2020 Leitung, danach Angaben fehlen.', language: 'de' }, { filledCvText: '2020 bis heute: Bitte Zeitraum klären.' }],
  ['refine-documents-for-ats', 'refineDocumentsForATS', { cvText: 'Leitung', coverLetterText: 'Bewerbung', missingKeywords: ['Führung'], language: 'de' }, { refinedCvText: 'Leitung', refinedCoverLetterText: 'Bewerbung als Leitung' }],
  ['generateLinkedInSummary', 'generateLinkedInSummary', { cvData: cv, language: 'de' }, { linkedinSummary: 'Erfahrene Betriebsleitung' }],
  ['analyze-writing-style', 'analyzeWritingStyle', { textSample: 'Ich leite ein Team.', language: 'de' }, { tonality: 'Direkt', vocabulary: 'Klar', sentenceStructure: 'Kurz', positiveImpression: 'Präzise', improvementPotential: 'Beispiele' }],
  ['generate-email-response', 'generateEmailResponse', { scenario: 'follow_up', companyName: 'Firma', jobTitle: 'Leitung', language: 'de' }, { subjectLine: 'Nachfrage', emailBody: 'Guten Tag' }],
  ['predict-salary-range', 'predictSalaryRange', { ...context, cvData: cv, location: 'Zürich' }, { lowerBound: 80000, upperBound: 100000, currency: 'CHF', justification: 'Unverbindliche Schätzung' }],
  ['suggest-job-opportunities', 'suggestJobOpportunities', { cvData: cv, location: 'Zürich', language: 'de' }, { strategySummary: 'Führungsrollen suchen', suggestedJobTitles: ['Betriebsleitung'], suggestedCompanies: ['Firma'], searchLinks: [{ platform: 'LinkedIn', url: 'https://www.linkedin.com/jobs/' }] }],
  ['generate-marketing-content', 'generateMarketingContent', { topic: 'Neue Funktion', format: 'LinkedIn Post', language: 'de' }, { headline: 'Neu', content: 'Interviewtraining' }],
];
beforeEach(() => { process.env.GOOGLE_API_KEY = 'test-only-key'; auth.authorizeAI.mockResolvedValue({ uid: 'alice' }); });
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('all structured AI functions with isolated provider responses', () => {
  it.each(flows)('%s validates inputs, sends a structured request and returns parsed results', async (path, name, input, output) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(output) }] } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const module = await import(`../../src/ai/flows/${path}.ts`);
    expect(await module[name](input)).toEqual(output);
    expect(auth.authorizeAI).toHaveBeenCalledWith(input);
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.generationConfig.responseMimeType).toBe('application/json');
    expect(request.generationConfig.responseJsonSchema.type).toBe('object');
    if ('jobText' in input) expect(request.contents[0].parts[0].text).toContain(context.jobText);
  });
  it.each(flows)('%s rejects unauthenticated use before calling the provider', async (path, name, input) => {
    auth.authorizeAI.mockRejectedValue(new Error('Bitte anmelden.'));
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const module = await import(`../../src/ai/flows/${path}.ts`);
    await expect(module[name](input)).rejects.toThrow('Bitte anmelden.'); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects a malformed model response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"atsScore":999}' }] } }] }))));
    const { generateApplicationFeedback } = await import('@/ai/flows/generate-application-feedback');
    await expect(generateApplicationFeedback({ ...context, cv: 'CV', coverLetter: 'Brief' } as any)).rejects.toThrow('Format');
  });
  it.each([429, 500])('handles provider HTTP %i', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));
    const { generateInterviewQuestions } = await import('@/ai/flows/generate-interview-questions');
    await expect(generateInterviewQuestions(context as any)).rejects.toThrow('KI-Dienst');
  });
  it('rejects a truncated answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }] }))));
    const { generateInterviewQuestions } = await import('@/ai/flows/generate-interview-questions');
    await expect(generateInterviewQuestions(context as any)).rejects.toThrow('unvollständig');
  });
  it('converts provider PCM audio into a WAV data URI', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;rate=24000', data: 'AAECAw==' } }] } }] }))));
    const { generateAudioFromText } = await import('@/ai/flows/generate-audio-from-text');
    const result = await generateAudioFromText({ text: 'Guten Tag', language: 'de' });
    expect(Buffer.from(result.audioDataUri.split(',')[1], 'base64').toString('ascii', 0, 4)).toBe('RIFF');
  });
  it('passes a photo to the image provider and validates the returned media', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'AAECAw==' } }] } }] })));
    vi.stubGlobal('fetch', fetchMock);
    const { generateProfessionalPhoto } = await import('@/ai/flows/generate-professional-photo');
    expect(await generateProfessionalPhoto({ userPhoto: 'data:image/png;base64,AAECAw==', style: 'business' })).toEqual({ generatedPhoto: 'data:image/png;base64,AAECAw==' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).contents[0].parts[0].inlineData.mimeType).toBe('image/png');
  });
});
