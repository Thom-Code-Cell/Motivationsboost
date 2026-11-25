'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { isProductLocale, preferredProductLocale, productLocales, type ProductLocale } from '@/lib/product-locale';

const storedKey = 'motivationsboost.interface-language';
const names = { de: 'Deutsch', en: 'English', fr: 'Français', it: 'Italiano' };
const labels = { de: 'Sprache', en: 'Language', fr: 'Langue', it: 'Lingua' };
const automatic = { de: 'Gerätesprache', en: 'Device language', fr: 'Langue de l’appareil', it: 'Lingua del dispositivo' };
type Settings = { locale: ProductLocale; override: ProductLocale | ''; setOverride: (value: ProductLocale | '') => void };
const LocaleContext = createContext<Settings>({ locale: 'de', override: '', setOverride: () => {} });

export function ProductLanguageProvider({ children }: { children: ReactNode }) {
  const [system, setSystem] = useState<ProductLocale>('de');
  const [override, setOverride] = useState<ProductLocale | ''>('');
  useEffect(() => {
    const update = () => setSystem(preferredProductLocale(navigator.languages?.length ? navigator.languages : [navigator.language]));
    update();
    try {
      const stored = localStorage.getItem(storedKey) ?? '';
      if (isProductLocale(stored)) setOverride(stored);
    } catch { /* Automatic selection remains available without local storage. */ }
    window.addEventListener('languagechange', update);
    return () => window.removeEventListener('languagechange', update);
  }, []);
  return <LocaleContext.Provider value={{ locale: override || system, override, setOverride(value) {
    setOverride(value);
    try {
      if (value) localStorage.setItem(storedKey, value);
      else localStorage.removeItem(storedKey);
    } catch { /* Keep the choice for this session. */ }
  } }}>{children}</LocaleContext.Provider>;
}

export function useProductLanguage() {
  return useContext(LocaleContext).locale;
}

export function ProductLanguagePicker() {
  const { locale, override, setOverride } = useContext(LocaleContext);
  return <label className="inline-flex items-center gap-2 text-sm" lang={locale}>
    <span>{labels[locale]}</span>
    <select value={override} className="rounded border bg-white px-2 py-1 text-slate-900" onChange={event => {
      const value = event.target.value;
      if (value === '' || isProductLocale(value)) setOverride(value);
    }}>
      <option value="">{automatic[locale]}</option>
      {productLocales.map(value => <option key={value} value={value} lang={value}>{names[value]}</option>)}
    </select>
  </label>;
}
