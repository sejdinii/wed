import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Badge } from '@/design/components/Badge';
import { Button } from '@/design/components/Button';
import { Screen } from '@/design/components/Screen';
import { KaparWalletCard } from '@/components/KaparWalletCard';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { useBookings } from '@/stores/bookings';
import { useBookingDraft } from '@/stores/bookingDraft';
import { useI18n } from '@/i18n';

/**
 * The success moment — the emotional peak of the whole product.
 * A sprung checkmark, then the Kapar wallet card (the couple's proof of
 * reservation), then honest expectation-setting: the venue still has to
 * confirm within 24h. Overselling "done!" here would generate the exact
 * support tickets Kapar Protection exists to prevent.
 * Back-gestures are disabled: a completed payment can't be swiped away.
 */
export default function BookingConfirmedScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const booking = useBookings((s) => s.bookings.find((b) => b.id === bookingId));
  const resetDraft = useBookingDraft((s) => s.reset);

  const checkScale = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    resetDraft();
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1, speed: 14, bounciness: 12, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
    ]).start();
  }, [checkScale, contentAnim, resetDraft]);

  if (!booking) return <Redirect href="/(tabs)" />;

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing(5), gap: spacing(5), paddingBottom: spacing(8) }}
      >
        <View style={{ alignItems: 'center', gap: spacing(3), paddingTop: spacing(6) }}>
          <Animated.View
            style={{
              width: 92,
              height: 92,
              borderRadius: 46,
              backgroundColor: colors.successSoft,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: checkScale }],
            }}
          >
            <Ionicons name="checkmark" size={44} color={colors.success} />
          </Animated.View>
          <AppText variant="display" align="center">
            {t('confirmed.title')}
          </AppText>
          <AppText variant="body" color="secondary" align="center">
            {t('confirmed.subtitle')}
          </AppText>
          <Badge label={t('confirmed.awaitingVenue')} tone="warning" dot />
        </View>

        <Animated.View
          style={{
            gap: spacing(5),
            opacity: contentAnim,
            transform: [
              {
                translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
              },
            ],
          }}
        >
          <KaparWalletCard booking={booking} />

          <View style={{ gap: spacing(3) }}>
            <AppText variant="heading">{t('confirmed.whatsNext')}</AppText>
            {([1, 2, 3] as const).map((n) => (
              <View key={n} style={{ flexDirection: 'row', gap: spacing(3), alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                  }}
                >
                  <AppText variant="caption" style={{ color: colors.onPrimarySoft }}>
                    {n}
                  </AppText>
                </View>
                <AppText variant="body" color="secondary" style={{ flex: 1 }}>
                  {t(`confirmed.next${n}`)}
                </AppText>
              </View>
            ))}
          </View>

          <View style={{ gap: spacing(3) }}>
            <Button title={t('confirmed.viewBookings')} onPress={() => router.replace('/(tabs)/bookings')} fullWidth />
            <Button
              title={t('common.done')}
              onPress={() => router.replace('/(tabs)')}
              variant="ghost"
              size="md"
              fullWidth
            />
          </View>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
