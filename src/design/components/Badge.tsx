import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'gold' | 'urgency';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Status / urgency pill. `urgency` is the red scarcity pill on venue cards. */
export function Badge({ label, tone = 'neutral', dot = false, style }: BadgeProps) {
  const { colors } = useTheme();

  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceElevated, fg: colors.textSecondary },
    // Real green, not violet mint — "Confirmed" must READ as success (critic
    // flagged the mint/green mismatch twice: Wave 3 #14, Wave 4 #18).
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.amberSoft, fg: colors.amber },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    gold: { bg: colors.goldSoft, fg: colors.gold },
    urgency: { bg: colors.urgencySoft, fg: colors.urgency },
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
