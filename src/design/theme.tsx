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
  mint: string;
  onMint: string;
  chip: string;
  onChip: string;
  urgency: string;
  urgencySoft: string;
  amber: string;
  amberSoft: string;
  gold: string;
  goldSoft: string;
  border: string;
  borderStrong: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  skeleton: string;
  tabBar: string;
  tabBarBorder: string;
}

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
}

const lightColors: ThemeColors = {
  background: brand.paper,
  surface: brand.paper,
  surfaceElevated: '#F3F6F3',
  text: brand.ink,
  textSecondary: '#5D6A61',
  textTertiary: '#8C978F',
  textInverse: '#FFFFFF',
  primary: brand.green,
  onPrimary: '#FFFFFF',
  mint: brand.mint,
  onMint: brand.mintInk,
  chip: brand.chip,
  onChip: '#FFFFFF',
  urgency: brand.red,
  urgencySoft: brand.redSoft,
  amber: brand.amber,
  amberSoft: brand.amberSoft,
  gold: brand.gold,
  goldSoft: brand.goldSoft,
  border: '#E3E8E3',
  borderStrong: '#C9D1CA',
  success: brand.green,
  successSoft: brand.mint,
  danger: brand.red,
  dangerSoft: brand.redSoft,
  overlay: 'rgba(19, 26, 22, 0.55)',
  skeleton: '#ECF0EC',
  tabBar: brand.paper,
  tabBarBorder: '#E9EDE9',
};

const darkColors: ThemeColors = {
  background: '#0F1411',
  surface: '#151B17',
  surfaceElevated: '#1C231E',
  text: '#EBEFEA',
  textSecondary: '#A2AEA5',
  textTertiary: '#6E7A71',
  textInverse: brand.ink,
  primary: brand.greenBright,
  onPrimary: '#0C130F',
  mint: '#173226',
  onMint: '#7FC5A2',
  chip: '#E9EDE9',
  onChip: brand.ink,
  urgency: '#E0705F',
  urgencySoft: '#38201B',
  amber: '#D8A94E',
  amberSoft: '#322810',
  gold: '#D0AA61',
  goldSoft: '#2E2615',
  border: '#252D26',
  borderStrong: '#39423A',
  success: brand.greenBright,
  successSoft: '#173226',
  danger: '#E0705F',
  dangerSoft: '#38201B',
  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#212822',
  tabBar: '#121813',
  tabBarBorder: '#1F2620',
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
