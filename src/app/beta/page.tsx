'use client';
import { useState } from 'react';
import { createAuthClient } from 'better-auth/react';
import { Applications } from './applications';

const auth = createAuthClient();
const fields = [
  ['cv', 'Lebenslauf und nachgewiesene Erfahrungen'],
  ['job', 'Text der Stellenanzeige'],
  ['motivation', 'Warum interessiert dich diese Stelle?'],
  ['example', 'Ein konkretes Beispiel aus deiner Erfahrung'],
  ['contribution', 'Was möchtest du zum Unternehmen beitragen?'],
] as const;
type Field = typeof fields[number][0];
type BetaUser = { id: string; name?: string | null; email?: string | null };

export default function BetaPage() {
  return process.env.NEXT_PUBLIC_INTERNAL_TEST_MODE === 'true'
    ? <InternalBetaPage />
    : <AuthenticatedBetaPage />;
}

function InternalBetaPage() {
  const [signedIn, setSignedIn] = useState(false);
  const user = { id: 'internal-test-user', name: 'Interne Testperson', email: 'internal-test@localhost' };
  return signedIn
    ? <BetaWorkspace user={user} internal onSignOut={() => setSignedIn(false)} />
    : <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
        <Header />
        <InternalNotice />
        <section className="space-y-4 rounded-xl border p-6">
          <p>Der lokale Test verwendet eine Testanmeldung. Google, Datenbank, Payrexx und OpenAI werden nicht aufgerufen.</p>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" onClick={() => setSignedIn(true)}>Interne Testanmeldung starten</button>
        </section>
      </main>;
}

function AuthenticatedBetaPage() {
  const { data: session, isPending } = auth.useSession();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  if (isPending) return <main className="mx-auto max-w-3xl px-5 py-10"><p>Deine Anmeldung wird geprüft …</p></main>;
  if (!session) return <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <Header />
    <form className="space-y-4 rounded-xl border p-6" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError(''); setNotice('');
      try {
        if (mode === 'reset') {
          const response = await fetch('/api/auth/request-password-reset', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), redirectTo: `${window.location.origin}/` }),
          });
          if (!response.ok) throw new Error('Die Anfrage konnte momentan nicht verarbeitet werden.');
          setNotice('Wenn ein Konto zu dieser Adresse besteht, wird ein Link zum Zurücksetzen gesendet.');
          return;
        }
        const result = mode === 'signup'
          ? await auth.signUp.email({ name: name.trim(), email: email.trim(), password })
          : await auth.signIn.email({ email: email.trim(), password });
        if (result.error) throw new Error(result.error.message || 'Anmeldung fehlgeschlagen.');
        if (mode === 'signup' && process.env.NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED === 'true') {
          setNotice('Bitte bestätige deine E-Mail-Adresse über den Link in deinem Postfach.');
        }
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Anmeldung fehlgeschlagen.'); }
      finally { setBusy(false); }
    }}>
      <p>{mode === 'reset' ? 'Gib deine Konto-E-Mail ein. Wir senden dir einen Link, falls ein Konto besteht.' : 'Erstelle ein Konto oder melde dich mit E-Mail und Passwort an.'}</p>
      {mode === 'signup' && <label className="block space-y-1"><span>Name</span><input required maxLength={100} autoComplete="name" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border p-3 text-slate-900" /></label>}
      <label className="block space-y-1"><span>E-Mail</span><input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border p-3 text-slate-900" /></label>
      {mode !== 'reset' && <label className="block space-y-1"><span>Passwort {mode === 'signup' && '(mindestens 12 Zeichen)'}</span><input required minLength={mode === 'signup' ? 12 : 1} maxLength={128} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-lg border p-3 text-slate-900" /></label>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {notice && <p role="status" className="text-green-800">{notice}</p>}
      <button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Bitte warten …' : mode === 'signup' ? 'Konto erstellen' : mode === 'reset' ? 'Link anfordern' : 'Anmelden'}</button>
      <div className="flex flex-wrap gap-4 text-sm">
        {mode !== 'reset' && <button type="button" className="underline" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setNotice(''); }}>{mode === 'signup' ? 'Ich habe bereits ein Konto' : 'Neues Konto erstellen'}</button>}
        {mode !== 'signup' && process.env.NEXT_PUBLIC_TRANSACTIONAL_EMAIL_ENABLED === 'true' && <button type="button" className="underline" onClick={() => { setMode(mode === 'reset' ? 'signin' : 'reset'); setError(''); setNotice(''); }}>{mode === 'reset' ? 'Zur Anmeldung' : 'Passwort vergessen?'}</button>}
      </div>
    </form>
  </main>;
  return <BetaWorkspace
    user={session.user}
    onSignOut={() => { void auth.signOut(); }}
  />;
}

function Header() {
  return <header><h1 className="text-3xl font-semibold">Motivationsboost</h1><p className="mt-2 text-slate-600">Deine Erfahrung. Deine Worte. Dein nächster Schritt.</p></header>;
}

function InternalNotice() {
  return <aside className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950" role="status">
    <strong>Lokaler interner Testmodus.</strong> Verwende nur erfundene Testdaten. Der Brief wird lokal simuliert; es wird kein Text an OpenAI gesendet. Bewerbungen bleiben in diesem Browser gespeichert und werden nicht an einen Server übertragen.
  </aside>;
}

function BetaWorkspace({ user, onSignOut, internal = false }: { user: BetaUser; onSignOut: () => void; internal?: boolean }) {
  const [values, setValues] = useState<Record<Field, string>>({ cv: '', job: '', motivation: '', example: '', contribution: '' });
  const [letter, setLetter] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  function downloadLetter() {
    const url = URL.createObjectURL(new Blob([letter], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'motivationsschreiben-test.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function generate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(''); setLetter('');
    try {
      const res = await fetch('/api/v2/letter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const data = await res.json() as { error?: string; letter?: string; mode?: string; quota?: { used: number; limit: number } };
      if (!res.ok || !data.letter) throw new Error(data.error || 'Der Entwurf konnte nicht erstellt werden.');
      setLetter(data.letter);
      if (data.mode === 'guided-template') setMessage('Vorlagenentwurf erstellt. Der KI-Dienst ist derzeit nicht verbunden; überarbeite den Entwurf anhand der Stellenanzeige.');
      else if (data.quota) setMessage(`${data.quota.used} von ${data.quota.limit} Aktionen genutzt.${internal ? ' (simuliert)' : ''}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Bitte später erneut versuchen.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <Header />
    {internal && <InternalNotice />}
    <div className="flex flex-wrap items-center justify-between gap-4"><p>Angemeldet als {user.name || user.email}</p><div className="flex flex-wrap gap-4"><a className="underline" href="/api/v2/account/export">Daten exportieren</a><button className="underline" onClick={async () => {
      const emailEnabled = process.env.NEXT_PUBLIC_TRANSACTIONAL_EMAIL_ENABLED === 'true';
      const password = window.prompt(emailEnabled ? 'Zur Bestätigung: Gib dein aktuelles Passwort ein. Danach senden wir dir eine Bestätigungs-E-Mail zur Kontolöschung.' : 'Zur Bestätigung: Gib dein aktuelles Passwort ein. Dein Konto und die zugehörigen Daten werden gelöscht.');
      if (!password) return;
      try {
        const response = await fetch('/api/auth/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, callbackURL: '/' }) });
        if (!response.ok) throw new Error('Die Löschung konnte nicht angefordert werden. Prüfe dein Passwort und versuche es erneut.');
        const result = await response.json() as { message?: string };
        if (result.message === 'User deleted') { window.location.assign('/'); return; }
        setMessage('Bitte bestätige die Kontolöschung über den Link in deinem Postfach.');
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Kontolöschung fehlgeschlagen.'); }
      }}>Konto löschen</button><button className="underline" onClick={onSignOut}>Abmelden</button></div></div>
    <Applications userId={user.id} internal={internal} />
    <form onSubmit={generate} className="space-y-4">
      {fields.map(([id, label]) => <label key={id} className="block space-y-1"><span className="font-medium">{label}</span><textarea required rows={id === 'cv' || id === 'job' ? 6 : 3} value={values[id]} onChange={event => setValues({ ...values, [id]: event.target.value })} className="w-full rounded-lg border border-slate-300 p-3 text-slate-900" /></label>)}
      <button disabled={busy} className="rounded-lg bg-slate-900 px-5 py-3 text-white disabled:opacity-50">{busy ? 'Entwurf wird erstellt …' : 'Motivationsschreiben erstellen'}</button>
    </form>
    {message && <p role="status">{message}</p>}
    {letter && <section className="space-y-3 rounded-xl border p-5"><h2 className="text-xl font-semibold">Dein Entwurf</h2><p className="text-sm text-slate-600">Bitte prüfe alle Angaben und passe den Text an deine Worte an.</p><textarea aria-label="Motivationsschreiben bearbeiten" rows={18} className="w-full rounded-lg border border-slate-300 p-3 text-slate-900" value={letter} onChange={event => setLetter(event.target.value)} /><button type="button" onClick={downloadLetter} className="rounded-lg border px-4 py-2">Als Textdatei herunterladen</button></section>}
    <footer className="flex flex-wrap gap-4 border-t pt-5 text-sm"><a className="underline" href="/datenschutz">Datenschutz</a><a className="underline" href="/agb">Nutzungsbedingungen</a><a className="underline" href="/impressum">Impressum</a></footer>
  </main>;
}
