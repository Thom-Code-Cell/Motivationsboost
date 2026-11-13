'use client';
import { useCallback, useEffect, useState } from 'react';
type Item = { id: string; jobTitle: string; company: string; status: string; jobUrl: string };
const statuses = ['Entwurf', 'Gesendet', 'Antwort erhalten', 'Interview', 'Absage', 'Zusage'];
export function Applications({ userId }: { userId: string }) {
  const key = `motivationsboost.applications.v1.${userId}`;
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ jobTitle: '', company: '', jobUrl: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) throw new Error('Gespeicherte Daten sind ungültig.');
    setItems(parsed as Item[]);
  }, [key]);
  useEffect(() => { try { load(); } catch { setError('Lokale Bewerbungen konnten nicht geladen werden.'); } }, [load]);
  function save(next: Item[]) {
    localStorage.setItem(key, JSON.stringify(next));
    setItems(next);
  }
  function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const url = new URL(form.jobUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Bitte einen gültigen Link eingeben.');
      save([...items, { ...form, id: crypto.randomUUID(), status: 'Entwurf' }]);
      setForm({ jobTitle: '', company: '', jobUrl: '' });
    } catch { setError('Bewerbung konnte auf diesem Gerät nicht gespeichert werden.'); } finally { setBusy(false); }
  }
  function change(id: string, method: 'PATCH' | 'DELETE', status?: string) {
    setBusy(true); setError('');
    try { save(method === 'DELETE' ? items.filter(item => item.id !== id) : items.map(item => item.id === id && status && statuses.includes(status) ? { ...item, status } : item)); }
    catch { setError('Änderung konnte auf diesem Gerät nicht gespeichert werden.'); } finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-xl border p-5"><h2 className="text-xl font-semibold">Meine Bewerbungen</h2><p className="text-sm">Diese Übersicht wird in diesem Browser auf deinem Gerät gespeichert. Andere Personen mit Zugriff auf das Gerät können sie möglicherweise lesen. Beim Löschen der Browserdaten kann sie verloren gehen.</p>
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
