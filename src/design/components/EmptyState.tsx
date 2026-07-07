import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { Button } from './Button';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';

export interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Friendly, actionable empty state — never a dead end. */
export function EmptyState({ icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: spacing(8), paddingVertical: spacing(10), gap: spacing(3) }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={30} color={colors.onPrimarySoft} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText variant="body" color="secondary" align="center">
        {body}
      </AppText>
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" size="md" style={{ marginTop: spacing(2) }} />
      ) : null}
    </View>
  );
}
