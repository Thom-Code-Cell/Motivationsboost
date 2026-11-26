'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { supportsLocalTextRecognition } from '@/lib/local-ocr';
import { useProductLanguage } from '@/components/product-language';
import { documentsCopy } from '@/lib/product-documents-copy';
import { DocumentOcr } from './document-ocr';
import { readLocalRecord, updateLocalRecord } from '@/lib/local-workspace';
import { documentCategories, isLocalDocumentName, maximumLocalFileBytes, maximumVaultBytes, readLocalDocuments, type LocalDocument, type LocalDocumentCategory } from '@/lib/local-vault';

export function LocalDocuments({ userId, onUseText }: { userId: string; onUseText: (text: string) => void }) {
  const locale = useProductLanguage();
  const copy = documentsCopy[locale];
  const [ocrId, setOcrId] = useState<string>();
  const key = `documents:${userId}`;
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [category, setCategory] = useState<LocalDocumentCategory>('Lebenslauf');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void readLocalRecord(key).then(readLocalDocuments).then(value => {
      if (active) setDocuments(value);
    }).catch(() => {
      if (active) setError(copy.readError);
    });
    return () => { active = false; };
  }, [key, copy.readError]);

  async function update(change: (current: LocalDocument[]) => LocalDocument[]) {
    setError('');
    try {
      const next = await updateLocalRecord(key, stored => change(readLocalDocuments(stored)));
      setDocuments(next);
      return true;
    } catch (cause) {
      setError(cause instanceof Error && cause.message === 'Local vault limit'
        ? copy.full
        : copy.saveError);
      return false;
    }
  }

  function add(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (!files.length) return;
    if (files.some(file => !file.size || file.size > maximumLocalFileBytes || !isLocalDocumentName(file.name))) {
      setError(copy.invalid);
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

  return <section lang={locale} className="space-y-3 rounded-xl border p-5">
    <h2 className="text-xl font-semibold">{copy.title}</h2>
    <p className="text-sm">{copy.storage}</p>
    <div className="flex flex-wrap gap-3">
      <label>{copy.category}<select className="block rounded border p-1" value={category} onChange={event => setCategory(event.target.value as LocalDocumentCategory)}>
        {documentCategories.map((value, index) => <option key={value} value={value}>{copy.categories[index]}</option>)}
      </select></label>
      <label>{copy.add}<input type="file" multiple className="block max-w-full" accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,.heic,.heif" onChange={add} /></label>
      <label>{copy.camera}<input type="file" className="block max-w-full" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" onChange={add} /></label>
    </div>
    <p className="text-sm">{copy.capture}</p>
    {error && <p role="alert">{error}</p>}
    {documents.length > 0 && <ul className="space-y-2">{documents.map(document => <li key={document.id} className="break-all rounded border p-3">
      <span>{document.name} · {copy.categories[documentCategories.indexOf(document.category)]}</span>
      {supportsLocalTextRecognition(document.name) && <button className="ml-3 underline" type="button" aria-expanded={ocrId === document.id} onClick={() => setOcrId(ocrId === document.id ? undefined : document.id)}>
        {ocrId === document.id ? copy.close : copy.open}
      </button>}
      {ocrId === document.id && <DocumentOcr document={document} onUse={onUseText} onSave={extractedText => update(current => current.map(item => item.id === document.id ? { ...item, extractedText } : item))} />}
      <button type="button" className="ml-3 underline" onClick={() => download(document)}>{copy.download}</button>
      <button type="button" className="ml-3 underline" onClick={() => {
        if (window.confirm(copy.confirmRemove)) void update(current => current.filter(item => item.id !== document.id));
      }}>{copy.remove}</button>
    </li>)}</ul>}
    {documents.length > 0 && <button type="button" className="underline" onClick={() => {
      if (window.confirm(copy.confirmClear)) void update(() => []);
    }}>{copy.clear}</button>}
  </section>;
}
