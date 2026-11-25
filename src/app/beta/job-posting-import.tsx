'use client';

import { useState } from 'react';

export function JobPostingImport({ hasText, onImport }: { hasText: boolean; onImport: (text: string) => void }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function importPosting() {
    if (!url.trim() || busy) return;
    setBusy(true);
    setStatus('');
    setError('');
    try {
      const response = await fetch('/api/v2/job-posting', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }),
      });
      const result = await response.json() as { text?: string; error?: string };
      if (!response.ok || typeof result.text !== 'string') throw new Error(result.error || 'Der Import ist derzeit nicht verfügbar.');
      onImport(result.text);
      setStatus('Anzeigentext übernommen. Prüfe, ob die Stelle und die Anforderungen stimmen.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Der Import ist derzeit nicht verfügbar.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-2 rounded-lg border p-4">
    <label className="block space-y-1"><span className="font-medium">Link zum Stelleninserat</span>
      <input type="url" inputMode="url" maxLength={2048} autoComplete="off" placeholder="https://…"
        className="w-full rounded-lg border p-3 text-slate-900" value={url} onChange={event => setUrl(event.target.value)} />
    </label>
    <p className="text-sm text-slate-600">Du kannst den Text auch unten direkt einfügen. Für den Import ruft Motivationsboost die öffentliche Inseratseite auf.</p>
    <button type="button" className="rounded-lg border px-3 py-2 disabled:opacity-50" disabled={busy || !url.trim()} onClick={() => void importPosting()}>
      {busy ? 'Inserat wird geladen …' : hasText ? 'Vorhandenen Anzeigentext durch Linkimport ersetzen' : 'Stelleninserat per Link übernehmen'}
    </button>
    {status && <p role="status">{status}</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
