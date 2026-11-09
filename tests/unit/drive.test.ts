import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const guard = vi.hoisted(() => ({ requireSession: vi.fn(), authorizeAI: vi.fn() }));
vi.mock('@/lib/server/session', () => guard);
import { jsPDF } from 'jspdf';
import { extractTextFromDriveFile, getFileContentFromDrive, listDriveFiles, importDriveFile, saveFileToDrive, uploadDocument } from '@/services/drive';
beforeEach(() => { guard.requireSession.mockResolvedValue({ uid: 'alice', firebase: { identities: { 'google.com': ['google-alice'] } } }); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
describe('Drive ownership, import and persistence', () => {
  it('rejects unauthenticated Drive actions before contacting Google', async () => {
    guard.requireSession.mockRejectedValue(new Error('Bitte anmelden.'));
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(listDriveFiles('test-token')).rejects.toThrow('anmelden'); expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects a token belonging to another Google account', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ id: 'google-bob' })); vi.stubGlobal('fetch', fetch);
    await expect(listDriveFiles('test-token')).rejects.toThrow('stimmt nicht'); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('reports expired Drive tokens', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 401)));
    await expect(listDriveFiles('expired')).rejects.toThrow('abgelaufen');
  });
  it('does not create a folder merely to read an absent saved document', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ id: 'google-alice' })).mockResolvedValueOnce(json({ files: [] })); vi.stubGlobal('fetch', fetch);
    expect(await getFileContentFromDrive('token', 'cv_data.json')).toBeNull(); expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('paginates the app folder and returns all documents', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ id: 'google-alice' })).mockResolvedValueOnce(json({ files: [{ id: 'folder' }] })).mockResolvedValueOnce(json({ files: [{ id: 'a', name: 'Zeugnis.pdf' }], nextPageToken: 'page2' })).mockResolvedValueOnce(json({ files: [{ id: 'b', name: 'Diplom.docx' }] })); vi.stubGlobal('fetch', fetch);
    expect(await listDriveFiles('token')).toHaveLength(2); expect(fetch.mock.calls[3][0]).toContain('pageToken=page2');
  });
  it('copies a Picker selection into the app folder', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ id: 'google-alice' })).mockResolvedValueOnce(json({ files: [{ id: 'folder' }] })).mockResolvedValueOnce(json({ id: 'copy', name: 'Zeugnis.pdf' })); vi.stubGlobal('fetch', fetch);
    expect(await importDriveFile('token', 'selected')).toEqual({ id: 'copy', name: 'Zeugnis.pdf' });
    expect(fetch.mock.calls[2][0]).toContain('/selected/copy'); expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ parents: ['folder'] });
  });
  it('updates an existing document instead of creating a duplicate', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ id: 'google-alice' })).mockResolvedValueOnce(json({ files: [{ id: 'folder' }] })).mockResolvedValueOnce(json({ files: [{ id: 'existing' }] })).mockResolvedValueOnce(json({ id: 'existing' })); vi.stubGlobal('fetch', fetch);
    await saveFileToDrive('token', 'motivation_letter.txt', 'Mein Brief', 'text/plain');
    expect(fetch.mock.calls[3][0]).toContain('/existing?'); expect(fetch.mock.calls[3][1].method).toBe('PATCH');
  });
  it('does not swallow Drive errors as missing data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ id: 'google-alice' })).mockResolvedValueOnce(json({}, 500)));
    await expect(getFileContentFromDrive('token', 'cv_data.json')).rejects.toThrow('nicht ausführen');
  });
  it('rejects unsupported upload files', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ id: 'google-alice' })));
    const form = new FormData(); form.set('file', new File(['run'], 'malware.exe', { type: 'application/octet-stream' }));
    await expect(uploadDocument('token', form)).rejects.toThrow('Unterstützt');
  });
  it('transcribes a scanned PDF with no text layer through bounded GPT PDF input', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    const bytes = new jsPDF().output('arraybuffer');
    const fetch = vi.fn().mockResolvedValueOnce(json({ id: 'google-alice' })).mockResolvedValueOnce(json({ mimeType: 'application/pdf', size: bytes.byteLength })).mockResolvedValueOnce(new Response(bytes)).mockResolvedValueOnce(json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Arbeitszeugnis: Alice arbeitete als Betriebsleiterin.' }] }] }));
    vi.stubGlobal('fetch', fetch);
    expect(await extractTextFromDriveFile('scan', 'token')).toContain('Betriebsleiterin');
    expect(guard.authorizeAI).toHaveBeenCalledWith({ documentId: 'scan' });
    expect(JSON.parse(fetch.mock.calls[3][1].body).input[0].content[1].file_data.split(';')[0].replace('data:', '')).toBe('application/pdf');
  });
  it('extracts a PDF text layer without spending an OCR request', async () => {
    const pdf = new jsPDF(); pdf.text('Arbeitszeugnis mit echtem Text', 20, 20); const bytes = pdf.output('arraybuffer');
    const fetch = vi.fn().mockResolvedValueOnce(json({ id: 'google-alice' })).mockResolvedValueOnce(json({ mimeType: 'application/pdf', size: bytes.byteLength })).mockResolvedValueOnce(new Response(bytes)); vi.stubGlobal('fetch', fetch);
    expect(await extractTextFromDriveFile('text-pdf', 'token')).toContain('Arbeitszeugnis mit echtem Text');
    expect(guard.authorizeAI).not.toHaveBeenCalled(); expect(fetch).toHaveBeenCalledTimes(3);
  });

});
