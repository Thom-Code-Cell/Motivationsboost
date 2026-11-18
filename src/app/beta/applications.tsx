'use client';
import { useCallback, useEffect, useState } from 'react';
type Item = { id: string; jobTitle: string; company: string; status: string; jobUrl: string };
type Form = { jobTitle: string; company: string; jobUrl: string };
const statuses = ['Entwurf', 'Gesendet', 'Antwort erhalten', 'Interview', 'Absage', 'Zusage'];

export function Applications({ userId, internal = false }: { userId: string; internal?: boolean }) {
  const key = `motivationsboost.applications.v1.${userId}`;
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<Form>({ jobTitle: '', company: '', jobUrl: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (internal) {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) throw new Error('Gespeicherte Daten sind ungültig.');
      setItems(parsed as Item[]); return;
    }
    const response = await fetch('/api/v2/applications', { cache: 'no-store' });
    const data = await response.json() as { applications?: Item[]; error?: string };
    if (!response.ok || !data.applications) throw new Error(data.error || 'Bewerbungen konnten nicht geladen werden.');
    setItems(data.applications);
  }, [internal, key]);
  useEffect(() => { void load().catch(() => setError('Bewerbungen konnten nicht geladen werden.')); }, [load]);
  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const parsed = new URL(form.jobUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      if (internal) {
        const next = [...items, { ...form, id: crypto.randomUUID(), status: 'Entwurf' }];
        localStorage.setItem(key, JSON.stringify(next)); setItems(next);
      } else {
        const response = await fetch('/api/v2/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (!response.ok) throw new Error('Bewerbung konnte nicht gespeichert werden.');
        await load();
      }
      setForm({ jobTitle: '', company: '', jobUrl: '' });
    } catch { setError('Bewerbung konnte nicht gespeichert werden. Bitte prüfe die Eingaben und Verbindung.'); }
    finally { setBusy(false); }
  }
  async function change(id: string, method: 'PATCH' | 'DELETE', status?: string) {
    setBusy(true); setError('');
    try {
      if (internal) {
        const next = method === 'DELETE' ? items.filter(item => item.id !== id) : items.map(item => item.id === id && status && statuses.includes(status) ? { ...item, status } : item);
        localStorage.setItem(key, JSON.stringify(next)); setItems(next);
      } else {
        const response = await fetch(`/api/v2/applications/${id}`, { method, ...(status ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) } : {}) });
        if (!response.ok) throw new Error('Änderung konnte nicht gespeichert werden.');
        await load();
      }
    } catch { setError('Änderung konnte nicht gespeichert werden. Bitte erneut versuchen.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-xl border p-5"><h2 className="text-xl font-semibold">Meine Bewerbungen</h2><p className="text-sm">{internal ? 'Im lokalen Test bleiben diese Daten in diesem Browser.' : 'Deine Bewerbungen werden in deinem Konto gespeichert.'}</p>
    <form onSubmit={create} className="grid gap-3">
      <label>Stelle<input required maxLength={200} className="block w-full rounded border p-2 text-slate-900" value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} /></label>
      <label>Unternehmen<input required maxLength={200} className="block w-full rounded border p-2 text-slate-900" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></label>
      <label>Link zum Inserat<input required type="url" className="block w-full rounded border p-2 text-slate-900" value={form.jobUrl} onChange={e => setForm({ ...form, jobUrl: e.target.value })} /></label>
      <button disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Bewerbung hinzufügen</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {items.length === 0 ? <p>Noch keine Bewerbungen erfasst.</p> : <ul className="space-y-3">{items.map(item => <li key={item.id} className="rounded border p-3"><p className="font-medium">{item.jobTitle} · {item.company}</p>{item.jobUrl && <a className="underline" href={item.jobUrl} target="_blank" rel="noreferrer">Inserat öffnen</a>}<label className="ml-2">Status <select disabled={busy} value={item.status} onChange={e => void change(item.id, 'PATCH', e.target.value)} className="rounded border p-1 text-slate-900">{statuses.map(status => <option key={status}>{status}</option>)}</select></label><button disabled={busy} onClick={() => { if (window.confirm('Diese Bewerbung wirklich löschen?')) void change(item.id, 'DELETE'); }} className="ml-3 underline">Löschen</button></li>)}</ul>}
  </section>;
}
