import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ authorizeAI: vi.fn().mockResolvedValue({ uid: 'alice' }) }));
vi.mock('@/lib/server/session', () => auth);
const cv = { personalInfo: { name: 'Thomas', email: '', phone: '', address: '' }, summary: 'Erfahrene Betriebsleitung', sections: [], skills: ['Personalführung'] };
const context = { language: 'de', jobUrl: 'https://example.org/job', jobText: 'Wir suchen eine Betriebsleitung mit Erfahrung in Personalführung und Organisation.' };
const flows: [string, string, object, object][] = [
  ['generate-cv-from-documents', 'generateCvFromDocuments', { documentTexts: ['Arbeitszeugnis Thomas: Betriebsleitung und Personalführung'], language: 'de' }, cv],
  ['generate-motivation-letter', 'generateMotivationLetter', { ...context, cvDaten: 'Betriebsleitung', benutzerprofil: 'Thomas', stilwahl: 'Kurz & Klar', companyReason: 'Ich schätze die persönliche Betreuung im Unternehmen und möchte den Service stärken.', realExample: 'In meiner letzten Funktion koordinierte ich eine schwierige Warenannahme, teilte die Aufgaben auf und hielt den Betrieb gemeinsam mit dem Team aufrecht.', contribution: 'Ich bringe strukturierte Teamführung und verlässliche Abläufe ein.', factsConfirmed: true }, { motivationLetter: 'Sehr geehrte Damen und Herren' }],
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
beforeEach(() => { process.env.OPENAI_API_KEY = 'test-only-key'; auth.authorizeAI.mockResolvedValue({ uid: 'alice' }); });
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('all structured AI functions with isolated provider responses', () => {
  it.each(flows)('%s validates inputs, sends a structured request and returns parsed results', async (path, name, input, output) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(output) }] }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const module = await import(`../../src/ai/flows/${path}.ts`);
    expect(await module[name](input)).toEqual(output);
    expect(auth.authorizeAI).toHaveBeenCalledWith(input);
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.text.format.type).toBe('json_schema');
    expect(request.store).toBe(false);
    expect(request.model).toBe('gpt-5-mini');
    expect(request.text.format.schema.type).toBe('object');
    if ('jobText' in input) expect(request.input[0].content[0].text).toContain(context.jobText);
  });
  it.each(flows)('%s rejects unauthenticated use before calling the provider', async (path, name, input) => {
    auth.authorizeAI.mockRejectedValue(new Error('Bitte anmelden.'));
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const module = await import(`../../src/ai/flows/${path}.ts`);
    await expect(module[name](input)).rejects.toThrow('Bitte anmelden.'); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('requires truthful applicant evidence and a positive attestation before AI use', async () => {
    const { generateMotivationLetter } = await import('@/ai/flows/generate-motivation-letter');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(generateMotivationLetter({
      ...context,
      cvDaten: 'Betriebsleitung',
      benutzerprofil: 'Thomas',
      stilwahl: 'Laura',
      companyReason: 'Eine sehr gute Gelegenheit für meine Entwicklung.',
      realExample: 'Ich möchte mir für diesen Fall eine konkrete Erfahrung ausdenken.',
      contribution: 'Ich würde gerne dieses Team erfolgreich unterstützen.',
      factsConfirmed: false,
    } as any)).rejects.toThrow();
    expect(auth.authorizeAI).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed model response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"atsScore":999}' }] }] }))));
    const { generateApplicationFeedback } = await import('@/ai/flows/generate-application-feedback');
    await expect(generateApplicationFeedback({ ...context, cv: 'CV', coverLetter: 'Brief' } as any)).rejects.toThrow('Format');
  });
  it.each([429, 500])('handles provider HTTP %i', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));
    const { generateInterviewQuestions } = await import('@/ai/flows/generate-interview-questions');
    await expect(generateInterviewQuestions(context as any)).rejects.toThrow(status === 429 ? 'OpenAI-Limit' : 'OpenAI-Anfrage');
  });
  it('rejects a truncated answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'incomplete', output: [{ type: 'message', content: [{ type: 'output_text', text: '{}' }] }] }))));
    const { generateInterviewQuestions } = await import('@/ai/flows/generate-interview-questions');
    await expect(generateInterviewQuestions(context as any)).rejects.toThrow('nicht abgeschlossen');
  });
  it('returns OpenAI speech as a WAV data URI', async () => {
    const riff = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE'), Buffer.alloc(8)]);
    const fetchMock = vi.fn().mockResolvedValue(new Response(riff, {status: 200}));
    vi.stubGlobal('fetch', fetchMock);
    const { generateAudioFromText } = await import('@/ai/flows/generate-audio-from-text');
    const result = await generateAudioFromText({ text: 'Guten Tag', language: 'de' });
    expect(Buffer.from(result.audioDataUri.split(',')[1], 'base64').toString('ascii', 0, 4)).toBe('RIFF');
    expect(fetchMock.mock.calls[0][0]).toContain('/audio/speech');
  });
  it('protects the user from unapproved image expenses', async () => {
    delete process.env.OPENAI_ENABLE_IMAGES;
    vi.stubGlobal('fetch', vi.fn());
    const { generateProfessionalPhoto } = await import('@/ai/flows/generate-professional-photo');
    await expect(generateProfessionalPhoto({ userPhoto: 'data:image/png;base64,AAECAw==', style: 'business' })).rejects.toThrow('nicht freigeschaltet');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('passes a user photo to OpenAI image edits only after opt-in', async () => {
    process.env.OPENAI_ENABLE_IMAGES = 'true';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({data:[{b64_json:'AAECAw=='}]}),{status:200}));
    vi.stubGlobal('fetch', fetchMock);
    const { generateProfessionalPhoto } = await import('@/ai/flows/generate-professional-photo');
    const result = await generateProfessionalPhoto({ userPhoto: 'data:image/png;base64,AAECAw==', style: 'business' });
    expect(result).toEqual({generatedPhoto:'data:image/png;base64,AAECAw=='});
    expect(fetchMock.mock.calls[0][0]).toContain('/images/edits');
    expect((fetchMock.mock.calls[0][1].body as FormData).get('model')).toBe('gpt-image-1-mini');
    delete process.env.OPENAI_ENABLE_IMAGES;
  });
});
