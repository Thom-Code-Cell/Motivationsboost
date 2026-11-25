'use client';

import { useState, type ChangeEvent } from 'react';
import { useProductLanguage } from '@/components/product-language';
import { createApplicationBackup, readApplicationBackup, readBrowserApplications } from '@/lib/browser-applications';
import { readLocalRecord, writeLocalRecords } from '@/lib/local-workspace';
import { createWorkspaceBackup, emptyWorkspaceDraft, encryptWorkspaceBackup, parseWorkspaceDraft, readLocalDocuments, readWorkspaceBackup } from '@/lib/local-vault';

const copy = {
  de: {
    title: 'Lokalen Arbeitsplatz sichern', description: 'Die Datei enthält deine lokalen Bewerbungen, Unterlagen und den Entwurf. Mit Passphrase wird sie verschlüsselt. Bewahre die Sicherung und die Passphrase getrennt auf.',
    passphrase: 'Sicherungs-Passphrase, optional', export: 'Arbeitsplatz sichern', restore: 'Arbeitsplatz wiederherstellen', clear: 'Gesamten lokalen Arbeitsplatz löschen',
    short: 'Verwende für eine verschlüsselte Sicherung mindestens 12 Zeichen.', exported: 'Die lokale Sicherung wurde zum Download bereitgestellt.', exportError: 'Die lokale Sicherung konnte nicht erstellt werden.',
    confirmRestore: 'Die Sicherung ersetzt die Bewerbungen, den Entwurf und die Unterlagen dieses Kontos in diesem Browser. Jetzt wiederherstellen?',
    restoreError: 'Sicherung konnte nicht gelesen werden. Prüfe Datei und Passphrase.',
    confirmClear: 'Bewerbungen, Entwurf und Unterlagen dieses Kontos in diesem Browser löschen? Eine vorhandene Sicherungsdatei bleibt separat gespeichert.',
    clearError: 'Die lokale Ablage konnte nicht gelöscht werden.',
  },
  en: {
    title: 'Back up your local workspace', description: 'The file contains your local applications, documents and draft. Add a passphrase to encrypt it. Keep the backup and passphrase separately.',
    passphrase: 'Backup passphrase, optional', export: 'Back up workspace', restore: 'Restore workspace', clear: 'Delete the entire local workspace',
    short: 'Use at least 12 characters for an encrypted backup.', exported: 'Your local backup is ready to download.', exportError: 'The local backup could not be created.',
    confirmRestore: 'This backup will replace the applications, draft and documents for this account in this browser. Restore it now?',
    restoreError: 'The backup could not be read. Check the file and passphrase.',
    confirmClear: 'Delete the applications, draft and documents for this account in this browser? Existing backup files are stored separately.',
    clearError: 'The local workspace could not be deleted.',
  },
  fr: {
    title: 'Sauvegarder votre espace de travail local', description: 'Le fichier contient vos candidatures, vos documents et votre brouillon enregistrés localement. Une phrase secrète permet de le chiffrer. Conservez le fichier et la phrase secrète séparément.',
    passphrase: 'Phrase secrète de sauvegarde, facultative', export: 'Sauvegarder l’espace de travail', restore: 'Restaurer l’espace de travail', clear: 'Supprimer tout l’espace de travail local',
    short: 'Utilisez au moins 12 caractères pour chiffrer la sauvegarde.', exported: 'Votre sauvegarde locale est prête à être téléchargée.', exportError: 'La sauvegarde locale n’a pas pu être créée.',
    confirmRestore: 'Cette sauvegarde remplacera les candidatures, le brouillon et les documents de ce compte dans ce navigateur. Restaurer maintenant ?',
    restoreError: 'Impossible de lire la sauvegarde. Vérifiez le fichier et la phrase secrète.',
    confirmClear: 'Supprimer les candidatures, le brouillon et les documents de ce compte dans ce navigateur ? Les fichiers de sauvegarde existants sont conservés séparément.',
    clearError: 'Impossible de supprimer l’espace de travail local.',
  },
  it: {
    title: 'Esegui il backup dell’area di lavoro locale', description: 'Il file contiene candidature, documenti e bozza salvati localmente. Imposta una passphrase per cifrarlo. Conserva il file e la passphrase separatamente.',
    passphrase: 'Passphrase del backup, facoltativa', export: 'Salva il backup', restore: 'Ripristina l’area di lavoro', clear: 'Elimina tutta l’area di lavoro locale',
    short: 'Usa almeno 12 caratteri per cifrare il backup.', exported: 'Il backup locale è pronto per il download.', exportError: 'Impossibile creare il backup locale.',
    confirmRestore: 'Il backup sostituirà candidature, bozza e documenti di questo account nel browser. Vuoi ripristinarlo adesso?',
    restoreError: 'Impossibile leggere il backup. Controlla il file e la passphrase.',
    confirmClear: 'Vuoi eliminare candidature, bozza e documenti di questo account dal browser? Gli eventuali file di backup restano salvati separatamente.',
    clearError: 'Impossibile eliminare l’area di lavoro locale.',
  },
} as const;

export function WorkspaceBackup({ userId }: { userId: string }) {
  const text = copy[useProductLanguage()];
  const applicationKey = `motivationsboost.applications.v1.${userId}`;
  const draftKey = `letter:${userId}`;
  const documentsKey = `documents:${userId}`;
  const [passphrase, setPassphrase] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function exportWorkspace() {
    setMessage('');
    if (passphrase && passphrase.length < 12) {
      setMessage(text.short);
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
      setMessage(text.exported);
    } catch {
      setMessage(text.exportError);
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
      if (!window.confirm(text.confirmRestore)) return;
      await writeLocalRecords([
        { key: applicationKey, value: applications },
        { key: draftKey, value: backup.draft },
        { key: documentsKey, value: backup.documents },
      ]);
      window.location.reload();
    } catch {
      setMessage(text.restoreError);
    } finally {
      setBusy(false);
    }
  }

  async function clearWorkspace() {
    if (!window.confirm(text.confirmClear)) return;
    setBusy(true);
    try {
      await writeLocalRecords([
        { key: applicationKey, value: [] },
        { key: draftKey, value: emptyWorkspaceDraft },
        { key: documentsKey, value: [] },
      ]);
      window.location.reload();
    } catch {
      setMessage(text.clearError);
      setBusy(false);
    }
  }

  return <section className="space-y-3 rounded-xl border p-5">
    <h2 className="text-xl font-semibold">{text.title}</h2>
    <p className="text-sm">{text.description}</p>
    <label>{text.passphrase}
      <input className="block w-full max-w-md rounded border px-2 py-1 text-slate-900" type="password" autoComplete="new-password" maxLength={128} value={passphrase} onChange={event => setPassphrase(event.target.value)} />
    </label>
    <div className="flex flex-wrap gap-4">
      <button type="button" disabled={busy} className="underline" onClick={() => void exportWorkspace()}>{text.export}</button>
      <label>{text.restore}<input type="file" className="block max-w-full" accept=".json,.mbbackup" disabled={busy} onChange={event => void importWorkspace(event)} /></label>
      <button type="button" disabled={busy} className="underline" onClick={() => void clearWorkspace()}>{text.clear}</button>
    </div>
    {message && <p role="status">{message}</p>}
  </section>;
}
