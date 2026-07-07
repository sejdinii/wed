import React from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/design/theme';
import { radius, shadow, spacing } from '@/design/tokens';

export interface CardProps extends ViewProps {
  /** Padding in 4pt grid units. */
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Standard surface. Light mode: paper + whisper shadow. Dark mode: elevated
 * surface + hairline border (shadows don't read on dark backgrounds).
 */
export function Card({ padding = 4, style, children, ...rest }: CardProps) {
  const { colors, mode } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing(padding),
          borderWidth: 1,
          borderColor: colors.border,
        },
        mode === 'light' ? shadow.card : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
