import React from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { Divider } from '@/design/components/Divider';
import { ListItemRow } from '@/design/components/ListItemRow';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { SegmentedControl } from '@/design/components/SegmentedControl';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { usePreferences, type ThemePreference } from '@/stores/preferences';
import { LOCALE_LABELS, useI18n, type Locale } from '@/i18n';

const LOCALES: Locale[] = ['mk', 'sq', 'en'];

/**
 * Profile & settings. No forced sign-up in v1 — demanding an account before
 * showing value is a conversion killer; bookings live on-device until real
 * accounts arrive with the backend. The venue-partner card is deliberately
 * prominent: supply acquisition is the #1 constraint of this marketplace.
 */
export default function ProfileScreen() {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const setLocale = usePreferences((s) => s.setLocale);
  const themePreference = usePreferences((s) => s.themePreference);
  const setThemePreference = usePreferences((s) => s.setThemePreference);

  const version = Constants.expoConfig?.version ?? '0.1.0';

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing(5), gap: spacing(5), paddingBottom: spacing(10) }}
      >
        <AppText variant="title">{t('profile.title')}</AppText>

        {/* Identity */}
        <Card padding={4} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(4) }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="person" size={24} color={colors.onPrimarySoft} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="subheading">{t('profile.guest')}</AppText>
            <AppText variant="bodySm" color="secondary">
              {t('profile.guestHint')}
            </AppText>
          </View>
        </Card>

        {/* Language */}
        <Card padding={4} style={{ gap: spacing(1) }}>
          <AppText variant="label" color="secondary" style={{ marginBottom: spacing(2) }}>
            {t('profile.language')}
          </AppText>
          {LOCALES.map((code, i) => (
            <View key={code}>
              {i > 0 ? <Divider /> : null}
              <PressableScale
                onPress={() => setLocale(code)}
                hapticFeedback="select"
                scaleTo={0.99}
                accessibilityRole="radio"
                accessibilityState={{ selected: locale === code }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing(3),
                }}
              >
                <AppText variant="body">{LOCALE_LABELS[code]}</AppText>
                {locale === code ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
              </PressableScale>
            </View>
          ))}
        </Card>

        {/* Appearance */}
        <Card padding={4} style={{ gap: spacing(3) }}>
          <AppText variant="label" color="secondary">
            {t('profile.appearance')}
          </AppText>
          <SegmentedControl<ThemePreference>
            options={[
              { key: 'system', label: t('profile.appearanceSystem') },
              { key: 'light', label: t('profile.appearanceLight') },
              { key: 'dark', label: t('profile.appearanceDark') },
            ]}
            value={themePreference}
            onChange={setThemePreference}
          />
        </Card>

        {/* Venue partner funnel */}
        <Card padding={5} style={{ backgroundColor: colors.primarySoft, borderColor: colors.primary, gap: spacing(2) }}>
          <AppText variant="heading" style={{ color: colors.onPrimarySoft }}>
            {t('profile.partnerTitle')}
          </AppText>
          <AppText variant="body" style={{ color: colors.onPrimarySoft }}>
            {t('profile.partnerBody')}
          </AppText>
          {/* PLACEHOLDER — links to the venue-partner onboarding funnel once the partner portal exists. */}
          <Button title={t('profile.partnerCta')} onPress={() => {}} size="md" style={{ marginTop: spacing(2) }} />
        </Card>

        {/* Meta */}
        <Card padding={4}>
          <ListItemRow icon="cash-outline" title={t('profile.currency')} value="МКД (ден.)" />
          <Divider inset={12} />
          {/* PLACEHOLDER — these open static legal/support pages once published. */}
          <ListItemRow icon="help-buoy-outline" title={t('profile.help')} chevron onPress={() => {}} />
          <Divider inset={12} />
          <ListItemRow icon="document-text-outline" title={t('profile.terms')} chevron onPress={() => {}} />
          <Divider inset={12} />
          <ListItemRow icon="lock-closed-outline" title={t('profile.privacy')} chevron onPress={() => {}} />
        </Card>

        <AppText variant="caption" color="tertiary" align="center">
          {t('profile.version', { version })}
        </AppText>
      </ScrollView>
    </Screen>
  );
}
