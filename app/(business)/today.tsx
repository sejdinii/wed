import React from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Badge } from '@/design/components/Badge';
import { EmptyState } from '@/design/components/EmptyState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { usePreferences } from '@/stores/preferences';
import { useI18n } from '@/i18n';

/**
 * Business mode · Today — the vendor's landing feed (Pulse pattern: today's
 * requests, visits, and messages in one stream). Wave 2 ships the shell;
 * Wave 3 adds the listing, Wave 4 fills the feed with real requests.
 */
export default function BusinessTodayScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const authUser = usePreferences((s) => s.authUser);

  return (
    <Screen>
      {/* Header: mode identity + the way back to couple mode */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing(4),
          paddingVertical: spacing(3),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: spacing(3),
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading">{t('business.title')}</AppText>
          <AppText variant="caption" color="secondary">
            {authUser?.email ?? ''}
          </AppText>
        </View>
        <Badge label={t('business.badge')} tone="gold" />
        <PressableScale
          onPress={() => router.replace('/(tabs)/profile')}
          hapticFeedback="select"
          accessibilityRole="button"
          accessibilityLabel={t('business.switchBack')}
        >
          <Ionicons name="swap-horizontal" size={22} color={colors.primary} />
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing(4), gap: spacing(3) }} showsVerticalScrollIndicator={false}>
        <AppText variant="title">{t('business.todayTitle')}</AppText>
        {/* Wave 3 replaces this with the listing funnel; Wave 4 with the live feed. */}
        <EmptyState
          icon="business-outline"
          title={t('business.emptyTitle')}
          body={t('business.emptyBody')}
        />
      </ScrollView>
    </Screen>
  );
}
