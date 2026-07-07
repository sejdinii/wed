import { useMemo } from 'react';

import { mk, type Dict } from './mk';
import { sq } from './sq';
import { en } from './en';
import { usePreferences, resolveLocale } from '@/stores/preferences';

export type Locale = 'mk' | 'sq' | 'en';

export type TranslationKey = keyof Dict;

const dictionaries: Record<Locale, Dict> = { mk, sq, en };

export const LOCALE_LABELS: Record<Locale, string> = {
  mk: 'Македонски',
  sq: 'Shqip',
  en: 'English',
};

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

/**
 * The i18n hook. Reads the persisted locale preference (falling back to the
 * device language, then to Macedonian) and returns a typed translate function.
 */
export function useI18n(): { locale: Locale; t: Translate } {
  const stored = usePreferences((s) => s.locale);
  const locale = resolveLocale(stored);

  const t = useMemo<Translate>(() => {
    const dict = dictionaries[locale];
    return (key, vars) => interpolate(dict[key], vars);
  }, [locale]);

  return { locale, t };
}
