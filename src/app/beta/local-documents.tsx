'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { readLocalRecord, updateLocalRecord } from '@/lib/local-workspace';
import { documentCategories, isLocalDocumentName, maximumLocalFileBytes, maximumVaultBytes, readLocalDocuments, type LocalDocument, type LocalDocumentCategory } from '@/lib/local-vault';

export function LocalDocuments({ userId }: { userId: string }) {
  const key = `documents:${userId}`;
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [category, setCategory] = useState<LocalDocumentCategory>('Lebenslauf');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void readLocalRecord(key).then(readLocalDocuments).then(value => {
      if (active) setDocuments(value);
    }).catch(() => {
      if (active) setError('Die lokalen Unterlagen konnten nicht gelesen werden.');
    });
    return () => { active = false; };
  }, [key]);

  async function update(change: (current: LocalDocument[]) => LocalDocument[]) {
    setError('');
    try {
      const next = await updateLocalRecord(key, stored => change(readLocalDocuments(stored)));
      setDocuments(next);
    } catch (cause) {
      setError(cause instanceof Error && cause.message === 'Local vault limit'
        ? 'Die lokale Ablage ist voll. Sichere und entferne zuerst ältere Dateien.'
        : 'Die lokale Ablage konnte nicht gespeichert werden.');
    }
  }

  function add(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (!files.length) return;
    if (files.some(file => !file.size || file.size > maximumLocalFileBytes || !isLocalDocumentName(file.name))) {
      setError('Wähle PDF-, DOCX-, TXT-, JPG-, PNG-, WebP- oder HEIC/HEIF-Dateien bis 20 MB pro Datei.');
      return;
    }
    const newDocuments = files.map(file => ({ id: crypto.randomUUID(), name: file.name, category, file }));
    void update(current => {
      const next = [...current, ...newDocuments];
      if (next.reduce((sum, entry) => sum + entry.file.size, 0) > maximumVaultBytes) throw new Error('Local vault limit');
      return next;
    });
  }

  function download(document: LocalDocument) {
    const url = URL.createObjectURL(new Blob([document.file], { type: 'application/octet-stream' }));
    const link = window.document.createElement('a');
    link.href = url;
    link.download = document.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="space-y-3 rounded-xl border p-5">
    <h2 className="text-xl font-semibold">Unterlagen auf diesem Gerät</h2>
    <p className="text-sm">Die Dateien werden hier abgelegt. Motivationsboost lädt sie nicht hoch. Sichere wichtige Unterlagen zusätzlich an einem privaten Ort.</p>
    <div className="flex flex-wrap gap-3">
      <label>Kategorie<select className="block rounded border p-1" value={category} onChange={event => setCategory(event.target.value as LocalDocumentCategory)}>
        {documentCategories.map(value => <option key={value}>{value}</option>)}
      </select></label>
      <label>Datei lokal hinzufügen<input type="file" multiple className="block max-w-full" accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,.heic,.heif" onChange={add} /></label>
      <label>Unterlage fotografieren<input type="file" className="block max-w-full" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" onChange={add} /></label>
    </div>
    <p className="text-sm">Fotografiere die Seiten einzeln oder füge mehrere Dateien zur gewählten Kategorie hinzu. Fotos bleiben als Originaldateien gespeichert.</p>
    {error && <p role="alert">{error}</p>}
    {documents.length > 0 && <ul className="space-y-2">{documents.map(document => <li key={document.id} className="break-all rounded border p-3">
      <span>{document.name} · {document.category}</span>
      <button type="button" className="ml-3 underline" onClick={() => download(document)}>Datei sichern</button>
      <button type="button" className="ml-3 underline" onClick={() => {
        if (window.confirm('Diese Datei aus der lokalen Ablage entfernen?')) void update(current => current.filter(item => item.id !== document.id));
      }}>Datei entfernen</button>
    </li>)}</ul>}
    {documents.length > 0 && <button type="button" className="underline" onClick={() => {
      if (window.confirm('Alle Unterlagen aus der lokalen Ablage entfernen?')) void update(() => []);
    }}>Lokale Unterlagen löschen</button>}
  </section>;
}
