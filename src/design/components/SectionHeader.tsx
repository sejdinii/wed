import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from './AppText';
import { haptic } from '@/lib/haptics';
import { spacing } from '@/design/tokens';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingHorizontal: spacing(5),
        marginBottom: spacing(3),
      }}
    >
      <AppText variant="heading">{title}</AppText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={() => {
            haptic.select();
            onAction();
          }}
          hitSlop={8}
          accessibilityRole="button"
        >
          <AppText variant="label" color="brand">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
