import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Locale } from '@/i18n';
import type { CityKey } from '@/domain/types';
import { API_MODE } from '@/data/api';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface AuthUser {
  id: string;
  email: string;
  role: 'couple' | 'vendor' | 'both';
  name?: string | null;
}

interface PreferencesState {
  /** null = follow device language (resolved via resolveLocale). */
  locale: Locale | null;
  themePreference: ThemePreference;
  recentCities: CityKey[];
  /** MOCK-mode auth gate — offline demo only; API mode uses the session below. */
  phoneVerified: boolean;
  phoneNumber: string;
  /** Real session (API mode): bearer token + user, set by the verify screen. */
  authToken: string | null;
  authUser: AuthUser | null;
  notifConfirm: boolean;
  notifMessages: boolean;
  notifRefund: boolean;
  setLocale: (locale: Locale) => void;
  setThemePreference: (pref: ThemePreference) => void;
  pushRecentCity: (city: CityKey) => void;
  setNotif: (key: 'notifConfirm' | 'notifMessages' | 'notifRefund', value: boolean) => void;
  setPhoneVerified: (phoneNumber: string) => void;
  setAuth: (token: string, user: AuthUser) => void;
  setAuthUser: (user: AuthUser) => void;
  clearAuth: () => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      locale: null,
      themePreference: 'system',
      recentCities: [],
      phoneVerified: false,
      phoneNumber: '',
      authToken: null,
      authUser: null,
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
      setAuth: (authToken, authUser) => set({ authToken, authUser }),
      setAuthUser: (authUser) => set({ authUser }),
      // Also drops the mock-mode gate (phoneVerified) so sign-out actually
      // signs out in BOTH modes — useIsAuthenticated reads one or the other.
      clearAuth: () => set({ authToken: null, authUser: null, phoneVerified: false, phoneNumber: '' }),
    }),
    {
      name: 'kapar.preferences.v2',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      // v2 → v3: session fields arrive; older payloads just gain the nulls.
      migrate: (persisted) => persisted as PreferencesState,
    },
  ),
);

/**
 * The single auth-gate predicate. API mode: a real session token. Mock mode:
 * the offline demo's simulated OTP flag (unchanged pre-Wave-2 behavior).
 */
export function useIsAuthenticated(): boolean {
  const phoneVerified = usePreferences((s) => s.phoneVerified);
  const authToken = usePreferences((s) => s.authToken);
  return API_MODE ? authToken !== null : phoneVerified;
}

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
