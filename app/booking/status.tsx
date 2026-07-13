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
import { bookingApi } from '@/data/bookingApi';
import { API_MODE } from '@/data/api';
import { useBookings } from '@/stores/bookings';
import { useBookingDraft } from '@/stores/bookingDraft';
import { useI18n } from '@/i18n';

/**
 * Post-request status. Honest three-phase story (nothing is paid online):
 *  pending_kapar → amber "request sent, venue confirms within 24h"
 *  reserved      → "date held — pay the kapar at your visit by {payBy}"
 *  confirmed     → green "kapar received, the date is yours"
 * The screen subscribes to the booking, so the venue's actions flip the
 * state live (mocked by venueBot until the backend pushes it).
 * Back-gestures are disabled at the navigator: a sent request can't be
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

  // API mode: the server (and its demo bot) owns transitions — poll while
  // the couple watches this screen so the phases flip live.
  useEffect(() => {
    if (!API_MODE || !bookingId) return;
    const tick = () => {
      bookingApi
        .get(bookingId)
        .then((b) => {
          if (b) useBookings.getState().upsert(b);
        })
        .catch(() => {});
    };
    tick();
    const handle = setInterval(tick, 4_000);
    return () => clearInterval(handle);
  }, [bookingId]);

  useEffect(() => {
    resetDraft();
    Animated.sequence([
      Animated.spring(iconScale, { toValue: 1, speed: 14, bounciness: 12, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
    ]).start();
  }, [iconScale, contentAnim, resetDraft]);

  if (!booking) return <Redirect href="/(tabs)" />;

  const phase =
    booking.status === 'confirmed'
      ? ('confirmed' as const)
      : booking.status === 'reserved'
        ? ('held' as const)
        : booking.status === 'pending_kapar'
          ? ('sent' as const)
          : null;
  // Cancelled/expired bookings have no celebration story — show the detail page.
  if (!phase) return <Redirect href={`/booking/${booking.id}`} />;

  const confirmed = phase === 'confirmed';
  const payByLabel = booking.payByISO ? formatMediumDate(booking.payByISO, locale) : null;

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
              backgroundColor: phase === 'sent' ? colors.amberSoft : colors.mint,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: iconScale }],
            }}
          >
            <Ionicons
              name={phase === 'confirmed' ? 'checkmark' : phase === 'held' ? 'calendar' : 'paper-plane'}
              size={40}
              color={phase === 'sent' ? colors.amber : colors.success}
            />
          </Animated.View>
          <AppText variant="display" align="center">
            {phase === 'confirmed' ? t('status.confirmedTitle') : phase === 'held' ? t('status.heldTitle') : t('status.sentTitle')}
          </AppText>
          <AppText variant="body" color="secondary" align="center">
            {phase === 'confirmed'
              ? t('status.confirmedBody', { venue: booking.venueName, date: formatMediumDate(booking.eventDateISO, locale) })
              : phase === 'held'
                ? t('status.heldBody', { venue: booking.venueName, date: payByLabel ?? '—' })
                : t('status.sentBody', { venue: booking.venueName })}
          </AppText>
          <Badge
            label={
              phase === 'confirmed'
                ? t('status.confirmedChip')
                : phase === 'held' && payByLabel
                  ? t('status.heldChip', { date: payByLabel })
                  : t('status.awaiting')
            }
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
              {t(confirmed ? 'details.kaparPaidAtVenue' : 'status.kaparDueLine')}:{' '}
              <AppText variant="bodySmStrong" color="gold">{formatMkd(booking.kaparMkd, locale)}</AppText>
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

          {phase !== 'sent' ? (
            <View style={{ backgroundColor: colors.mint, borderRadius: radius.md, padding: spacing(3) }}>
              <AppText variant="bodySmStrong" style={{ color: colors.onMint }}>
                {t(phase === 'held' ? 'status.nextStep' : 'status.nextStepConfirmed')}
              </AppText>
            </View>
          ) : null}

          <Button title={t('common.done')} onPress={() => router.replace('/(tabs)/bookings')} variant="dark" fullWidth />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
