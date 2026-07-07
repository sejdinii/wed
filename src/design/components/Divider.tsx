import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';

export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border, marginLeft: spacing(inset) }} />;
}
