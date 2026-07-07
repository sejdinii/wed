import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { usePreferences } from '@/stores/preferences';
import { brand } from '@/design/tokens';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  onPrimarySoft: string;
  accent: string;
  accentSoft: string;
  onAccentSoft: string;
  border: string;
  borderStrong: string;
  success: string;
  successSoft: string;
  onSuccessSoft: string;
  warning: string;
  warningSoft: string;
  onWarningSoft: string;
  danger: string;
  dangerSoft: string;
  onDangerSoft: string;
  overlay: string;
  scrim: string;
  skeleton: string;
  tabBar: string;
  tabBarBorder: string;
}

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
}

const lightColors: ThemeColors = {
  background: brand.ivory,
  surface: brand.paper,
  surfaceElevated: brand.paper,
  text: brand.ink,
  textSecondary: '#55605A',
  textTertiary: '#8A948D',
  textInverse: '#F7F3EA',
  primary: brand.green700,
  onPrimary: '#F7F3EA',
  primarySoft: brand.green100,
  onPrimarySoft: brand.green700,
  accent: brand.gold600,
  accentSoft: brand.gold100,
  onAccentSoft: brand.gold700,
  border: '#E7E1D5',
  borderStrong: '#D5CDBD',
  success: '#2E7D53',
  successSoft: '#E1F0E7',
  onSuccessSoft: '#1F5E3D',
  warning: '#9C6F1E',
  warningSoft: '#F7EDD8',
  onWarningSoft: '#7A5715',
  danger: '#B3402F',
  dangerSoft: '#F8E4E0',
  onDangerSoft: '#8F3225',
  overlay: 'rgba(20, 26, 22, 0.55)',
  scrim: 'rgba(0, 0, 0, 0.35)',
  skeleton: '#ECE6DA',
  tabBar: brand.paper,
  tabBarBorder: '#EFE9DE',
};

const darkColors: ThemeColors = {
  background: brand.green900,
  surface: '#161D18',
  surfaceElevated: '#1C2620',
  text: '#EFEDE4',
  textSecondary: '#A6B0A8',
  textTertiary: '#6F7A72',
  textInverse: brand.ink,
  primary: brand.green600,
  onPrimary: '#F2F7F1',
  primarySoft: '#1D3327',
  onPrimarySoft: brand.green200,
  accent: brand.gold500,
  accentSoft: '#2E2717',
  onAccentSoft: brand.gold300,
  border: '#27302A',
  borderStrong: '#35403A',
  success: '#5CB185',
  successSoft: '#1A3324',
  onSuccessSoft: '#8FCCA9',
  warning: '#D9A94E',
  warningSoft: '#33290F',
  onWarningSoft: '#E5C070',
  danger: '#E06A54',
  dangerSoft: '#3A1F19',
  onDangerSoft: '#EF9A89',
  overlay: 'rgba(0, 0, 0, 0.6)',
  scrim: 'rgba(0, 0, 0, 0.5)',
  skeleton: '#222B25',
  tabBar: '#121814',
  tabBarBorder: '#1F2823',
};

export const lightTheme: Theme = { mode: 'light', colors: lightColors };
export const darkTheme: Theme = { mode: 'dark', colors: darkColors };

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const themePreference = usePreferences((s) => s.themePreference);

  const theme = useMemo<Theme>(() => {
    const mode = themePreference === 'system' ? (systemScheme ?? 'light') : themePreference;
    return mode === 'dark' ? darkTheme : lightTheme;
  }, [systemScheme, themePreference]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
