import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { Button } from './Button';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { useI18n } from '@/i18n';

export interface ErrorStateProps {
  onRetry: () => void;
  /** Extra escape hatch (e.g. "Back") when retry alone can strand the user. */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/** Network/load failure with retry — the required third state of every screen. */
export function ErrorState({ onRetry, secondaryLabel, onSecondary }: ErrorStateProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: spacing(8), paddingVertical: spacing(10), gap: spacing(3) }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.dangerSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
      </View>
      <AppText variant="heading" align="center">
        {t('error.title')}
      </AppText>
      <AppText variant="body" color="secondary" align="center">
        {t('error.body')}
      </AppText>
      <Button title={t('common.retry')} onPress={onRetry} variant="mint" size="md" style={{ marginTop: spacing(2) }} />
      {secondaryLabel && onSecondary ? <Button title={secondaryLabel} onPress={onSecondary} variant="ghost" size="md" /> : null}
    </View>
  );
}
