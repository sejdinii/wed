import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Badge, type BadgeTone } from '@/design/components/Badge';
import { EmptyState } from '@/design/components/EmptyState';
import { ErrorState } from '@/design/components/ErrorState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { SegmentedControl } from '@/design/components/SegmentedControl';
import { Skeleton } from '@/design/components/Skeleton';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { formatMediumDate } from '@/lib/dates';
import { formatMkd } from '@/lib/money';
import type { Booking, BookingStatus } from '@/domain/types';
import { vendorApi } from '@/data/vendorApi';
import { useI18n } from '@/i18n';

type Segment = 'upcoming' | 'history';

const UPCOMING_STATUSES: BookingStatus[] = ['pending_kapar', 'reserved', 'confirmed'];
const HISTORY_STATUSES: BookingStatus[] = ['completed', 'expired', 'cancelled_by_couple', 'cancelled_by_venue'];

// Mirrors the tone convention established for booking status chips (see
// (tabs)/bookings.tsx) — kept local since screens don't export shared consts.
const STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  pending_kapar: 'warning',
  reserved: 'warning',
  confirmed: 'success',
  completed: 'neutral',
  cancelled_by_couple: 'danger',
  cancelled_by_venue: 'danger',
  expired: 'neutral',
};

/**
 * Vendor bookings dashboard (Wave 4) — Booking.com "reservation list" mapping:
 * upcoming (still actionable/live) vs. history (settled one way or another).
 * Loads once on mount; today.tsx's inbox already covers the live actions, so
 * this screen is read-only.
 */
export default function VendorBookingsScreen() {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();

  const [segment, setSegment] = useState<Segment>('upcoming');
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((n) => n + 1);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    (async () => {
      try {
        const result = await vendorApi.bookings();
        if (!cancelled) setBookings(result);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const visible = (bookings ?? [])
    .filter((b) => (segment === 'upcoming' ? UPCOMING_STATUSES.includes(b.status) : HISTORY_STATUSES.includes(b.status)))
    .sort((a, b) =>
      segment === 'upcoming'
        ? a.eventDateISO < b.eventDateISO
          ? -1
          : 1
        : a.eventDateISO < b.eventDateISO
          ? 1
          : -1,
    );

  return (
    <Screen>
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
          {t('vendor.bookingsTitle')}
        </AppText>
        <View style={{ width: 22 }} />
      </View>

      <View style={{ paddingHorizontal: spacing(4), paddingTop: spacing(3) }}>
        <SegmentedControl
          options={[
            { key: 'upcoming', label: t('vendor.segUpcoming') },
            { key: 'history', label: t('vendor.segHistory') },
          ]}
          value={segment}
          onChange={setSegment}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing(4), gap: spacing(3) }} showsVerticalScrollIndicator={false}>
        {loadFailed ? (
          <ErrorState onRetry={retry} secondaryLabel={t('common.back')} onSecondary={() => router.back()} />
        ) : bookings === null ? (
          <View style={{ gap: spacing(3) }}>
            <Skeleton height={110} radius={radius.md} />
            <Skeleton height={110} radius={radius.md} />
            <Skeleton height={110} radius={radius.md} />
          </View>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={segment === 'upcoming' ? 'file-tray-outline' : 'time-outline'}
            title={segment === 'upcoming' ? t('vendor.emptyUpcomingTitle') : t('vendor.emptyHistoryTitle')}
            body={segment === 'upcoming' ? t('vendor.emptyUpcomingBody') : t('vendor.emptyHistoryBody')}
          />
        ) : (
          visible.map((b) => (
            <View
              key={b.id}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                padding: spacing(3.5),
                gap: spacing(1.5),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                  {b.contactName}
                </AppText>
                <Badge label={t(`bookingStatus.${b.status}`)} tone={STATUS_TONE[b.status]} dot />
              </View>
              <AppText variant="bodySm" color="secondary">
                {formatMediumDate(b.eventDateISO, locale)} · {t('bookings.guestCount', { count: b.guestCount })}
                {b.hallName ? ` · ${b.hallName}` : ''}
              </AppText>
              <AppText variant="caption" color="tertiary">
                {b.confirmationCode}
              </AppText>

              {b.refund ? (
                <View style={{ backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: spacing(2.5) }}>
                  <AppText variant="bodySm" style={{ color: colors.danger }}>
                    {t('vendor.refundOwed', {
                      amount: formatMkd(b.refund.amountMkd, locale),
                      name: b.contactName,
                      percent: b.refund.percent,
                    })}
                  </AppText>
                </View>
              ) : null}

              {b.cancelReason ? (
                <AppText variant="caption" color="secondary">
                  {t('vendor.cancelReasonLabel', { reason: b.cancelReason })}
                </AppText>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
