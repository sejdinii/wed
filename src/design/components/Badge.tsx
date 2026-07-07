import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Leading status dot. */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Status pill — booking lifecycle states, "Премиум", kapar amounts on cards. */
export function Badge({ label, tone = 'neutral', dot = false, style }: BadgeProps) {
  const { colors } = useTheme();

  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceElevated, fg: colors.textSecondary },
    primary: { bg: colors.primarySoft, fg: colors.onPrimarySoft },
    accent: { bg: colors.accentSoft, fg: colors.onAccentSoft },
    success: { bg: colors.successSoft, fg: colors.onSuccessSoft },
    warning: { bg: colors.warningSoft, fg: colors.onWarningSoft },
    danger: { bg: colors.dangerSoft, fg: colors.onDangerSoft },
  };

  const { bg, fg } = tones[tone];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(1.5),
          alignSelf: 'flex-start',
          backgroundColor: bg,
          borderRadius: radius.pill,
          paddingHorizontal: spacing(2.5),
          paddingVertical: spacing(1),
        },
        style,
      ]}
    >
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} /> : null}
      <AppText variant="caption" style={{ color: fg }}>
        {label}
      </AppText>
    </View>
  );
}
