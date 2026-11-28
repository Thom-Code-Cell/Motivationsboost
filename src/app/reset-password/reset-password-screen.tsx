'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useProductLanguage } from '@/components/product-language';
import { productFormCopy } from '@/lib/product-form-copy';
import { isProductLocale } from '@/lib/product-locale';

function ResetPasswordForm({ workspacePath }: { workspacePath: '/app' | '/android' }) {
  const params = useSearchParams();
  const token = params.get('token');
  const interfaceLanguage = useProductLanguage();
  const linkLanguage = params.get('lang') ?? '';
  const locale = isProductLocale(linkLanguage) ? linkLanguage : interfaceLanguage;
  const copy = productFormCopy[locale].reset;
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<'expired' | 'saved' | 'failed'>();
  const [busy, setBusy] = useState(false);

  return <main lang={locale} className="mx-auto max-w-lg space-y-5 px-5 py-12">
    <h1 className="text-3xl font-semibold">{copy.heading}</h1>
    {!token ? <p role="alert">{copy.invalid}</p> : <>
      <p>{copy.intro}</p>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault(); setBusy(true); setMessage(undefined);
        try {
          const response = await fetch('/api/auth/reset-password', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword: password }),
          });
          if (!response.ok) { setMessage('expired'); return; }
          setPassword('');
          setMessage('saved');
          setTimeout(() => router.replace(workspacePath), 800);
        } catch { setMessage('failed'); }
        finally { setBusy(false); }
      }}>
        <label className="block space-y-1"><span>{copy.password}</span><input autoComplete="new-password" type="password" required minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-lg border p-3 text-slate-900" /></label>
        <button disabled={busy || message === 'saved'} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{busy ? copy.saving : copy.save}</button>
      </form>
      {message && <p role={message === 'saved' ? 'status' : 'alert'}>{copy[message]}</p>}
    </>}
    <a href={workspacePath} className="underline">{copy.signIn}</a>
  </main>;
}

export function ResetPasswordScreen({ workspacePath }: { workspacePath: '/app' | '/android' }) {
  const locale = useProductLanguage();
  return <Suspense fallback={<main lang={locale} className="p-8">{productFormCopy[locale].reset.loading}</main>}><ResetPasswordForm workspacePath={workspacePath} /></Suspense>;
}
