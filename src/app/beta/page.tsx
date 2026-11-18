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
  if (isPending) return <main className="mx-auto max-w-3xl px-5 py-10"><p>Deine Anmeldung wird geprüft …</p></main>;
  if (!session) return <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <Header />
    <section className="space-y-4 rounded-xl border p-6"><p>Melde dich an, um deinen persönlichen Entwurf zu erstellen.</p><button className="rounded-lg bg-slate-900 px-4 py-2 text-white" onClick={() => void auth.signIn.social({ provider: 'google', callbackURL: '/beta' })}>Mit Google anmelden</button></section>
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
      const data = await res.json() as { error?: string; letter?: string; quota?: { used: number; limit: number } };
      if (!res.ok || !data.letter) throw new Error(data.error || 'Der Entwurf konnte nicht erstellt werden.');
      setLetter(data.letter);
      if (data.quota) setMessage(`${data.quota.used} von ${data.quota.limit} KI-Aktionen genutzt.${internal ? ' (simuliert)' : ''}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Bitte später erneut versuchen.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <Header />
    {internal && <InternalNotice />}
    <div className="flex items-center justify-between gap-4"><p>Angemeldet als {user.name || user.email}</p><button className="underline" onClick={onSignOut}>Abmelden</button></div>
    <Applications userId={user.id} />
    <form onSubmit={generate} className="space-y-4">
      {fields.map(([id, label]) => <label key={id} className="block space-y-1"><span className="font-medium">{label}</span><textarea required rows={id === 'cv' || id === 'job' ? 6 : 3} value={values[id]} onChange={event => setValues({ ...values, [id]: event.target.value })} className="w-full rounded-lg border border-slate-300 p-3 text-slate-900" /></label>)}
      <button disabled={busy} className="rounded-lg bg-slate-900 px-5 py-3 text-white disabled:opacity-50">{busy ? 'Entwurf wird erstellt …' : 'Motivationsschreiben erstellen'}</button>
    </form>
    {message && <p role="status">{message}</p>}
    {letter && <section className="space-y-3 rounded-xl border p-5"><h2 className="text-xl font-semibold">Dein Entwurf</h2><p className="text-sm text-slate-600">Bitte prüfe alle Angaben und passe den Text an deine Worte an.</p><textarea aria-label="Motivationsschreiben bearbeiten" rows={18} className="w-full rounded-lg border border-slate-300 p-3 text-slate-900" value={letter} onChange={event => setLetter(event.target.value)} /><button type="button" onClick={downloadLetter} className="rounded-lg border px-4 py-2">Als Textdatei herunterladen</button></section>}
  </main>;
}
