import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Filter / quick-fact pill. Selected state flips to solid brand green. */
export function Chip({ label, selected = false, onPress, icon, style }: ChipProps) {
  const { colors } = useTheme();

  const inner = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(1.5),
          paddingHorizontal: spacing(3.5),
          height: 38,
          borderRadius: radius.pill,
          backgroundColor: selected ? colors.primary : colors.surface,
          borderWidth: 1,
          borderColor: selected ? colors.primary : colors.border,
        },
        style,
      ]}
    >
      {icon}
      <AppText variant="label" style={{ color: selected ? colors.onPrimary : colors.text }}>
        {label}
      </AppText>
    </View>
  );

  if (!onPress) return inner;

  return (
    <PressableScale
      onPress={onPress}
      hapticFeedback="select"
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {inner}
    </PressableScale>
  );
}
