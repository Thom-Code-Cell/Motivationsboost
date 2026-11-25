'use client';
import { useEffect, useState } from 'react';
import { createAuthClient } from 'better-auth/react';
import { Applications } from './applications';
import { ProductLanguagePicker, useProductLanguage } from '@/components/product-language';
import { authCopy } from '@/lib/product-auth-copy';
import { LocalDocuments } from './local-documents';
import { JobPostingImport } from './job-posting-import';
import { WorkspaceBackup } from './workspace-backup';
import { WeeklyTestCheckout } from './weekly-test-checkout';
import { applicationPrivacyNotices, appendApplicationPrivacyNotice, type PrivacyNoticeLanguage } from '@/lib/application-privacy-notice';
import { readLocalRecord, updateLocalRecord } from '@/lib/local-workspace';
import { guidedLetter, letterDraftInput, prepareExternalDraftInput } from '@/lib/letter-draft';

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
const emptyDraft: Record<Field, string> = { cv: '', job: '', motivation: '', example: '', contribution: '' };

function restoredDraft(stored: unknown) {
  if (!stored || typeof stored !== 'object') return { values: emptyDraft, letter: '' };
  const result = stored as { values?: Partial<Record<Field, unknown>>; letter?: unknown };
  const values = { ...emptyDraft };
  for (const [field] of fields) {
    const value = result.values?.[field];
    if (typeof value === 'string') values[field] = value.slice(0, 12000);
  }
  return { values, letter: typeof result.letter === 'string' ? result.letter.slice(0, 30000) : '' };
}

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
  const locale = useProductLanguage();
  const words = authCopy[locale];
  const { data: session, isPending } = auth.useSession();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  if (isPending) return <main lang={locale} className="mx-auto max-w-3xl px-5 py-10"><p>{words.checking}</p></main>;
  if (!session) return <main lang={locale} className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <Header />
    <form className="space-y-4 rounded-xl border p-6" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError(''); setNotice('');
      try {
        if (mode === 'reset') {
          const response = await fetch('/api/auth/request-password-reset', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), redirectTo: `${window.location.origin}/reset-password` }),
          });
          if (!response.ok) throw new Error(words.resetFailure);
          setNotice(words.resetSent);
          return;
        }
        const result = mode === 'signup'
          ? await auth.signUp.email({ name: name.trim(), email: email.trim(), password })
          : await auth.signIn.email({ email: email.trim(), password });
        if (result.error) throw new Error(words.failure);
        if (mode === 'signup' && process.env.NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED === 'true') {
          setNotice(words.verify);
        }
      } catch (cause) { setError(cause instanceof Error && cause.message === words.resetFailure ? words.resetFailure : words.failure); }
      finally { setBusy(false); }
    }}>
      <p>{mode === 'reset' ? words.resetIntro : words.intro}</p>
      {mode === 'signup' && <label className="block space-y-1"><span>{words.name}</span><input required maxLength={100} autoComplete="name" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border p-3 text-slate-900" /></label>}
      <label className="block space-y-1"><span>{words.email}</span><input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border p-3 text-slate-900" /></label>
      {mode !== 'reset' && <label className="block space-y-1"><span>{words.password} {mode === 'signup' && words.passwordLength}</span><input required minLength={mode === 'signup' ? 12 : 1} maxLength={128} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-lg border p-3 text-slate-900" /></label>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {notice && <p role="status" className="text-green-800">{notice}</p>}
      <button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{busy ? words.busy : mode === 'signup' ? words.create : mode === 'reset' ? words.request : words.signin}</button>
      <div className="flex flex-wrap gap-4 text-sm">
        {mode !== 'reset' && <button type="button" className="underline" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setNotice(''); }}>{mode === 'signup' ? words.existing : words.newAccount}</button>}
        {mode !== 'signup' && process.env.NEXT_PUBLIC_TRANSACTIONAL_EMAIL_ENABLED === 'true' && <button type="button" className="underline" onClick={() => { setMode(mode === 'reset' ? 'signin' : 'reset'); setError(''); setNotice(''); }}>{mode === 'reset' ? words.back : words.forgot}</button>}
      </div>
    </form>
    <footer className="flex flex-wrap gap-4 text-sm"><a className="underline" href="/">{words.home}</a><a className="underline" href="/datenschutz">{words.privacy}</a><a className="underline" href="/agb">{words.terms}</a><a className="underline" href="/impressum">{words.legal}</a></footer>
  </main>;
  return <BetaWorkspace key={session.user.id}
    user={session.user}
    onSignOut={() => { void auth.signOut(); }}
  />;
}

function Header() {
  const locale = useProductLanguage();
  return <header lang={locale} className="flex flex-wrap items-start justify-between gap-3">
    <div><h1 className="text-3xl font-semibold">Motivationsboost</h1><p className="mt-2 text-slate-600">{authCopy[locale].tagline}</p></div>
    <ProductLanguagePicker />
  </header>;
}

function InternalNotice() {
  return <aside className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950" role="status">
    <strong>Lokaler interner Testmodus.</strong> Verwende nur erfundene Testdaten. Der Brief wird lokal simuliert; es wird kein Text an OpenAI gesendet. Bewerbungen bleiben in diesem Browser gespeichert und werden nicht an einen Server übertragen.
  </aside>;
}

function BetaWorkspace({ user, onSignOut, internal = false }: { user: BetaUser; onSignOut: () => void; internal?: boolean }) {
  const draftKey = `letter:${user.id}`;
  const [values, setValues] = useState(emptyDraft);
  const [letter, setLetter] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [allowExternalProcessing, setAllowExternalProcessing] = useState(false);
  const [includePrivacyNotice, setIncludePrivacyNotice] = useState(false);
  const [noticeLanguage, setNoticeLanguage] = useState<PrivacyNoticeLanguage>('de');
  const finalLetter = appendApplicationPrivacyNotice(letter, includePrivacyNotice, noticeLanguage);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void readLocalRecord(draftKey).then(stored => {
      if (!active) return;
      const draft = restoredDraft(stored);
      setValues(draft.values);
      setLetter(draft.letter);
      setDraftReady(true);
    }, () => {
      if (active) setDraftError('Die lokale Zwischenspeicherung ist nicht verfügbar. Sichere wichtige Texte als Datei.');
    });
    return () => { active = false; };
  }, [draftKey]);

  useEffect(() => {
    if (!draftReady) return;
    let active = true;
    void updateLocalRecord(draftKey, () => ({ values, letter })).catch(() => {
      if (active) setDraftError('Der Entwurf konnte in diesem Browser nicht gesichert werden.');
    });
    return () => { active = false; };
  }, [draftKey, draftReady, letter, values]);
  async function downloadLetter(format: 'txt' | 'pdf' | 'docx') {
    setExportError('');
    setExporting(true);
    try {
      let blob: Blob;
      if (format === 'pdf') {
        const text = finalLetter.normalize('NFC').replaceAll('\t', '    ');
        if (/[^\r\n\x20-\x7e\u00a0-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u2013-\u2014\u2018-\u201a\u201c-\u201e\u2022\u2026\u2039\u203a\u20ac]/u.test(text)) {
          setExportError('Die PDF-Schrift unterstützt einzelne Zeichen deines Textes nicht. Wähle Word oder Text, damit alle Zeichen erhalten bleiben.');
          return;
        }
        const { createTextPdf } = await import('@/lib/export-documents');
        blob = createTextPdf(text).output('blob');
      } else if (format === 'docx') {
        const { Document, Packer, Paragraph } = await import('docx');
        const paragraphs = finalLetter.split(/\r?\n/).map(text => new Paragraph(text));
        blob = await Packer.toBlob(new Document({ sections: [{ children: paragraphs }] }));
      } else {
        blob = new Blob([finalLetter], { type: 'text/plain;charset=utf-8' });
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'motivationsschreiben.' + format;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError('Die Datei konnte nicht erstellt werden. Bitte versuche es erneut.');
    } finally {
      setExporting(false);
    }
  }
  async function generate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const validated = letterDraftInput.safeParse(values);
      if (!validated.success) throw new Error('Bitte Lebenslauf, Stellenanzeige und persönliche Angaben vollständig ausfüllen.');
      if (!internal && !allowExternalProcessing) {
        setLetter(guidedLetter(validated.data));
        setMessage('Vorlagenentwurf erstellt. Deine Eingaben wurden in diesem Schritt nur in deinem Browser verarbeitet.');
        return;
      }
      const requestInput = internal ? validated.data : prepareExternalDraftInput(validated.data);
      const res = await fetch('/api/v2/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ ...requestInput, allowExternalProcessing }),
      });
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
        const response = await fetch('/api/auth/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, callbackURL: '/app' }) });
        if (!response.ok) throw new Error('Die Löschung konnte nicht angefordert werden. Prüfe dein Passwort und versuche es erneut.');
        const result = await response.json() as { message?: string };
        if (result.message === 'User deleted') { window.location.assign('/app'); return; }
        setMessage('Bitte bestätige die Kontolöschung über den Link in deinem Postfach.');
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Kontolöschung fehlgeschlagen.'); }
      }}>Konto löschen</button><button className="underline" onClick={onSignOut}>Abmelden</button></div></div>
    {!internal && <WeeklyTestCheckout />}
    <Applications userId={user.id} internal={internal} />
    <LocalDocuments userId={user.id} onUseText={text => {
      const next = [values.cv.trim(), text.trim()].filter(Boolean).join('\n\n');
      if (next.length > 12000) {
        setMessage('Der Text ist zu lang für den Entwurf. Kürze ihn zuerst in der Texterkennung.');
        return;
      }
      setValues(current => ({ ...current, cv: next }));
      setMessage('Der geprüfte Text wurde in die Erfahrungen für den Entwurf übernommen.');
    }} />
    <form onSubmit={generate} className="space-y-4">
      <p className="text-sm">Deine Eingaben und dein Entwurf werden in diesem Browser zwischengespeichert.</p>
      {draftError && <p role="alert">{draftError}</p>}
      {fields.map(([id, label]) => <div key={id} className="space-y-3">
        {id === 'job' && !internal && <JobPostingImport hasText={Boolean(values.job.trim())} onImport={job => setValues(current => ({ ...current, job }))} />}
        <label className="block space-y-1"><span className="font-medium">{label}</span><textarea required maxLength={id === 'cv' || id === 'job' ? 12000 : id === 'example' ? 2000 : 1500} rows={id === 'cv' || id === 'job' ? 6 : 3} value={values[id]} onChange={event => setValues({ ...values, [id]: event.target.value })} className="w-full rounded-lg border border-slate-300 p-3 text-slate-900" /></label>
      </div>)}
      {!internal && <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={allowExternalProcessing} onChange={event => setAllowExternalProcessing(event.target.checked)} /><span>Meine Eingaben für diesen Entwurf an OpenAI senden, sofern der Dienst freigeschaltet ist. Entferne vorab Namen, Kontaktdaten und weitere Angaben, die für den Entwurf nicht erforderlich sind.</span></label>}
      <button disabled={busy} className="rounded-lg bg-slate-900 px-5 py-3 text-white disabled:opacity-50">{busy ? 'Entwurf wird erstellt …' : 'Motivationsschreiben erstellen'}</button>
      <button type="button" className="ml-3 underline" onClick={() => {
        if (window.confirm('Eingaben und Briefentwurf in diesem Browser löschen?')) {
          setValues(emptyDraft);
          setLetter('');
        }
      }}>Lokalen Entwurf löschen</button>
    </form>
    {message && <p role="status">{message}</p>}
    <section className="space-y-3 rounded-xl border p-5">
      <h2 className="text-xl font-semibold">Datenschutzhinweis für deine Bewerbung</h2>
      <p className="text-sm text-slate-600">Entscheide freiwillig, ob du einer KI-Auswertung durch den Empfänger widersprechen und eine persönliche Beurteilung verlangen möchtest. Die KI-Hilfe in Motivationsboost ist davon getrennt.</p>
      <label className="block space-y-1"><span>Sprache des Datenschutzhinweises</span><select className="w-full rounded-lg border p-2" value={noticeLanguage} onChange={event => setNoticeLanguage(event.target.value as PrivacyNoticeLanguage)}><option value="de">Deutsch</option><option value="en">English</option><option value="fr">Français</option><option value="it">Italiano</option></select></label>
      <textarea aria-label="Datenschutzhinweis zum Kopieren" className="w-full rounded-lg border p-3 text-sm text-slate-900" rows={5} readOnly value={applicationPrivacyNotices[noticeLanguage]} />
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={includePrivacyNotice} onChange={event => setIncludePrivacyNotice(event.target.checked)} /><span>Datenschutzhinweis beim Herunterladen meines Motivationsschreibens anhängen</span></label>
      <p className="text-xs text-slate-600">Du kannst den Hinweis auch in deinen Lebenslauf kopieren. Er verhindert eine KI-Verarbeitung nicht technisch und garantiert keine menschliche Prüfung. Deine Auswahl bleibt in dieser Ansicht und wird nicht an den KI-Dienst gesendet.</p>
    </section>
    {letter && <section className="space-y-3 rounded-xl border p-5"><h2 className="text-xl font-semibold">Dein Entwurf</h2><p className="text-sm text-slate-600">Bitte prüfe alle Angaben und passe den Text an deine Worte an.</p><textarea aria-label="Motivationsschreiben bearbeiten" rows={18} className="w-full rounded-lg border border-slate-300 p-3 text-slate-900" value={letter} onChange={event => setLetter(event.target.value)} />{includePrivacyNotice && <div className="space-y-1"><p className="text-sm font-medium">Vorschau des angehängten Hinweises</p><p className="whitespace-pre-wrap text-sm">{applicationPrivacyNotices[noticeLanguage]}</p></div>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={exporting} onClick={() => void downloadLetter('txt')} className="rounded-lg border px-4 py-2">Als Textdatei herunterladen</button>
        <button type="button" disabled={exporting} onClick={() => void downloadLetter('pdf')} className="rounded-lg border px-4 py-2">Als PDF herunterladen</button>
        <button type="button" disabled={exporting} onClick={() => void downloadLetter('docx')} className="rounded-lg border px-4 py-2">Als Word-Datei herunterladen</button>
      </div>
      {exportError && <p role="alert">{exportError}</p>}
</section>}
    <WorkspaceBackup userId={user.id} />
    <footer className="flex flex-wrap gap-4 border-t pt-5 text-sm"><a className="underline" href="/about">Über Motivationsboost</a><a className="underline" href="/datenschutz">Datenschutz</a><a className="underline" href="/agb">Nutzungsbedingungen</a><a className="underline" href="/impressum">Impressum</a></footer>
  </main>;
}
