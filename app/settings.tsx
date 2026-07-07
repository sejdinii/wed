import React from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Divider } from '@/design/components/Divider';
import { ListItemRow } from '@/design/components/ListItemRow';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { SegmentedControl } from '@/design/components/SegmentedControl';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { usePreferences, type ThemePreference } from '@/stores/preferences';
import { LOCALE_LABELS, useI18n, type Locale } from '@/i18n';

const LOCALES: Locale[] = ['mk', 'sq', 'en'];

/** Settings — grouped rows: language & appearance, notifications, legal. */
export default function SettingsScreen() {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const prefs = usePreferences();

  const version = Constants.expoConfig?.version ?? '0.2.0';

  const NotifRow = ({
    label,
    prefKey,
  }: {
    label: string;
    prefKey: 'notifConfirm' | 'notifMessages' | 'notifRefund';
  }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing(2.5) }}>
      <AppText variant="body">{label}</AppText>
      <Switch
        value={prefs[prefKey]}
        onValueChange={(value) => {
          haptic.select();
          prefs.setNotif(prefKey, value);
        }}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
      />
    </View>
  );

  return (
    <Screen>
      {/* Header */}
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
          {t('settings.title')}
        </AppText>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing(4), gap: spacing(5), paddingBottom: spacing(10) }}>
        {/* Language & appearance */}
        <View style={{ gap: spacing(3) }}>
          <AppText variant="caption" color="tertiary">
            {t('settings.appearanceLang').toUpperCase()}
          </AppText>
          <View>
            {LOCALES.map((code, i) => (
              <View key={code}>
                {i > 0 ? <Divider /> : null}
                <PressableScale
                  onPress={() => prefs.setLocale(code)}
                  hapticFeedback="select"
                  scaleTo={0.99}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: locale === code }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing(3) }}
                >
                  <AppText variant="body">{LOCALE_LABELS[code]}</AppText>
                  {locale === code ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                </PressableScale>
              </View>
            ))}
          </View>
          <SegmentedControl<ThemePreference>
            options={[
              { key: 'system', label: t('settings.appearanceSystem') },
              { key: 'light', label: t('settings.appearanceLight') },
              { key: 'dark', label: t('settings.appearanceDark') },
            ]}
            value={prefs.themePreference}
            onChange={prefs.setThemePreference}
          />
          <ListItemRow icon="cash-outline" title={t('settings.currency')} value="МКД (ден.)" />
        </View>

        {/* Notifications — refund-window reminders are a trust feature, not spam. */}
        <View style={{ gap: spacing(1) }}>
          <AppText variant="caption" color="tertiary" style={{ marginBottom: spacing(1) }}>
            {t('settings.notifications').toUpperCase()}
          </AppText>
          <NotifRow label={t('settings.notifConfirm')} prefKey="notifConfirm" />
          <Divider />
          <NotifRow label={t('settings.notifMessages')} prefKey="notifMessages" />
          <Divider />
          <NotifRow label={t('settings.notifRefund')} prefKey="notifRefund" />
        </View>

        {/* Legal */}
        <View style={{ gap: spacing(1) }}>
          <AppText variant="caption" color="tertiary" style={{ marginBottom: spacing(1) }}>
            {t('settings.legal').toUpperCase()}
          </AppText>
          {/* PLACEHOLDER — static legal pages once published. */}
          <ListItemRow icon="document-text-outline" title={t('settings.terms')} chevron onPress={() => {}} />
          <Divider inset={12} />
          <ListItemRow icon="lock-closed-outline" title={t('settings.privacy')} chevron onPress={() => {}} />
        </View>

        <AppText variant="caption" color="tertiary" align="center">
          {t('settings.version', { version })}
        </AppText>
      </ScrollView>
    </Screen>
  );
}
