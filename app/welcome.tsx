import React, { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { useTheme } from '@/design/theme';
import { brand, radius, spacing, typeScale } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { authApi } from '@/data/authApi';
import { useI18n } from '@/i18n';

/**
 * Welcome — email-first onboarding (decision 2026-07-12: email 6-digit code,
 * channel-pluggable for SMS later). Logo, tagline, email input, trust
 * markers. API mode emails a real code; the offline mock accepts any code.
 */
export default function WelcomeScreen() {
  const { colors, mode } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const canContinue = /.+@.+\..+/.test(email.trim());

  const requestCode = async () => {
    if (sending) return;
    haptic.medium();
    setSending(true);
    setSendFailed(false);
    try {
      const { devCode } = await authApi.requestCode(email.trim());
      router.push({ pathname: '/verify', params: { email: email.trim(), ...(devCode ? { devCode } : {}) } });
    } catch {
      haptic.error();
      setSendFailed(true);
    } finally {
      setSending(false);
    }
  };

  const TrustItem = ({
    icon,
    title,
    body,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    body: string;
  }) => (
    <View style={{ flex: 1, alignItems: 'center', gap: spacing(2) }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.mint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <AppText variant="bodySmStrong" align="center">
        {title}
      </AppText>
      <AppText variant="caption" color="secondary" align="center">
        {body}
      </AppText>
    </View>
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing(8) }}>
        {/* Brand hero on a soft lavender wash */}
        <LinearGradient
          colors={mode === 'dark' ? ['#232040', colors.background] : [brand.lavenderDeep, colors.background]}
          style={{ alignItems: 'center', paddingTop: spacing(12), paddingBottom: spacing(8), gap: spacing(3) }}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="location" size={72} color={colors.primary} />
            <Ionicons name="heart" size={22} color={colors.onPrimary} style={{ position: 'absolute', top: 16 }} />
          </View>
          <AppText style={{ ...typeScale.display, fontSize: 38, lineHeight: 44, color: colors.text }}>
            {t('common.appName')}
          </AppText>
          <AppText variant="body" color="secondary" align="center" style={{ paddingHorizontal: spacing(10) }}>
            {t('welcome.tagline')}
          </AppText>
        </LinearGradient>

        <View style={{ paddingHorizontal: spacing(5), gap: spacing(4), paddingTop: spacing(4) }}>
          <View style={{ alignItems: 'center', gap: spacing(1) }}>
            <AppText variant="display">{t('welcome.title')}</AppText>
            <AppText variant="body" color="secondary">
              {t('welcome.subtitle')}
            </AppText>
          </View>

          {/* Email input */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: colors.borderStrong,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              height: 56,
            }}
          >
            <View style={{ paddingLeft: spacing(3.5) }}>
              <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
            </View>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('welcome.emailPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              accessibilityLabel={t('welcome.emailPlaceholder')}
              style={{ flex: 1, paddingHorizontal: spacing(3), ...typeScale.body, color: colors.text }}
            />
          </View>

          {sendFailed ? (
            <AppText variant="bodySm" color="danger" align="center">
              {t('error.body')}
            </AppText>
          ) : null}

          <Button
            title={t('common.continue')}
            onPress={requestCode}
            disabled={!canContinue}
            loading={sending}
            iconLeft={!sending ? <Ionicons name="arrow-forward" size={17} color={colors.onPrimary} /> : undefined}
            fullWidth
          />

          {/* or divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <AppText variant="bodySm" color="tertiary">
              {t('welcome.or')}
            </AppText>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          {/* Trust markers — honest product facts, not invented social proof */}
          <View style={{ flexDirection: 'row', gap: spacing(3) }}>
            <TrustItem icon="wallet-outline" title={t('welcome.trust1Title')} body={t('welcome.trust1Body')} />
            <TrustItem icon="calendar-outline" title={t('welcome.trust2Title')} body={t('welcome.trust2Body')} />
            <TrustItem icon="flash-outline" title={t('welcome.trust3Title')} body={t('welcome.trust3Body')} />
          </View>

          {/* 6-digit code explainer */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing(3),
              backgroundColor: colors.surfaceElevated,
              borderRadius: radius.lg,
              padding: spacing(4),
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.mint,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="lock-open-outline" size={19} color={colors.primary} />
            </View>
            <AppText variant="bodySmStrong" style={{ flex: 1 }}>
              {t('welcome.codeInfo')}
            </AppText>
            <AppText variant="heading" color="brand">
              *****
            </AppText>
          </View>

          {/* Legal — static draft screens (pending real legal review). */}
          <View style={{ alignItems: 'center', gap: 2 }}>
            <AppText variant="bodySm" color="secondary" align="center">
              {t('welcome.legalPrefix')}
            </AppText>
            <View style={{ flexDirection: 'row', gap: spacing(1) }}>
              <PressableScale onPress={() => router.push('/legal/terms')} hapticFeedback="select" accessibilityRole="link">
                <AppText variant="bodySmStrong" color="brand">
                  {t('settings.terms')}
                </AppText>
              </PressableScale>
              <AppText variant="bodySm" color="secondary">
                {t('welcome.legalAnd')}
              </AppText>
              <PressableScale onPress={() => router.push('/legal/privacy')} hapticFeedback="select" accessibilityRole="link">
                <AppText variant="bodySmStrong" color="brand">
                  {t('settings.privacy')}
                </AppText>
              </PressableScale>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
