'use client';

import { useState, type ChangeEvent } from 'react';
import { createApplicationBackup, readApplicationBackup, readBrowserApplications } from '@/lib/browser-applications';
import { readLocalRecord, writeLocalRecords } from '@/lib/local-workspace';
import { createWorkspaceBackup, emptyWorkspaceDraft, encryptWorkspaceBackup, parseWorkspaceDraft, readLocalDocuments, readWorkspaceBackup } from '@/lib/local-vault';

export function WorkspaceBackup({ userId }: { userId: string }) {
  const applicationKey = `motivationsboost.applications.v1.${userId}`;
  const draftKey = `letter:${userId}`;
  const documentsKey = `documents:${userId}`;
  const [passphrase, setPassphrase] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function exportWorkspace() {
    setMessage('');
    if (passphrase && passphrase.length < 12) {
      setMessage('Verwende für eine verschlüsselte Sicherung mindestens 12 Zeichen.');
      return;
    }
    setBusy(true);
    try {
      const [applications, draft, documents] = await Promise.all([
        readBrowserApplications(applicationKey), readLocalRecord(draftKey), readLocalRecord(documentsKey),
      ]);
      const contents = await createWorkspaceBackup(
        createApplicationBackup(applications), parseWorkspaceDraft(draft), readLocalDocuments(documents),
      );
      const data = passphrase
        ? await encryptWorkspaceBackup(contents, passphrase)
        : new Blob([contents], { type: 'application/json' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = passphrase ? 'motivationsboost-arbeitsplatz.mbbackup' : 'motivationsboost-arbeitsplatz.json';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setPassphrase('');
      setMessage('Die lokale Sicherung wurde zum Download bereitgestellt.');
    } catch {
      setMessage('Die lokale Sicherung konnte nicht erstellt werden.');
    } finally {
      setBusy(false);
    }
  }

  async function importWorkspace(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const backup = await readWorkspaceBackup(file, passphrase);
      const applications = readApplicationBackup(backup.applications);
      if (!window.confirm('Die Sicherung ersetzt die Bewerbungen, den Entwurf und die Unterlagen dieses Kontos in diesem Browser. Jetzt wiederherstellen?')) return;
      await writeLocalRecords([
        { key: applicationKey, value: applications },
        { key: draftKey, value: backup.draft },
        { key: documentsKey, value: backup.documents },
      ]);
      window.location.reload();
    } catch {
      setMessage('Sicherung konnte nicht gelesen werden. Prüfe Datei und Passphrase.');
    } finally {
      setBusy(false);
    }
  }

  async function clearWorkspace() {
    if (!window.confirm('Bewerbungen, Entwurf und Unterlagen dieses Kontos in diesem Browser löschen? Eine vorhandene Sicherungsdatei bleibt separat gespeichert.')) return;
    setBusy(true);
    try {
      await writeLocalRecords([
        { key: applicationKey, value: [] },
        { key: draftKey, value: emptyWorkspaceDraft },
        { key: documentsKey, value: [] },
      ]);
      window.location.reload();
    } catch {
      setMessage('Die lokale Ablage konnte nicht gelöscht werden.');
      setBusy(false);
    }
  }

  return <section className="space-y-3 rounded-xl border p-5">
    <h2 className="text-xl font-semibold">Lokalen Arbeitsplatz sichern</h2>
    <p className="text-sm">Die Datei enthält deine lokalen Bewerbungen, Unterlagen und den Entwurf. Mit Passphrase wird sie verschlüsselt. Bewahre die Sicherung und die Passphrase getrennt auf.</p>
    <label>Sicherungs-Passphrase, optional
      <input className="block w-full max-w-md rounded border px-2 py-1 text-slate-900" type="password" autoComplete="new-password" maxLength={128} value={passphrase} onChange={event => setPassphrase(event.target.value)} />
    </label>
    <div className="flex flex-wrap gap-4">
      <button type="button" disabled={busy} className="underline" onClick={() => void exportWorkspace()}>Arbeitsplatz sichern</button>
      <label>Arbeitsplatz wiederherstellen<input type="file" className="block max-w-full" accept=".json,.mbbackup" disabled={busy} onChange={event => void importWorkspace(event)} /></label>
      <button type="button" disabled={busy} className="underline" onClick={() => void clearWorkspace()}>Gesamten lokalen Arbeitsplatz löschen</button>
    </div>
    {message && <p role="status">{message}</p>}
  </section>;
}
