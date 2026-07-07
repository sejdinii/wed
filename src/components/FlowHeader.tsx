import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { PressableScale } from '@/design/components/PressableScale';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { useI18n } from '@/i18n';

export interface FlowHeaderProps {
  title: string;
  step: 1 | 2 | 3;
}

/**
 * Header for the 3-step kapar checkout: back affordance, step label and a
 * segmented progress bar. Explicit progress reduces checkout abandonment —
 * the user always knows how much is left.
 */
export function FlowHeader({ title, step }: FlowHeaderProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  return (
    <View style={{ paddingHorizontal: spacing(5), gap: spacing(3), paddingBottom: spacing(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <PressableScale
          onPress={() => router.back()}
          hapticFeedback="select"
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </PressableScale>
        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <AppText variant="subheading">{title}</AppText>
          <AppText variant="caption" color="tertiary">
            {t('booking.stepOf', { step })}
          </AppText>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing(1.5) }}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: s <= step ? colors.primary : colors.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}
