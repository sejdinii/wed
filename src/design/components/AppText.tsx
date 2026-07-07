import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { typeScale, type TypeVariant } from '@/design/tokens';
import { useTheme } from '@/design/theme';

type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'brand'
  | 'gold'
  | 'success'
  | 'danger'
  | 'urgency'
  | 'onPrimary';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: TextColor;
  align?: TextStyle['textAlign'];
}

/**
 * The only way text is rendered in the app — guarantees every string uses the
 * type scale and theme palette. `allowFontScaling` stays on (accessibility);
 * layouts must tolerate large text, not suppress it.
 */
export function AppText({ variant = 'body', color = 'primary', align, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();

  const colorValue: Record<TextColor, string> = {
    primary: colors.text,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    inverse: colors.textInverse,
    brand: colors.primary,
    gold: colors.gold,
    success: colors.success,
    danger: colors.danger,
    urgency: colors.urgency,
    onPrimary: colors.onPrimary,
  };

  return (
    <Text
      {...rest}
      style={[typeScale[variant], { color: colorValue[color] }, align ? { textAlign: align } : null, style]}
    />
  );
}
