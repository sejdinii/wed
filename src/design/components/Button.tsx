import React from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';

type ButtonVariant = 'primary' | 'dark' | 'mint' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 38, md: 46, lg: 54 };

/** Rounded-rectangle CTA — solid violet for primary actions (v3 design). */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  iconLeft,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const palette: Record<ButtonVariant, { bg: string; fg: string; borderColor?: string }> = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    dark: { bg: colors.chip, fg: colors.onChip },
    mint: { bg: colors.mint, fg: colors.onMint },
    outline: { bg: 'transparent', fg: colors.text, borderColor: colors.borderStrong },
    ghost: { bg: 'transparent', fg: colors.primary },
    // onDanger, not white: dark mode's lighter danger red left a white
    // label at ~2.2:1 — the destructive CTA read as disabled (critic).
    danger: { bg: colors.danger, fg: colors.onDanger },
  };

  const { bg, fg, borderColor } = palette[variant];
  const isBlocked = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isBlocked}
      hapticFeedback={variant === 'primary' || variant === 'dark' ? 'medium' : 'select'}
      accessibilityRole="button"
      accessibilityState={{ disabled: isBlocked, busy: loading }}
      accessibilityLabel={title}
      style={[
        {
          height: HEIGHT[size],
          borderRadius: radius.md,
          backgroundColor: bg,
          borderWidth: borderColor ? 1.5 : 0,
          borderColor,
          opacity: isBlocked && !loading ? 0.45 : 1,
          paddingHorizontal: size === 'sm' ? spacing(4) : spacing(6),
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
          {iconLeft}
          <AppText variant={size === 'sm' ? 'label' : 'bodyStrong'} style={{ color: fg }}>
            {title}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}
