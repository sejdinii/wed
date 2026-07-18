import React from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { useI18n } from '@/i18n';

/**
 * Privacy policy — static, factual, pre-launch draft. States exactly what's
 * stored (email, phone, booking details, in-app messages) and what isn't
 * (no payment data — the platform never holds money).
 */
export default function PrivacyScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const paragraphs = [
    t('legal.privacyIntro'),
    t('legal.privacyDataCollected'),
    t('legal.privacyDataUse'),
    t('legal.privacyNoPayment'),
    t('legal.privacySharing'),
  ];

  return (
    <Screen edges={['top', 'bottom']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing(4),
          paddingVertical: spacing(3),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <PressableScale onPress={() => router.back()} hapticFeedback="select" accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <AppText variant="heading" style={{ flex: 1, textAlign: 'center' }}>
          {t('settings.privacy')}
        </AppText>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing(4), gap: spacing(4), paddingBottom: spacing(10) }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing(2),
            backgroundColor: colors.amberSoft,
            borderRadius: radius.md,
            padding: spacing(3),
          }}
        >
          <Ionicons name="construct-outline" size={16} color={colors.amber} />
          <AppText variant="bodySmStrong" style={{ color: colors.amber, flex: 1 }}>
            {t('legal.draftNotice')}
          </AppText>
        </View>

        <View style={{ gap: spacing(4) }}>
          {paragraphs.map((p, i) => (
            <AppText key={i} variant="body" color="secondary">
              {p}
            </AppText>
          ))}
        </View>

        <Button title={t('legal.contactCta')} onPress={() => router.push('/support')} variant="outline" />
      </ScrollView>
    </Screen>
  );
}
