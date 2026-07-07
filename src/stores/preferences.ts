import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Locale } from '@/i18n';
import type { CityKey } from '@/domain/types';

export type ThemePreference = 'system' | 'light' | 'dark';

interface PreferencesState {
  /** null = follow device language (resolved via resolveLocale). */
  locale: Locale | null;
  themePreference: ThemePreference;
  recentCities: CityKey[];
  /** MOCK auth — set after the (simulated) OTP; real phone auth lands with the backend. */
  phoneVerified: boolean;
  phoneNumber: string;
  notifConfirm: boolean;
  notifMessages: boolean;
  notifRefund: boolean;
  setLocale: (locale: Locale) => void;
  setThemePreference: (pref: ThemePreference) => void;
  pushRecentCity: (city: CityKey) => void;
  setNotif: (key: 'notifConfirm' | 'notifMessages' | 'notifRefund', value: boolean) => void;
  setPhoneVerified: (phoneNumber: string) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      locale: null,
      themePreference: 'system',
      recentCities: [],
      phoneVerified: false,
      phoneNumber: '',
      notifConfirm: true,
      notifMessages: true,
      notifRefund: true,
      setLocale: (locale) => set({ locale }),
      setThemePreference: (themePreference) => set({ themePreference }),
      pushRecentCity: (city) =>
        set((state) => ({
          recentCities: [city, ...state.recentCities.filter((c) => c !== city)].slice(0, 4),
        })),
      setNotif: (key, value) => set({ [key]: value }),
      setPhoneVerified: (phoneNumber) => set({ phoneVerified: true, phoneNumber }),
    }),
    {
      name: 'kapar.preferences.v2',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

const SUPPORTED: readonly Locale[] = ['mk', 'sq', 'en'];

/**
 * Device-language fallback. Macedonian is the product's primary locale:
 * if the device language isn't supported we default to mk, not en.
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
