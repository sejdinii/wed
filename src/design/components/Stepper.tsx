import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';

export interface StepperProps {
  value: number;
  min: number;
  max: number;
  /** Guests move in tables of 10 by default — nobody invites 137 people. */
  step?: number;
  onChange: (value: number) => void;
  accessibilityLabel: string;
}

export function Stepper({ value, min, max, step = 10, onChange, accessibilityLabel }: StepperProps) {
  const { colors } = useTheme();

  const canDecrease = value - step >= min;
  const canIncrease = value + step <= max;

  const StepButton = ({ type }: { type: 'inc' | 'dec' }) => {
    const enabled = type === 'inc' ? canIncrease : canDecrease;
    return (
      <PressableScale
        onPress={() => onChange(type === 'inc' ? value + step : value - step)}
        disabled={!enabled}
        hapticFeedback="select"
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel={`${type === 'inc' ? '+' : '−'}${step}`}
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          borderWidth: 1.5,
          borderColor: enabled ? colors.borderStrong : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: enabled ? 1 : 0.35,
        }}
      >
        <Ionicons name={type === 'inc' ? 'add' : 'remove'} size={20} color={colors.text} />
      </PressableScale>
    );
  };

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ now: value, min, max }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(4) }}
    >
      <StepButton type="dec" />
      <AppText variant="heading" style={{ minWidth: 56, textAlign: 'center' }}>
        {value}
      </AppText>
      <StepButton type="inc" />
    </View>
  );
}
