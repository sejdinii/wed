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
  /** Lavender reassurance wash (kapar cards, info banners). */
  mint: string;
  onMint: string;
  chip: string;
  onChip: string;
  urgency: string;
  urgencySoft: string;
  amber: string;
  amberSoft: string;
  /** Kapar amounts — violet in the v3 identity. */
  gold: string;
  goldSoft: string;
  border: string;
  borderStrong: string;
  success: string;
  successSoft: string;
  danger: string;
  /** Label color that keeps contrast ON a danger-filled surface in both modes. */
  onDanger: string;
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
  surfaceElevated: '#F1EFF8',
  text: brand.ink,
  textSecondary: '#5A5670',
  textTertiary: '#8D89A3',
  textInverse: '#FFFFFF',
  primary: brand.violet,
  onPrimary: '#FFFFFF',
  mint: brand.lavender,
  onMint: brand.violetDeep,
  chip: brand.chip,
  onChip: '#FFFFFF',
  urgency: brand.red,
  urgencySoft: brand.redSoft,
  amber: brand.amber,
  amberSoft: brand.amberSoft,
  gold: brand.violet,
  goldSoft: brand.lavender,
  border: '#E7E4F0',
  borderStrong: '#CDC8DE',
  success: brand.green,
  successSoft: brand.greenSoft,
  danger: brand.red,
  onDanger: '#FFFFFF',
  dangerSoft: brand.redSoft,
  overlay: 'rgba(30, 27, 46, 0.55)',
  skeleton: '#ECE9F4',
  tabBar: brand.paper,
  tabBarBorder: '#ECE9F4',
};

const darkColors: ThemeColors = {
  background: '#141221',
  surface: '#1B1830',
  surfaceElevated: '#232040',
  text: '#EDEBF5',
  textSecondary: '#A8A4BE',
  textTertiary: '#726E8A',
  textInverse: brand.ink,
  primary: brand.violetBright,
  onPrimary: '#14102A',
  mint: '#292344',
  onMint: '#C4B5FD',
  chip: '#EDEBF5',
  onChip: brand.ink,
  urgency: '#F07373',
  urgencySoft: '#3A2030',
  amber: '#E8A54C',
  amberSoft: '#342A16',
  gold: brand.violetBright,
  goldSoft: '#292344',
  border: '#2B2748',
  borderStrong: '#413C66',
  success: '#4ADE80',
  successSoft: '#17301F',
  danger: '#F07373',
  onDanger: '#2B0B0B',
  dangerSoft: '#3A2030',
  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#252142',
  tabBar: '#171428',
  tabBarBorder: '#232040',
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
