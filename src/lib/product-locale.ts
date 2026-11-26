export const productLocales = ['de', 'en', 'fr', 'it'] as const;
export const productLanguageHeader = 'x-motivationsboost-language';
export type ProductLocale = typeof productLocales[number];

export function isProductLocale(value: string): value is ProductLocale {
  return productLocales.some(locale => locale === value);
}

export function preferredProductLocale(languages: readonly string[]): ProductLocale {
  for (const language of languages) {
    const base = language.trim().split('-')[0].toLowerCase();
    if (isProductLocale(base)) return base;
  }
  return 'de';
}
