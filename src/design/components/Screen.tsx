import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/design/theme';

export interface ScreenProps {
  children: React.ReactNode;
  /**
   * Safe-area edges. Tab screens default to top only (the tab bar owns the
   * bottom inset); immersive screens (photo headers) pass an empty array.
   */
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, edges = ['top'], style }: ScreenProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      {children}
    </SafeAreaView>
  );
}
