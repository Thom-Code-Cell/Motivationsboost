/**
 * User-supplied BCP-47 language tags for document-generation tasks.
 * The app chrome is not yet fully translated. Don't conflate the two.
 */
export const POPULAR_DOCUMENT_LANGUAGES = [
  ['de', 'Deutsch'], ['en', 'English'], ['fr', 'Français'], ['it', 'Italiano'],
  ['es', 'Español'], ['pt', 'Português'], ['nl', 'Nederlands'], ['pl', 'Polski'],
  ['uk', 'Українська'], ['ru', 'Русский'], ['tr', 'Türkçe'], ['ar', 'العربية'],
  ['hi', 'हिन्दी'], ['bn', 'বাংলা'], ['ur', 'اردو'], ['fa', 'فارسی'],
  ['zh-Hans', '简体中文'], ['zh-Hant', '繁體中文'], ['ja', '日本語'], ['ko', '한국어'],
  ['id', 'Bahasa Indonesia'], ['vi', 'Tiếng Việt'], ['th', 'ไทย'],
  ['ms', 'Bahasa Melayu'], ['sv', 'Svenska'], ['no', 'Norsk'], ['da', 'Dansk'],
  ['fi', 'Suomi'], ['cs', 'Čeština'], ['sk', 'Slovenčina'], ['ro', 'Română'],
  ['hu', 'Magyar'], ['el', 'Ελληνικά'], ['he', 'עברית'], ['sw', 'Kiswahili'],
  ['ta', 'தமிழ்'], ['te', 'తెలుగు'], ['sr', 'Српски'], ['hr', 'Hrvatski'],
  ['sq', 'Shqip'], ['am', 'አማርኛ'], ['ne', 'नेपाली'], ['fil', 'Filipino'],
] as const;

/** Never silently convert a chosen language to German. */
export function getLanguageName(tag: string): string {
  try {
    const canonical = Intl.getCanonicalLocales(tag)[0];
    if (!canonical) return tag;
    const names = new Intl.DisplayNames(['en'], { type: 'language' });
    return names.of(canonical) || canonical;
  } catch {
    return tag;
  }
}

export function suggestedDocumentLanguage(browserLanguage?: string): string {
  try {
    const tag = Intl.getCanonicalLocales(browserLanguage || 'de')[0];
    return tag || 'de';
  } catch {
    return 'de';
  }
}
