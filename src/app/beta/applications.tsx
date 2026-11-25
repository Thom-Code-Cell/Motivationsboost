'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { applicationInput, applicationUpdate } from '@/lib/application-input';
import {
  createApplicationBackup, mergeBrowserApplications, readApplicationBackup, readBrowserApplications,
  writeBrowserApplications, type BrowserApplication,
} from '@/lib/browser-applications';

const emptyForm = { jobTitle: '', company: '', jobUrl: '' };
const statuses = applicationUpdate.shape.status.options;

export function Applications({ userId, internal = false }: { userId: string; internal?: boolean }) {
  const key = `motivationsboost.applications.v1.${userId}`;
  const [items, setItems] = useState<BrowserApplication[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    function load() {
      try {
        setItems(readBrowserApplications(key));
      } catch {
        setError('Die lokalen Bewerbungen konnten nicht gelesen werden.');
      }
    }
    function synchronize(event: StorageEvent) {
      if (event.key === key || event.key === null) load();
    }
    load();
    window.addEventListener('storage', synchronize);
    return () => window.removeEventListener('storage', synchronize);
  }, [key]);

  function save(update: (current: BrowserApplication[]) => BrowserApplication[]) {
    setItems(writeBrowserApplications(key, update));
  }

  function change(update: (current: BrowserApplication[]) => BrowserApplication[]) {
    setError('');
    try {
      save(update);
      return true;
    } catch {
      setError('Änderung konnte nicht gespeichert werden. Prüfe die Eingaben und den verfügbaren Browserspeicher.');
      return false;
    }
  }

  function create(event: FormEvent) {
    event.preventDefault();
    if (change(current => [...current, {
      ...applicationInput.parse(form),
      id: crypto.randomUUID(),
      status: 'Entwurf',
      applicationDate: new Date().toISOString(),
    }])) setForm(emptyForm);
  }

  function merge(incoming: unknown, description: string) {
    save(current => mergeBrowserApplications(current, incoming));
    setMessage(description);
  }

  async function importPrevious() {
    setImporting(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/v2/applications', { cache: 'no-store' });
      if (!response.ok) throw new Error('Import unavailable');
      const data: { applications: unknown } = await response.json();
      merge(data.applications, 'Vorhandene Serverdaten wurden in diesen Browser übernommen. Die Originale bleiben für den Kontodatenexport erhalten.');
    } catch {
      setError('Die bisherigen Bewerbungen konnten nicht übernommen werden.');
    } finally {
      setImporting(false);
    }
  }

  function download() {
    setError('');
    try {
      const content = createApplicationBackup(readBrowserApplications(key));
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'motivationsboost-bewerbungen.json';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('Die lokale Sicherung konnte nicht erstellt werden.');
    }
  }

  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setError('');
    setMessage('');
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Backup too large');
      merge(readApplicationBackup(await file.text()), 'Sicherung übernommen. Vorhandene Bewerbungen mit derselben ID bleiben erhalten.');
    } catch {
      setError('Die Sicherung konnte nicht gelesen oder gespeichert werden.');
    }
  }

  return <section className="space-y-4 rounded-xl border p-5">
    <h2 className="text-xl font-semibold">Meine Bewerbungen</h2>
    <p className="text-sm">Neue Bewerbungen bleiben in diesem Browser. Beim Löschen der Browserdaten können sie verloren gehen. Sichere die Datei an einem privaten Ort.</p>
    <form onSubmit={create} className="grid gap-3">
      <label>Stelle<input required maxLength={200} className="block w-full rounded border p-2 text-slate-900" value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} /></label>
      <label>Unternehmen<input required maxLength={200} className="block w-full rounded border p-2 text-slate-900" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></label>
      <label>Link zum Inserat<input required type="url" maxLength={2048} className="block w-full rounded border p-2 text-slate-900" value={form.jobUrl} onChange={e => setForm({ ...form, jobUrl: e.target.value })} /></label>
      <button className="rounded bg-slate-900 px-4 py-2 text-white">Bewerbung hinzufügen</button>
    </form>
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button type="button" className="underline" onClick={download}>Lokale Bewerbungen sichern</button>
      <label>Lokale Sicherung einlesen<input className="block max-w-full" type="file" accept=".json,application/json" onChange={restore} /></label>
      {!internal && <button type="button" className="underline" disabled={importing} onClick={() => void importPrevious()}>Bisherige Serverdaten übernehmen</button>}
      <button type="button" className="underline" disabled={!items.length} onClick={() => {
        if (window.confirm('Alle lokalen Bewerbungen in diesem Browser löschen?')) change(() => []);
      }}>Lokale Bewerbungen löschen</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {items.length === 0 ? <p>Noch keine Bewerbungen erfasst.</p> : <ul className="space-y-3">{items.map(item => <li key={item.id} className="break-words rounded border p-3">
      <p className="font-medium">{item.jobTitle} · {item.company}</p>
      {item.notes && <p className="whitespace-pre-wrap">{item.notes}</p>}
      {item.jobUrl && <a className="underline" href={item.jobUrl} target="_blank" rel="noreferrer">Inserat öffnen</a>}
      <label className="ml-2">Status <select value={item.status} onChange={e => {
        const status = applicationUpdate.shape.status.parse(e.target.value);
        change(current => current.map(record => record.id === item.id ? { ...record, status } : record));
      }} className="rounded border p-1 text-slate-900">{statuses.map(status => <option key={status}>{status}</option>)}</select></label>
      <button type="button" onClick={() => {
        if (window.confirm('Diese Bewerbung in diesem Browser löschen?')) change(current => current.filter(record => record.id !== item.id));
      }} className="ml-3 underline">Löschen</button>
    </li>)}</ul>}
  </section>;
}
