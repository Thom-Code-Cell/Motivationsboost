'use client';
import { useCallback, useEffect, useState } from 'react';
type Item = { id: string; jobTitle: string; company: string; status: string; jobUrl: string };
const statuses = ['Entwurf', 'Gesendet', 'Antwort erhalten', 'Interview', 'Absage', 'Zusage'];
export function Applications() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ jobTitle: '', company: '', jobUrl: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch('/api/v2/applications', { cache: 'no-store' });
    if (!response.ok) throw new Error('Bewerbungen konnten nicht geladen werden.');
    const data = await response.json() as { applications: Item[] };
    setItems(data.applications);
  }, []);
  useEffect(() => { void load().catch(() => setError('Bewerbungen konnten nicht geladen werden.')); }, [load]);
  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/v2/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error('Bewerbung konnte nicht gespeichert werden.');
      setForm({ jobTitle: '', company: '', jobUrl: '' }); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Bitte später erneut versuchen.'); } finally { setBusy(false); }
  }
  async function change(id: string, method: 'PATCH' | 'DELETE', status?: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/v2/applications/${id}`, { method, ...(status ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) } : {}) });
      if (!response.ok) throw new Error('Änderung konnte nicht gespeichert werden.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Bitte später erneut versuchen.'); } finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-xl border p-5"><h2 className="text-xl font-semibold">Meine Bewerbungen</h2>
    <form onSubmit={create} className="grid gap-3">
      <label>Stelle<input required maxLength={200} className="block w-full rounded border p-2" value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} /></label>
      <label>Unternehmen<input required maxLength={200} className="block w-full rounded border p-2" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></label>
      <label>Link zum Inserat<input required type="url" className="block w-full rounded border p-2" value={form.jobUrl} onChange={e => setForm({ ...form, jobUrl: e.target.value })} /></label>
      <button disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Bewerbung hinzufügen</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {items.length === 0 ? <p>Noch keine Bewerbungen erfasst.</p> : <ul className="space-y-3">{items.map(item => <li key={item.id} className="rounded border p-3"><p className="font-medium">{item.jobTitle} · {item.company}</p><label>Status <select disabled={busy} value={item.status} onChange={e => void change(item.id, 'PATCH', e.target.value)} className="rounded border p-1">{statuses.map(status => <option key={status}>{status}</option>)}</select></label><button disabled={busy} onClick={() => { if (window.confirm('Diese Bewerbung wirklich löschen?')) void change(item.id, 'DELETE'); }} className="ml-3 underline">Löschen</button></li>)}</ul>}
  </section>;
}
