import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const guard = vi.hoisted(() => ({ requireSession: vi.fn(), authorizeAI: vi.fn() }));
vi.mock('@/lib/server/session', () => guard);
import { getFileContentFromDrive, listDriveFiles, importDriveFile, saveFileToDrive, uploadDocument } from '@/services/drive';
beforeEach(() => { guard.requireSession.mockResolvedValue({ uid: 'alice', firebase: { identities: { 'google.com': ['google-alice'] } } }); });
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
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
});
