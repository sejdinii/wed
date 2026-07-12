import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { EmptyState } from '@/design/components/EmptyState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { RefundTimeline } from '@/components/RefundTimeline';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMkd } from '@/lib/money';
import { formatLongDate, todayISO } from '@/lib/dates';
import {
  refundPercentFor,
  REFUND_GRACE_DAYS,
  REFUND_GRACE_MIN_DAYS_BEFORE_EVENT,
  sortedRefundTiers,
} from '@/domain/kapar';
import { VENUES } from '@/data/venues';
import { useBookings } from '@/stores/bookings';
import { useI18n } from '@/i18n';

/**
 * Cancel booking — a dedicated confirmation page (Booking.com pattern), not a
 * throwaway dialog: the couple sees the exact outcome before committing.
 * Two situations:
 *  - kapar not paid yet (pending_kapar / reserved): cancelling is free, the
 *    date is simply released;
 *  - kapar paid (confirmed): the refund ladder applies. The platform holds no
 *    money, so the copy says what the VENUE returns per the kapar agreement.
 * The refund outcome is stamped onto the booking at cancellation so the
 * detail page keeps showing it unchanged later.
 */
export default function CancelBookingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();

  const booking = useBookings((s) => s.bookings.find((b) => b.id === bookingId));
  const transition = useBookings((s) => s.transition);
  const [cancelling, setCancelling] = useState(false);

  const cancellable =
    booking && (booking.status === 'pending_kapar' || booking.status === 'reserved' || booking.status === 'confirmed');

  if (!booking || !cancellable) {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle-outline"
          title={t('details.notFound')}
          body=""
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const venue = VENUES.find((v) => v.id === booking.venueId);
  const kaparPaid = Boolean(booking.kaparPaidAtISO);
  const today = todayISO();

  // Outcome preview — the venue's policy drives the numbers, grace included.
  const percent =
    kaparPaid && venue ? refundPercentFor(venue.kaparPolicy, booking.eventDateISO, today, booking.kaparPaidAtISO) : null;
  const refundMkd = percent !== null ? Math.round((booking.kaparMkd * percent) / 100) : null;
  const graceApplies =
    percent === 100 &&
    venue !== undefined &&
    booking.kaparPaidAtISO !== undefined &&
    // Would the ladder alone have given less? Then it was the grace window.
    refundPercentFor(venue.kaparPolicy, booking.eventDateISO, today, null) < 100;
  const noRefundBoundary = venue ? sortedRefundTiers(venue.kaparPolicy).find((tier) => tier.refundPercent > 0)?.minDaysBeforeEvent : undefined;

  const confirmCancel = () => {
    if (cancelling) return;
    setCancelling(true);
    haptic.select();
    const now = new Date().toISOString();
    transition(
      booking.id,
      'cancelled_by_couple',
      now,
      percent !== null && refundMkd !== null ? { refund: { percent, amountMkd: refundMkd } } : undefined,
    );
    router.replace(`/booking/${booking.id}`);
  };

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
          {t('cancel.title')}
        </AppText>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing(4), gap: spacing(4), paddingBottom: spacing(10) }}>
        {/* What is being cancelled */}
        <View style={{ gap: spacing(1) }}>
          <AppText variant="title">{booking.venueName}</AppText>
          <AppText variant="bodySm" color="secondary">
            {formatLongDate(booking.eventDateISO, locale)} · {t('bookings.guestCount', { count: booking.guestCount })}
          </AppText>
        </View>

        {/* Outcome preview */}
        {!kaparPaid ? (
          <View style={{ backgroundColor: colors.mint, borderRadius: radius.md, padding: spacing(3.5), gap: spacing(1.5) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
              <Ionicons name="checkmark-circle" size={17} color={colors.success} />
              <AppText variant="bodyStrong" style={{ color: colors.onMint }}>
                {t('cancel.freeTitle')}
              </AppText>
            </View>
            <AppText variant="bodySm" style={{ color: colors.onMint }}>
              {t('cancel.freeBody')}
            </AppText>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: percent && percent > 0 ? colors.mint : colors.dangerSoft,
              borderRadius: radius.md,
              padding: spacing(3.5),
              gap: spacing(1.5),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
              <Ionicons
                name={percent && percent > 0 ? 'cash-outline' : 'alert-circle'}
                size={17}
                color={percent && percent > 0 ? colors.success : colors.danger}
              />
              <AppText variant="bodyStrong" style={{ color: percent && percent > 0 ? colors.onMint : colors.danger }}>
                {t('cancel.refundTitle')}
              </AppText>
            </View>
            <AppText variant="bodySm" style={{ color: percent && percent > 0 ? colors.onMint : colors.danger }}>
              {percent && percent > 0
                ? t('cancel.refundBody', {
                    venue: booking.venueName,
                    amount: formatMkd(refundMkd ?? 0, locale),
                    kapar: formatMkd(booking.kaparMkd, locale),
                    percent,
                  })
                : t('cancel.noRefundBody', {
                    days: noRefundBoundary ?? 30,
                    venue: booking.venueName,
                    kapar: formatMkd(booking.kaparMkd, locale),
                  })}
            </AppText>
            {graceApplies ? (
              <AppText variant="bodySm" style={{ color: colors.onMint }}>
                {t('cancel.graceNote', { days: REFUND_GRACE_DAYS, minDays: REFUND_GRACE_MIN_DAYS_BEFORE_EVENT })}
              </AppText>
            ) : null}
          </View>
        )}

        {/* The full ladder for context */}
        {venue ? (
          <View style={{ gap: spacing(2.5) }}>
            <AppText variant="subheading">{t('details.cancellationTerms')}</AppText>
            <RefundTimeline policy={venue.kaparPolicy} eventDateISO={booking.eventDateISO} />
          </View>
        ) : null}

        <AppText variant="bodySm" color="tertiary">
          {t('cancel.irreversible')}
        </AppText>
      </ScrollView>

      {/* Actions */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          padding: spacing(4),
          gap: spacing(2.5),
          backgroundColor: colors.surface,
        }}
      >
        <Button title={t('cancel.confirmCta')} onPress={confirmCancel} loading={cancelling} variant="danger" fullWidth />
        <Button title={t('cancel.keepCta')} onPress={() => router.back()} variant="ghost" fullWidth />
      </View>
    </Screen>
  );
}
