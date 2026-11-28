'use client';
import { useEffect, useState } from 'react';
import { createAuthClient } from 'better-auth/react';
import { Applications } from './applications';
import { ProductLanguagePicker, useProductLanguage } from '@/components/product-language';
import { authCopy } from '@/lib/product-auth-copy';
import { legalCopy } from '@/lib/legal-translations';
import { productDraftCopy } from '@/lib/product-draft-copy';
import { productLanguageHeader } from '@/lib/product-locale';
import { LocalDocuments } from './local-documents';
import { JobPostingImport } from './job-posting-import';
import { WorkspaceBackup } from './workspace-backup';
import { WeeklyTestCheckout } from './weekly-test-checkout';
import { SubscriptionCheckout } from './subscription-checkout';
import { applicationPrivacyNotices, appendApplicationPrivacyNotice, type PrivacyNoticeLanguage } from '@/lib/application-privacy-notice';
import { readLocalRecord, updateLocalRecord } from '@/lib/local-workspace';
import { guidedLetter, letterDraftInput, prepareExternalDraftInput } from '@/lib/letter-draft';
import { evidenceItem, evidenceKinds, type EvidenceItem } from '@/lib/letter-evidence';
import { letterCredits } from '@/lib/plans';

const auth = createAuthClient();
const fields = ['cv', 'job', 'motivation', 'example', 'contribution'] as const;
type Field = typeof fields[number];
type BetaUser = { id: string; name?: string | null; email?: string | null };
type CreditQuote = { available: boolean; cost: number; balance: number | null };
const creditCopy = {
  de: { cost: 'KI-Belegauswahl für', balance: 'Verfügbare Credits', unavailable: 'KI-Belegauswahl derzeit nicht verfügbar.', low: 'Dein Guthaben reicht für diese KI-Aktion nicht aus.', consent: 'Ich erlaube die Übermittlung meiner aufbereiteten Eingaben an OpenAI. Entferne zuvor unnötige personenbezogene Angaben.', action: 'KI-Belegauswahl starten', noTopUp: 'Deine lokalen Unterlagen bleiben zugänglich. Es werden keine Credits automatisch nachgekauft.' },
  en: { cost: 'AI evidence selection for', balance: 'Available credits', unavailable: 'AI evidence selection is currently unavailable.', low: 'Your balance is too low for this AI action.', consent: 'I allow my prepared inputs to be sent to OpenAI. Remove personal details that are unnecessary for the draft.', action: 'Start AI evidence selection', noTopUp: 'Your local documents remain accessible. Credits are never purchased automatically.' },
  fr: { cost: 'Sélection des éléments probants par IA pour', balance: 'Crédits disponibles', unavailable: 'La sélection par IA est indisponible pour le moment.', low: 'Votre solde est insuffisant pour cette action IA.', consent: 'J’autorise l’envoi de mes données préparées à OpenAI. Retirez les données personnelles inutiles au brouillon.', action: 'Lancer la sélection par IA', noTopUp: 'Vos documents locaux restent accessibles. Aucun crédit supplémentaire n’est acheté automatiquement.' },
  it: { cost: 'Selezione delle evidenze tramite IA per', balance: 'Crediti disponibili', unavailable: 'La selezione tramite IA non è al momento disponibile.', low: 'Il saldo è insufficiente per questa azione IA.', consent: 'Autorizzo l’invio a OpenAI dei dati preparati. Rimuovi i dati personali non necessari alla bozza.', action: 'Avvia la selezione tramite IA', noTopUp: 'I documenti locali rimangono accessibili. Non vengono acquistati crediti automaticamente.' },
} as const;
const emptyDraft: Record<Field, string> = { cv: '', job: '', motivation: '', example: '', contribution: '' };

function restoredDraft(stored: unknown) {
  if (!stored || typeof stored !== 'object') return { values: emptyDraft, letter: '', evidence: [] as EvidenceItem[] };
  const result = stored as { values?: Partial<Record<Field, unknown>>; letter?: unknown; evidence?: unknown };
  const values = { ...emptyDraft };
  const evidence = Array.isArray(result.evidence) ? result.evidence.slice(0, 12).flatMap((item: unknown) => {
    if (!item || typeof item !== 'object' || !('kind' in item) || !('text' in item) || typeof item.text !== 'string') return [];
    const kind = evidenceItem.shape.kind.safeParse(item.kind);
    return kind.success ? [{ kind: kind.data, text: item.text.slice(0, 1200) }] : [];
  }) : [];
  for (const field of fields) {
    const value = result.values?.[field];
    if (typeof value === 'string') values[field] = value.slice(0, 12000);
  }
  return { values, letter: typeof result.letter === 'string' ? result.letter.slice(0, 30000) : '', evidence };
}

export function ApplicationWorkspace({ android = false, deletionRequested = false }: { android?: boolean; deletionRequested?: boolean } = {}) {
  return process.env.NEXT_PUBLIC_INTERNAL_TEST_MODE === 'true'
    ? <InternalBetaPage android={android} />
    : <AuthenticatedBetaPage android={android} deletionRequested={deletionRequested} />;
}

function InternalBetaPage({ android }: { android: boolean }) {
  const [signedIn, setSignedIn] = useState(false);
  const user = { id: 'internal-test-user', name: 'Interne Testperson', email: 'internal-test@localhost' };
  return signedIn
    ? <BetaWorkspace user={user} android={android} internal onSignOut={() => setSignedIn(false)} />
    : <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
        <Header />
        <InternalNotice />
        <section className="space-y-4 rounded-xl border p-6">
          <p>Der lokale Test verwendet eine Testanmeldung. Google, Datenbank, Payrexx und OpenAI werden nicht aufgerufen.</p>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" onClick={() => setSignedIn(true)}>Interne Testanmeldung starten</button>
        </section>
      </main>;
}

function AuthenticatedBetaPage({ android, deletionRequested }: { android: boolean; deletionRequested: boolean }) {
  const workspacePath = android ? '/android' : '/app';
  const legalRoot = android ? '/android' : '';
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
            method: 'POST', headers: { 'Content-Type': 'application/json', [productLanguageHeader]: locale },
            body: JSON.stringify({ email: email.trim(), redirectTo: `${window.location.origin}${legalRoot}/reset-password?lang=${locale}` }),
          });
          if (!response.ok) throw new Error(words.resetFailure);
          setNotice(words.resetSent);
          return;
        }
        const fetchOptions = { headers: { [productLanguageHeader]: locale } };
        const result = mode === 'signup'
          ? await auth.signUp.email({ name: name.trim(), email: email.trim(), password, ...(android ? { callbackURL: workspacePath } : {}) }, fetchOptions)
          : await auth.signIn.email({ email: email.trim(), password }, fetchOptions);
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
    <footer className="flex flex-wrap gap-4 text-sm">{!android && <a className="underline" href="/">{words.home}</a>}<a className="underline" href={legalRoot + '/datenschutz'}>{words.privacy}</a><a className="underline" href={legalRoot + '/agb'}>{words.terms}</a><a className="underline" href={legalRoot + '/impressum'}>{words.legal}</a></footer>
  </main>;
  return <BetaWorkspace key={session.user.id}
    user={session.user}
    android={android}
    deletionRequested={deletionRequested}
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

const evidenceLabels = {
  de: ['Belegte Qualifikation', 'Berufserfahrung', 'Bestätigte Fähigkeit', 'Übertragbare Kompetenz', 'Entwicklungsziel', 'Künftige Tätigkeit', 'Unbelegte Angabe'],
  en: ['Documented qualification', 'Work experience', 'Confirmed skill', 'Transferable skill', 'Development goal', 'Future work', 'Unverified information'],
  fr: ['Qualification documentée', 'Expérience professionnelle', 'Compétence confirmée', 'Compétence transférable', 'Objectif de développement', 'Activité future', 'Information non vérifiée'],
  it: ['Qualifica documentata', 'Esperienza professionale', 'Competenza confermata', 'Competenza trasferibile', 'Obiettivo di sviluppo', 'Attività futura', 'Informazione non verificata'],
} as const;
const evidenceCopy = {
  de: ['Belege und Ziele ergänzen', 'Ordne jede Angabe selbst ein. Verwende für belegte Angaben den überprüften Wortlaut aus deinem Dokument.', 'Kategorie', 'Wortlaut', 'Entfernen', 'Angabe hinzufügen'],
  en: ['Add evidence and goals', 'Classify each entry yourself. For documented claims, use the wording you checked in your source document.', 'Category', 'Source wording', 'Remove', 'Add entry'],
  fr: ['Ajouter des preuves et des objectifs', 'Classez chaque élément. Pour un fait documenté, saisissez le texte vérifié dans la pièce originale.', 'Catégorie', 'Texte source', 'Supprimer', 'Ajouter un élément'],
  it: ['Aggiungi prove e obiettivi', 'Classifica ogni voce. Per un fatto documentato, usa il testo verificato nel documento originale.', 'Categoria', 'Testo originale', 'Rimuovi', 'Aggiungi una voce'],
} as const;

function LetterEvidenceFields({ evidence, onChange }: { evidence: EvidenceItem[]; onChange: (items: EvidenceItem[]) => void }) {
  const locale = useProductLanguage();
  const [title, hint, categoryLabel, textLabel, removeLabel, addLabel] = evidenceCopy[locale];
  function update(index: number, item: EvidenceItem) {
    onChange(evidence.map((current, position) => position === index ? item : current));
  }
  return <details className="space-y-3 rounded-lg border p-3" lang={locale}>
    <summary className="cursor-pointer font-medium">{title}</summary>
    <p className="text-sm">{hint}</p>
    {evidence.map((item, index) => <fieldset className="space-y-2 rounded border p-3" key={index}>
      <label className="block text-sm">{categoryLabel}
        <select className="ml-2 rounded border bg-white p-1 text-slate-900" value={item.kind} onChange={event => {
          const parsed = evidenceItem.shape.kind.safeParse(event.target.value);
          if (parsed.success) update(index, { ...item, kind: parsed.data });
        }}>
          {evidenceKinds.map((kind, position) => <option key={kind} value={kind}>{evidenceLabels[locale][position]}</option>)}
        </select>
      </label>
      <label className="block text-sm">{textLabel}
        <textarea className="block w-full rounded border p-2 text-slate-900" value={item.text} minLength={8} maxLength={1200} onChange={event => update(index, { ...item, text: event.target.value })} />
      </label>
      <button type="button" className="underline" onClick={() => onChange(evidence.filter((_, position) => position !== index))}>{removeLabel}</button>
    </fieldset>)}
    {evidence.length < 12 && <button type="button" className="underline" onClick={() => onChange([...evidence, { kind: 'unverified', text: '' }])}>{addLabel}</button>}
  </details>;
}

function BetaWorkspace({ user, onSignOut, internal = false, android = false, deletionRequested = false }: {
  user: BetaUser;
  onSignOut: () => void;
  internal?: boolean;
  android?: boolean;
  deletionRequested?: boolean;
}) {
  const workspacePath = android ? '/android' : '/app';
  const legalRoot = android ? '/android' : '';
  const draftKey = `letter:${user.id}`;
  const [values, setValues] = useState(emptyDraft);
  const language = useProductLanguage();
  const copy = productDraftCopy[language];
  const legalLabels = legalCopy[language];
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [letter, setLetter] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [draftError, setDraftError] = useState<'loadFailed' | 'saveFailed'>();
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [allowExternalProcessing, setAllowExternalProcessing] = useState(false);
  const [quote, setQuote] = useState<CreditQuote | null>(null);
  const [quoteVersion, setQuoteVersion] = useState(0);
  const creditText = creditCopy[language];
  const creditReady = Boolean(quote?.available && quote.cost === letterCredits && (quote.balance ?? 0) >= letterCredits);
  const [includePrivacyNotice, setIncludePrivacyNotice] = useState(false);
  const [noticeOverride, setNoticeLanguage] = useState<PrivacyNoticeLanguage>();
  const noticeLanguage = noticeOverride ?? language;
  const finalLetter = appendApplicationPrivacyNotice(letter, includePrivacyNotice, noticeLanguage);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(deletionRequested);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleteCopy = authCopy[language];
  const emailDeletionEnabled = process.env.NEXT_PUBLIC_TRANSACTIONAL_EMAIL_ENABLED === 'true';

  useEffect(() => {
    if (internal) return;
    const controller = new AbortController();
    void fetch('/api/v2/letter', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Credit quote unavailable');
        return await response.json() as CreditQuote;
      })
      .then(data => { if (!controller.signal.aborted) setQuote(data); })
      .catch(() => { if (!controller.signal.aborted) setQuote(null); });
    return () => controller.abort();
  }, [internal, quoteVersion, user.id]);

  useEffect(() => {
    let active = true;
    void readLocalRecord(draftKey).then(stored => {
      if (!active) return;
      const draft = restoredDraft(stored);
      setValues(draft.values);
      setEvidence(draft.evidence);
      setLetter(draft.letter);
      setDraftReady(true);
    }, () => {
      if (active) setDraftError('loadFailed');
    });
    return () => { active = false; };
  }, [draftKey]);

  useEffect(() => {
    if (!draftReady) return;
    let active = true;
    void updateLocalRecord(draftKey, () => ({ values, letter, evidence })).catch(() => {
      if (active) setDraftError('saveFailed');
    });
    return () => { active = false; };
  }, [draftKey, draftReady, evidence, letter, values]);
  async function downloadLetter(format: 'txt' | 'pdf' | 'docx') {
    setExportError('');
    setExporting(true);
    try {
      let blob: Blob;
      if (format === 'pdf') {
        const text = finalLetter.normalize('NFC').replaceAll('\t', '    ');
        if (/[^\r\n\x20-\x7e\u00a0-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u2013-\u2014\u2018-\u201a\u201c-\u201e\u2022\u2026\u2039\u203a\u20ac]/u.test(text)) {
          setExportError(copy.unsupportedPdf);
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
      setExportError(copy.downloadFailed);
    } finally {
      setExporting(false);
    }
  }
  async function generate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const validated = letterDraftInput.safeParse({ ...values, language, evidence: evidence.filter(item => item.text.trim()) });
      if (!validated.success) throw new Error(copy.incomplete);
      if (!internal && !allowExternalProcessing) {
        setLetter(guidedLetter(validated.data));
        setMessage(copy.localDone);
        return;
      }
      if (!internal && !creditReady) throw new Error(creditText.low);
      const requestInput = internal ? validated.data : prepareExternalDraftInput(validated.data);
      const res = await fetch('/api/v2/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ ...requestInput, allowExternalProcessing, ...(internal ? {} : { confirmedCreditCost: letterCredits }) }),
      });
      const data = await res.json() as { error?: string; code?: string; letter?: string; mode?: string; quota?: { used: number; limit: number } };
      if (!res.ok || !data.letter) throw new Error(data.code === 'insufficient_credits' ? creditText.low : (language === 'de' ? data.error : undefined) || copy.generateFailed);
      setLetter(data.letter);
      if (data.mode === 'guided-template') setMessage(copy.templateDone);
      else if (data.mode === 'evidence-template') setMessage(copy.evidenceFallback);
      else if (data.quota) setMessage(`${data.quota.used} von ${data.quota.limit} Aktionen genutzt.${internal ? ' (simuliert)' : ''}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : copy.generateFailed); }
    finally {
      if (!internal && allowExternalProcessing) {
        setAllowExternalProcessing(false);
        setQuote(null);
        setQuoteVersion(version => version + 1);
      }
      setBusy(false);
    }
  }
  return <main lang={language} className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <Header />
    {internal && <InternalNotice />}
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p>{copy.signedIn} {user.name || user.email}</p>
      <div className="flex flex-wrap gap-4">
        <a className="underline" href="/api/v2/account/export">{copy.exportAccount}</a>
        <button type="button" className="underline" aria-expanded={deletingAccount} onClick={() => setDeletingAccount(value => !value)}>{deleteCopy.deleteAccount}</button>
        <button className="underline" onClick={onSignOut}>{copy.signOut}</button>
      </div>
    </div>
    {deletingAccount && <form className="space-y-3 rounded-xl border p-5" onSubmit={async event => {
      event.preventDefault();
      if (deleteBusy) return;
      const input = event.currentTarget;
      const password = new FormData(input).get('password');
      if (typeof password !== 'string' || !password) return;
      setDeleteBusy(true);
      try {
        const response = await fetch('/api/auth/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json', [productLanguageHeader]: language }, body: JSON.stringify({ password, callbackURL: workspacePath }) });
        if (!response.ok) throw new Error(deleteCopy.deleteFailed);
        const result = await response.json() as { message?: string };
        if (result.message === 'User deleted') { window.location.assign(workspacePath); return; }
        setDeletingAccount(false);
        setMessage(deleteCopy.deleteSent);
      } catch { setMessage(deleteCopy.deleteFailed); }
      finally { input.reset(); setDeleteBusy(false); }
    }}>
      <p>{emailDeletionEnabled ? deleteCopy.deleteEmailInfo : deleteCopy.deleteDirectInfo}</p>
      <label className="block space-y-1">
        <span>{deleteCopy.password}</span>
        <input className="block w-full rounded-lg border p-3 text-slate-900" type="password" name="password" autoComplete="current-password" required maxLength={128} />
      </label>
      <div className="flex flex-wrap gap-4">
        <button disabled={deleteBusy} className="rounded-lg border px-4 py-2">{emailDeletionEnabled ? deleteCopy.deleteRequest : deleteCopy.deleteAccount}</button>
        <button type="button" disabled={deleteBusy} className="underline" onClick={() => setDeletingAccount(false)}>{deleteCopy.deleteCancel}</button>
      </div>
    </form>}
    {!internal && !android && <><WeeklyTestCheckout /><SubscriptionCheckout /></>}
    <Applications userId={user.id} internal={internal} />
    <LocalDocuments userId={user.id} onUseText={text => {
      const next = [values.cv.trim(), text.trim()].filter(Boolean).join('\n\n');
      if (next.length > 12000) {
        setMessage(copy.textTooLong);
        return;
      }
      setValues(current => ({ ...current, cv: next }));
      setMessage(copy.textCopied);
    }} />
    <form onSubmit={generate} className="space-y-4">
      <p className="text-sm">{copy.saveNotice}</p>
      {draftError && <p role="alert">{copy[draftError]}</p>}
      {fields.map(id => <div key={id} className="space-y-3">
        {id === 'job' && !internal && <JobPostingImport hasText={Boolean(values.job.trim())} onImport={job => setValues(current => ({ ...current, job }))} />}
        <label className="block space-y-1"><span className="font-medium">{copy[id]}</span><textarea required maxLength={id === 'cv' || id === 'job' ? 12000 : id === 'example' ? 2000 : 1500} rows={id === 'cv' || id === 'job' ? 6 : 3} value={values[id]} onChange={event => setValues({ ...values, [id]: event.target.value })} className="w-full rounded-lg border border-slate-300 p-3 text-slate-900" /></label>
      </div>)}
      <LetterEvidenceFields evidence={evidence} onChange={setEvidence} />
      {!internal && <div className="space-y-2 rounded border p-3 text-sm">
        <p><strong>{creditText.cost} {letterCredits} Credits.</strong> {creditText.balance} {quote?.balance ?? '–'}.</p>
        <p>{creditText.noTopUp}</p>
        {!creditReady && <p>{quote?.available ? creditText.low : creditText.unavailable}</p>}
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1" disabled={busy || !creditReady} checked={allowExternalProcessing} onChange={event => setAllowExternalProcessing(event.target.checked)} />
          <span>{creditText.consent}</span>
        </label>
      </div>}
      <button disabled={busy || (allowExternalProcessing && !creditReady)} className="rounded-lg bg-slate-900 px-5 py-3 text-white disabled:opacity-50">{busy ? copy.creating : allowExternalProcessing ? `${creditText.action} · ${letterCredits} Credits` : copy.create}</button>
      <button type="button" className="ml-3 underline" onClick={() => {
        if (window.confirm(copy.confirmDelete)) {
          setValues(emptyDraft);
          setEvidence([]);
          setLetter('');
        }
      }}>{copy.deleteDraft}</button>
    </form>
    {message && <p role="status">{message}</p>}
    <section className="space-y-3 rounded-xl border p-5">
      <h2 className="text-xl font-semibold">{copy.privacy}</h2>
      <p className="text-sm text-slate-600">{copy.privacyIntro}</p>
      <div className="space-y-1">
        <label htmlFor="application-privacy-language" className="block">{copy.privacyLanguage}</label>
        <select id="application-privacy-language" className="w-full rounded-lg border p-2" value={noticeLanguage} onChange={event => setNoticeLanguage(event.target.value as PrivacyNoticeLanguage)}>
          <option value="de">Deutsch</option><option value="en">English</option><option value="fr">Français</option><option value="it">Italiano</option>
        </select>
      </div>
      <textarea aria-label={copy.privacyCopy} lang={noticeLanguage} className="w-full rounded-lg border p-3 text-sm text-slate-900" rows={5} readOnly value={applicationPrivacyNotices[noticeLanguage]} />
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={includePrivacyNotice} onChange={event => setIncludePrivacyNotice(event.target.checked)} /><span>{copy.privacyAttach}</span></label>
      <p className="text-xs text-slate-600">{copy.privacyLimits}</p>
    </section>
    {letter && <section className="space-y-3 rounded-xl border p-5"><h2 className="text-xl font-semibold">{copy.draft}</h2><p className="text-sm text-slate-600">{copy.editIntro}</p><textarea aria-label={copy.edit} rows={18} className="w-full rounded-lg border border-slate-300 p-3 text-slate-900" value={letter} onChange={event => setLetter(event.target.value)} />{includePrivacyNotice && <div className="space-y-1"><p className="text-sm font-medium">{copy.previewNotice}</p><p lang={noticeLanguage} className="whitespace-pre-wrap text-sm">{applicationPrivacyNotices[noticeLanguage]}</p></div>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={exporting} onClick={() => void downloadLetter('txt')} className="rounded-lg border px-4 py-2">{copy.downloadText}</button>
        <button type="button" disabled={exporting} onClick={() => void downloadLetter('pdf')} className="rounded-lg border px-4 py-2">{copy.downloadPdf}</button>
        <button type="button" disabled={exporting} onClick={() => void downloadLetter('docx')} className="rounded-lg border px-4 py-2">{copy.downloadWord}</button>
      </div>
      {exportError && <p role="alert">{exportError}</p>}
</section>}
    <WorkspaceBackup userId={user.id} />
    <footer className="flex flex-wrap gap-4 border-t pt-5 text-sm">{!android && <a className="underline" href="/about">{copy.about}</a>}<a className="underline" href={legalRoot + '/datenschutz'}>{deleteCopy.privacy}</a><a className="underline" href={legalRoot + '/agb'}>{legalLabels.agb}</a><a className="underline" href={legalRoot + '/impressum'}>{legalLabels.impressum}</a></footer>
  </main>;
}
