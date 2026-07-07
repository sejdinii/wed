import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Locale } from '@/i18n';

export type ThemePreference = 'system' | 'light' | 'dark';

interface PreferencesState {
  /** null = follow device language (resolved via resolveLocale). */
  locale: Locale | null;
  themePreference: ThemePreference;
  setLocale: (locale: Locale) => void;
  setThemePreference: (pref: ThemePreference) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      locale: null,
      themePreference: 'system',
      setLocale: (locale) => set({ locale }),
      setThemePreference: (themePreference) => set({ themePreference }),
    }),
    {
      name: 'kapar.preferences.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

const SUPPORTED: readonly Locale[] = ['mk', 'sq', 'en'];

/**
 * Device-language fallback. Macedonian is the product's primary locale:
 * if the device language isn't supported we default to mk, not en —
 * this app is built for the North Macedonian market first.
 */
export function resolveLocale(stored: Locale | null): Locale {
  if (stored) return stored;
  for (const deviceLocale of getLocales()) {
    const code = deviceLocale.languageCode;
    if (code && (SUPPORTED as readonly string[]).includes(code)) {
      return code as Locale;
    }
  }
  return 'mk';
}
