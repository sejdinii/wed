import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Badge } from '@/design/components/Badge';
import { Button } from '@/design/components/Button';
import { Divider } from '@/design/components/Divider';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { formatMkd } from '@/lib/money';
import { formatLongDate, formatMediumDate } from '@/lib/dates';
import { useBookings } from '@/stores/bookings';
import { useBookingDraft } from '@/stores/bookingDraft';
import { useI18n } from '@/i18n';

/**
 * Post-payment status. Honest two-phase confirmation:
 *  reserved  → amber "request sent, venue confirms within 24h"
 *  confirmed → green "the date is yours"
 * The screen subscribes to the booking, so the venue's confirmation flips
 * the state live (mocked by venueBot until the backend pushes it).
 * Back-gestures are disabled at the navigator: a completed payment can't be
 * swiped away.
 */
export default function BookingStatusScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();

  const booking = useBookings((s) => s.bookings.find((b) => b.id === bookingId));
  const resetDraft = useBookingDraft((s) => s.reset);

  const iconScale = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    resetDraft();
    Animated.sequence([
      Animated.spring(iconScale, { toValue: 1, speed: 14, bounciness: 12, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
    ]).start();
  }, [iconScale, contentAnim, resetDraft]);

  if (!booking) return <Redirect href="/(tabs)" />;

  const confirmed = booking.status === 'confirmed';

  const ActionRow = ({
    icon,
    label,
    onPress,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    onPress: () => void;
  }) => (
    <PressableScale
      onPress={onPress}
      scaleTo={0.99}
      hapticFeedback="select"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(3.5) }}
    >
      <Ionicons name={icon} size={19} color={colors.text} />
      <AppText variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </PressableScale>
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing(4), gap: spacing(4), paddingBottom: spacing(8) }}>
        <View style={{ alignItems: 'center', gap: spacing(3), paddingTop: spacing(6) }}>
          <Animated.View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: confirmed ? colors.mint : colors.amberSoft,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: iconScale }],
            }}
          >
            <Ionicons
              name={confirmed ? 'checkmark' : 'paper-plane'}
              size={40}
              color={confirmed ? colors.success : colors.amber}
            />
          </Animated.View>
          <AppText variant="display" align="center">
            {confirmed ? t('status.confirmedTitle') : t('status.sentTitle')}
          </AppText>
          <AppText variant="body" color="secondary" align="center">
            {confirmed
              ? t('status.confirmedBody', { venue: booking.venueName, date: formatMediumDate(booking.eventDateISO, locale) })
              : t('status.sentBody', { venue: booking.venueName })}
          </AppText>
          <Badge
            label={confirmed ? t('status.confirmedChip') : t('status.awaiting')}
            tone={confirmed ? 'success' : 'warning'}
            dot
          />
        </View>

        <Animated.View
          style={{
            gap: spacing(4),
            opacity: contentAnim,
            transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          }}
        >
          {/* Reference block */}
          <View style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: spacing(3.5), gap: spacing(1) }}>
            <AppText variant="bodySm" color="secondary">
              {t('status.codeLabel')}: <AppText variant="bodySmStrong">{booking.confirmationCode}</AppText>
            </AppText>
            <AppText variant="bodySm" color="secondary">
              {formatLongDate(booking.eventDateISO, locale)} · {t('bookings.guestCount', { count: booking.guestCount })}
            </AppText>
            <AppText variant="bodySm" color="secondary">
              {t('details.kaparPaid')}: <AppText variant="bodySmStrong" color="gold">{formatMkd(booking.kaparMkd, locale)}</AppText>
            </AppText>
          </View>

          {/* Actions */}
          <View>
            <ActionRow icon="ticket-outline" label={t('status.viewBooking')} onPress={() => router.replace(`/booking/${booking.id}`)} />
            <Divider />
            {/* PLACEHOLDER — wires to expo-calendar once notifications/calendar land. */}
            <ActionRow icon="calendar-outline" label={t('status.addCalendar')} onPress={() => {}} />
            <Divider />
            <ActionRow icon="chatbubble-outline" label={t('status.messageVenue')} onPress={() => router.push(`/messages/${booking.id}`)} />
          </View>

          {confirmed ? (
            <View style={{ backgroundColor: colors.mint, borderRadius: radius.md, padding: spacing(3) }}>
              <AppText variant="bodySmStrong" style={{ color: colors.onMint }}>
                {t('status.nextStep')}
              </AppText>
            </View>
          ) : null}

          <Button title={t('common.done')} onPress={() => router.replace('/(tabs)/bookings')} variant="dark" fullWidth />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
