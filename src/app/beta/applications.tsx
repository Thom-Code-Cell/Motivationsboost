'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useProductLanguage } from '@/components/product-language';
import { applicationInput, applicationUpdate } from '@/lib/application-input';
import { productApplicationsCopy } from '@/lib/product-applications-copy';
import {
  createApplicationBackup, mergeBrowserApplications, readApplicationBackup, readBrowserApplications,
  writeBrowserApplications, type BrowserApplication,
} from '@/lib/browser-applications';

const emptyForm = { jobTitle: '', company: '', jobUrl: '', dueDate: '' };
const statuses = applicationUpdate.shape.status.options;
type ApplicationError = 'loadFailed' | 'saveFailed' | 'previousFailed' | 'backupFailed' | 'restoreFailed';
type ApplicationMessage = 'previousSuccess' | 'restoreSuccess';

export function Applications({ userId, internal = false }: { userId: string; internal?: boolean }) {
  const copy = productApplicationsCopy[useProductLanguage()];
  const key = `motivationsboost.applications.v1.${userId}`;
  const [items, setItems] = useState<BrowserApplication[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<ApplicationError>();
  const [message, setMessage] = useState<ApplicationMessage>();
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const records = await readBrowserApplications(key);
        if (active) setItems(records);
      } catch {
        if (active) setError('loadFailed');
      }
    }
    function synchronize(event: StorageEvent) {
      if (event.key === key || event.key === null) void load();
    }
    void load();
    window.addEventListener('storage', synchronize);
    return () => {
      active = false;
      window.removeEventListener('storage', synchronize);
    };
  }, [key]);

  async function save(update: (current: BrowserApplication[]) => BrowserApplication[]) {
    setItems(await writeBrowserApplications(key, update));
  }

  async function change(update: (current: BrowserApplication[]) => BrowserApplication[]) {
    setError(undefined);
    try {
      await save(update);
      return true;
    } catch {
      setError('saveFailed');
      return false;
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    const { dueDate, ...details } = form;
    if (await change(current => [...current, {
      ...applicationInput.parse(details),
      id: crypto.randomUUID(),
      status: 'Entwurf',
      applicationDate: new Date().toISOString(),
      dueDate: dueDate || undefined,
    }])) setForm(emptyForm);
  }

  async function merge(incoming: unknown, description: ApplicationMessage) {
    await save(current => mergeBrowserApplications(current, incoming));
    setMessage(description);
  }

  async function importPrevious() {
    setImporting(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const response = await fetch('/api/v2/applications', { cache: 'no-store' });
      if (!response.ok) throw new Error('Import unavailable');
      const data: { applications: unknown } = await response.json();
      await merge(data.applications, 'previousSuccess');
    } catch {
      setError('previousFailed');
    } finally {
      setImporting(false);
    }
  }

  async function download() {
    setError(undefined);
    try {
      const content = createApplicationBackup(await readBrowserApplications(key));
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'motivationsboost-bewerbungen.json';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('backupFailed');
    }
  }

  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setError(undefined);
    setMessage(undefined);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Backup too large');
      await merge(readApplicationBackup(await file.text()), 'restoreSuccess');
    } catch {
      setError('restoreFailed');
    }
  }

  return <section className="space-y-4 rounded-xl border p-5">
    <h2 className="text-xl font-semibold">{copy.heading}</h2>
    <p className="text-sm">{copy.intro}</p>
    <form onSubmit={create} className="grid gap-3">
      <label>{copy.job}<input required maxLength={200} className="block w-full rounded border p-2 text-slate-900" value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} /></label>
      <label>{copy.company}<input required maxLength={200} className="block w-full rounded border p-2 text-slate-900" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></label>
      <label>{copy.link}<input required type="url" maxLength={2048} className="block w-full rounded border p-2 text-slate-900" value={form.jobUrl} onChange={e => setForm({ ...form, jobUrl: e.target.value })} /></label>
      <label>{copy.date}<input type="date" className="block max-w-full rounded border p-2 text-slate-900" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} /></label>
      <button className="rounded bg-slate-900 px-4 py-2 text-white">{copy.add}</button>
    </form>
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button type="button" className="underline" onClick={download}>{copy.backup}</button>
      <label>{copy.restore}<input className="block max-w-full" type="file" accept=".json,application/json" onChange={restore} /></label>
      {!internal && <button type="button" className="underline" disabled={importing} onClick={() => void importPrevious()}>{copy.previous}</button>}
      <button type="button" className="underline" disabled={!items.length} onClick={() => {
        if (window.confirm(copy.confirmAll)) change(() => []);
      }}>{copy.removeAll}</button>
    </div>
    {error && <p role="alert">{copy[error]}</p>}
    {message && <p role="status">{copy[message]}</p>}
    {items.length === 0 ? <p>{copy.empty}</p> : <ul className="space-y-3">{items.map(item => <li key={item.id} className="break-words rounded border p-3">
      <p className="font-medium">{item.jobTitle} · {item.company}</p>
      {item.notes && <p className="whitespace-pre-wrap">{item.notes}</p>}
      {item.jobUrl && <a className="underline" href={item.jobUrl} target="_blank" rel="noreferrer">{copy.view}</a>}
      <label className="ml-2">{copy.status} <select value={item.status} onChange={e => {
        const status = applicationUpdate.shape.status.parse(e.target.value);
        change(current => current.map(record => record.id === item.id ? { ...record, status } : record));
      }} className="rounded border p-1 text-slate-900">{statuses.map(status => <option key={status} value={status}>{copy.statuses[status]}</option>)}</select></label>
      <label className="mt-2 block">{copy.due} {item.jobTitle}
        <input type="date" className="ml-2 max-w-full rounded border p-1 text-slate-900" value={item.dueDate ?? ''} onChange={event => {
          const dueDate = event.target.value || undefined;
          void change(current => current.map(record => record.id === item.id ? { ...record, dueDate } : record));
        }} />
      </label>
      <button type="button" onClick={() => {
        if (window.confirm(copy.confirmOne)) change(current => current.filter(record => record.id !== item.id));
      }} className="ml-3 underline">{copy.remove}</button>
    </li>)}</ul>}
  </section>;
}
