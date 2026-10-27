import { describe, expect, it } from 'vitest';
import { UI_LOCALES, isUiLocale, uiText } from '../../src/lib/interface-translations';

describe('independent interface languages', () => {
  it('has eight distinct, manually selectable interface locale codes', () => {
    const codes = UI_LOCALES.map(([code]) => code);
    expect(new Set(codes).size).toBe(8);
    expect(codes).toEqual(expect.arrayContaining(['de','en','fr','it','es','pt','uk','ar']));
  });
  it('translates the core experience without touching document language', () => {
    expect(uiText('en','career-profile')).toBe('Skills & target country');
    expect(uiText('uk','signout')).toBe('Вийти');
    expect(uiText('ar','job-finder')).toBe('البحث عن عمل');
    expect(uiText('fr','chooseInterface')).toContain('Langue');
    expect(uiText('en','unknown','Fallback')).toBe('Fallback');
  });
  it('validates interface locale selection', () => {
    expect(isUiLocale('ar')).toBe(true);
    expect(isUiLocale('en-US')).toBe(false);
    expect(isUiLocale('<script>')).toBe(false);
  });
});
