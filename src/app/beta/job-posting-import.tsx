'use client';

import { useState } from 'react';
import { useProductLanguage } from '@/components/product-language';
import { productFormCopy } from '@/lib/product-form-copy';

export function JobPostingImport({ hasText, onImport }: { hasText: boolean; onImport: (text: string) => void }) {
  const copy = productFormCopy[useProductLanguage()].job;
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState(false);
  const [error, setError] = useState<keyof typeof copy>();

  async function importPosting() {
    if (!url.trim() || busy) return;
    setBusy(true);
    setImported(false);
    setError(undefined);
    try {
      const response = await fetch('/api/v2/job-posting', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }),
      });
      const result = await response.json() as { text?: string };
      if (!response.ok || typeof result.text !== 'string') {
        const failures: Record<number, keyof typeof copy> = { 400: 'invalid', 401: 'login', 403: 'origin', 413: 'tooLong', 422: 'unreadable', 429: 'limited' };
        setError(failures[response.status] ?? 'unavailable');
        return;
      }
      onImport(result.text);
      setImported(true);
    } catch {
      setError('unavailable');
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-2 rounded-lg border p-4">
    <label className="block space-y-1"><span className="font-medium">{copy.label}</span>
      <input type="url" inputMode="url" maxLength={2048} autoComplete="off" placeholder="https://…"
        className="w-full rounded-lg border p-3 text-slate-900" value={url} onChange={event => setUrl(event.target.value)} />
    </label>
    <p className="text-sm text-slate-600">{copy.intro}</p>
    <button type="button" className="rounded-lg border px-3 py-2 disabled:opacity-50" disabled={busy || !url.trim()} onClick={() => void importPosting()}>
      {busy ? copy.busy : hasText ? copy.replace : copy.import}
    </button>
    {imported && <p role="status">{copy.done}</p>}
    {error && <p role="alert">{copy[error]}</p>}
  </div>;
}
