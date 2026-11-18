'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  return <main className="mx-auto max-w-lg space-y-5 px-5 py-12">
    <h1 className="text-3xl font-semibold">Neues Passwort festlegen</h1>
    <p>Verwende mindestens 12 Zeichen. Nach dem Speichern kannst du dich neu anmelden.</p>
    <form className="space-y-4" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setMessage('');
      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword: password }),
        });
        if (!response.ok) throw new Error('Der Link ist ungültig oder abgelaufen. Fordere einen neuen Link an.');
        setMessage('Passwort geändert. Du kannst dich jetzt anmelden.');
        setTimeout(() => router.replace('/'), 800);
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Das Passwort konnte nicht geändert werden.'); }
      finally { setBusy(false); }
    }}>
      <label className="block space-y-1"><span>Neues Passwort</span><input autoComplete="new-password" type="password" required minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-lg border p-3 text-slate-900" /></label>
      <button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Wird gespeichert …' : 'Passwort speichern'}</button>
    </form>
    {message && <p role="status">{message}</p>}
  </main>;
}
