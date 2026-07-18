import React, { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Badge, type BadgeTone } from '@/design/components/Badge';
import { Button } from '@/design/components/Button';
import { EmptyState } from '@/design/components/EmptyState';
import { ErrorState } from '@/design/components/ErrorState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { SegmentedControl } from '@/design/components/SegmentedControl';
import { Skeleton } from '@/design/components/Skeleton';
import { useTheme } from '@/design/theme';
import { radius, spacing, typeScale } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { parse as parseDeclineReason } from '@/lib/declineReason';
import { formatMediumDate } from '@/lib/dates';
import { formatMkd } from '@/lib/money';
import type { Booking, BookingStatus } from '@/domain/types';
import { TransitionError, vendorApi } from '@/data/vendorApi';
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

  // Response-rate stat (critic BACKLOG item) — null until a successful fetch
  // resolves a real number; the caption only renders on a non-null value.
  const [responseRate, setResponseRate] = useState<number | null>(null);

  // Focus refetch (critic): silent — keeps the last list on failure and never
  // flashes the skeleton for a background refresh.
  useFocusEffect(
    useCallback(() => {
      vendorApi.bookings().then(setBookings).catch(() => {});
      vendorApi.stats().then((s) => setResponseRate(s.responseRate30d)).catch(() => {});
    }, []),
  );

  // Vendor cancel (Wave 5 completion) — per-card busy/error/inline-reason state,
  // same shape as today.tsx's decline flow.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cardErrors, setCardErrors] = useState<Record<string, boolean>>({});
  // Critic #10, same honesty fix as Today: a 409 means the booking moved
  // under us (TTL sweep, or another tab), not a broken connection.
  const [stateChangedIds, setStateChangedIds] = useState<Record<string, boolean>>({});
  const [cancellingIds, setCancellingIds] = useState<Record<string, boolean>>({});
  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>({});

  const openCancel = (id: string) => {
    setCardErrors((e) => ({ ...e, [id]: false }));
    setCancellingIds((s) => ({ ...s, [id]: true }));
  };
  const closeCancel = (id: string) => {
    setCancellingIds((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
  };
  const onCancel = async (booking: Booking) => {
    const reason = cancelReasons[booking.id]?.trim();
    setBusyId(booking.id);
    setCardErrors((e) => ({ ...e, [booking.id]: false }));
    setStateChangedIds((s) => {
      if (!(booking.id in s)) return s;
      const next = { ...s };
      delete next[booking.id];
      return next;
    });
    try {
      const updated = await vendorApi.cancelBooking(booking.id, reason ? reason : undefined);
      // The card moves to History on its own: it's the same `bookings` array,
      // re-filtered by status into upcoming/history below.
      setBookings((bs) => (bs ?? []).map((b) => (b.id === booking.id ? updated : b)));
      closeCancel(booking.id);
      haptic.success();
    } catch (err) {
      haptic.error();
      if (err instanceof TransitionError) {
        setStateChangedIds((s) => ({ ...s, [booking.id]: true }));
        vendorApi.bookings().then(setBookings).catch(() => {});
        setTimeout(
          () =>
            setStateChangedIds((s) => {
              if (!(booking.id in s)) return s;
              const next = { ...s };
              delete next[booking.id];
              return next;
            }),
          6_000,
        );
      } else {
        setCardErrors((e) => ({ ...e, [booking.id]: true }));
      }
    } finally {
      setBusyId(null);
    }
  };

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

      {/* Response-rate stat (critic BACKLOG item) — only ever a caption, and
          only once ≥3 trailing-30-day requests give it real precision. */}
      {responseRate !== null ? (
        <View style={{ paddingHorizontal: spacing(4), paddingTop: spacing(2) }}>
          <AppText variant="caption" color="secondary">
            {t('vendor.responseRateCaption', { percent: responseRate })}
          </AppText>
        </View>
      ) : null}

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
              testID={`vendor-dashboard-row-${b.id}`}
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
                <Badge label={t(`vendorBookingStatus.${b.status}`)} tone={STATUS_TONE[b.status]} dot />
              </View>
              {/* Critic #5: a value column — the vendor sees what a row is
                  worth without opening it. */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing(2) }}>
                <AppText variant="bodySm" color="secondary" style={{ flex: 1 }}>
                  {formatMediumDate(b.eventDateISO, locale)} · {t('bookings.guestCount', { count: b.guestCount })}
                  {b.hallName ? ` · ${b.hallName}` : ''}
                </AppText>
                <AppText variant="bodySmStrong">{formatMkd(b.estimatedTotalMkd, locale)}</AppText>
              </View>
              <AppText variant="caption" color="tertiary">
                {b.confirmationCode}
              </AppText>
              {/* Critic #5: the same tappable phone row as Today's cards. */}
              <PressableScale
                onPress={() => Linking.openURL(`tel:${b.contactPhone}`).catch(() => {})}
                hapticFeedback="select"
                accessibilityRole="button"
                accessibilityLabel={t('vendor.callAction', { phone: b.contactPhone })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), minHeight: 44 }}
              >
                <Ionicons name="call-outline" size={16} color={colors.primary} />
                <AppText variant="bodySmStrong" style={{ color: colors.primary }}>
                  {b.contactPhone}
                </AppText>
              </PressableScale>

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

              {b.cancelReason ? (() => {
                const parsed = parseDeclineReason(b.cancelReason);
                const display = parsed.categoryKey
                  ? [t(`declineCat.${parsed.categoryKey}`), parsed.text].filter(Boolean).join(' — ')
                  : parsed.text;
                return (
                  <AppText variant="caption" color="secondary">
                    {t('vendor.cancelReasonLabel', { reason: display })}
                  </AppText>
                );
              })() : null}

              {segment === 'upcoming' && (b.status === 'reserved' || b.status === 'confirmed') ? (
                cancellingIds[b.id] ? (
                  <View style={{ gap: spacing(2), marginTop: spacing(1) }}>
                    <AppText variant="bodySm" style={{ color: colors.danger }}>
                      {t('vendor.cancelConfirmBody', { name: b.contactName })}
                    </AppText>
                    <TextInput
                      value={cancelReasons[b.id] ?? ''}
                      onChangeText={(v) => setCancelReasons((r) => ({ ...r, [b.id]: v }))}
                      placeholder={t('vendor.declineReasonPlaceholder')}
                      placeholderTextColor={colors.textTertiary}
                      accessibilityLabel={t('vendor.declineReasonPlaceholder')}
                      style={{
                        ...typeScale.body,
                        color: colors.text,
                        borderWidth: 1.5,
                        borderColor: colors.borderStrong,
                        borderRadius: radius.md,
                        paddingHorizontal: spacing(3.5),
                        height: 44,
                      }}
                    />
                    <View style={{ flexDirection: 'row', gap: spacing(2.5) }}>
                      <Button
                        title={t('vendor.cancelSend')}
                        onPress={() => onCancel(b)}
                        loading={busyId === b.id}
                        disabled={busyId !== null && busyId !== b.id}
                        variant="danger"
                        size="sm"
                      />
                      <Button title={t('common.back')} onPress={() => closeCancel(b.id)} disabled={busyId === b.id} variant="ghost" size="sm" />
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: spacing(2.5), marginTop: spacing(1) }}>
                    <Button title={t('vendor.cancelBookingAction')} onPress={() => openCancel(b.id)} variant="outline" size="sm" />
                    <Button
                      title={t('vendor.messageAction')}
                      onPress={() => router.push(`/messages/${b.id}?as=vendor`)}
                      variant="ghost"
                      size="sm"
                    />
                  </View>
                )
              ) : (
                <View style={{ marginTop: spacing(1) }}>
                  <Button
                    title={t('vendor.messageAction')}
                    onPress={() => router.push(`/messages/${b.id}?as=vendor`)}
                    variant="ghost"
                    size="sm"
                  />
                </View>
              )}

              {stateChangedIds[b.id] ? (
                <AppText variant="bodySm" color="secondary">
                  {t('vendor.stateChanged')}
                </AppText>
              ) : cardErrors[b.id] ? (
                <AppText variant="bodySm" color="danger">
                  {t('vendor.actionFailed')}
                </AppText>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
