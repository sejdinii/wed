import React, { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Badge } from '@/design/components/Badge';
import { Button } from '@/design/components/Button';
import { EmptyState } from '@/design/components/EmptyState';
import { ErrorState } from '@/design/components/ErrorState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { Skeleton } from '@/design/components/Skeleton';
import { BrandedImage } from '@/components/BrandedImage';
import { useTheme } from '@/design/theme';
import { radius, spacing, typeScale } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMediumDate } from '@/lib/dates';
import { formatMkd } from '@/lib/money';
import { REQUEST_TTL_HOURS, todayISO, toISODate } from '@/domain/kapar';
import type { Booking, BookingStatus, Venue } from '@/domain/types';
import { API_MODE } from '@/data/api';
import { isNotificationVisible, notificationApi } from '@/data/notificationApi';
import { TransitionError, vendorApi } from '@/data/vendorApi';
import { useIsAuthenticated, usePreferences } from '@/stores/preferences';
import { useI18n } from '@/i18n';

/** Statuses worth surfacing in "today's activity" (critic #9) — terminal or
 * hold-confirmed transitions, derived from the already-loaded bookings'
 * timeline. `expired` is deliberately excluded: it's a lapse, not an event
 * worth celebrating or drawing the eye to in an activity strip. */
const ACTIVITY_STATUSES: BookingStatus[] = ['confirmed', 'reserved', 'cancelled_by_couple', 'cancelled_by_venue'];

/** Hours left before an unanswered request auto-expires (server enforces the actual expiry). */
function hoursLeftToRespond(createdAtISO: string, nowMs: number): number {
  const deadlineMs = new Date(createdAtISO).getTime() + REQUEST_TTL_HOURS * 3_600_000;
  // Clamp: a request stamped a beat after our nowMs snapshot must never
  // display more than the SLA itself ("25h left" on a 24h window).
  return Math.min(REQUEST_TTL_HOURS, (deadlineMs - nowMs) / 3_600_000);
}

type CardAction = 'confirm' | 'decline' | 'kapar';

/**
 * Business mode · Today — the vendor's landing feed (Pulse pattern: requests,
 * visits and messages in one stream, never a stats page first). Wave 3 added
 * the listing card + publish switch; Wave 4 makes the request feed actionable
 * (Booking.com Pulse request-to-book pattern — confirm/decline within 24h).
 */
export default function BusinessTodayScreen() {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const authUser = usePreferences((s) => s.authUser);

  const [venue, setVenue] = useState<Venue | null | 'none'>(null);
  const [requests, setRequests] = useState<Booking[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((n) => n + 1);

  // Request-inbox action state (Wave 4). Keyed by booking id so multiple
  // cards can be mid-action independently.
  const [busy, setBusy] = useState<{ id: string; action: CardAction } | null>(null);
  const [cardErrors, setCardErrors] = useState<Record<string, boolean>>({});
  // Critic #10: a 409 (someone else already transitioned this booking) is NOT
  // a generic failure — it means our view was stale. Tracked separately so the
  // card shows "this changed — updated" rather than blaming the connection.
  const [stateChangedIds, setStateChangedIds] = useState<Record<string, boolean>>({});
  const [decliningIds, setDecliningIds] = useState<Record<string, boolean>>({});
  const [declineReasons, setDeclineReasons] = useState<Record<string, string>>({});

  // Refreshes the SLA line ("Xh left to respond") without a full data reload.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const handle = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(handle);
  }, []);

  // The bell (Wave 5) — same honest, server-backed unread count as the
  // couple-side header; absent in mock mode (no backend to poll).
  const authed = useIsAuthenticated();
  const notifConfirm = usePreferences((s) => s.notifConfirm);
  const notifMessages = usePreferences((s) => s.notifMessages);
  const notifRefund = usePreferences((s) => s.notifRefund);
  const [unreadBadge, setUnreadBadge] = useState(0);

  const refreshBadge = useCallback(async () => {
    if (!API_MODE || !authed) return;
    try {
      const { items } = await notificationApi.list();
      const prefs = { notifConfirm, notifMessages, notifRefund };
      setUnreadBadge(items.filter((i) => isNotificationVisible(i.kind, prefs) && !i.readAtISO).length);
    } catch {
      // Transient failure — keep showing the last known count rather than flashing 0.
    }
  }, [authed, notifConfirm, notifMessages, notifRefund]);

  useEffect(() => {
    if (!API_MODE || !authed) return;
    refreshBadge();
    const handle = setInterval(refreshBadge, 60_000);
    return () => clearInterval(handle);
  }, [refreshBadge, authed]);

  const refresh = useCallback(async () => {
    const mine = await vendorApi.myVenue();
    setVenue(mine ?? 'none');
    setRequests(mine ? await vendorApi.bookings() : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    (async () => {
      try {
        await refresh();
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, attempt]);

  // A request arriving while the vendor sits on Today must appear when they
  // come back to the screen — the inbox is not a one-shot snapshot (critic).
  // Badge + feed both refetch on focus; failures keep the last-known state.
  useFocusEffect(
    useCallback(() => {
      refreshBadge();
      refresh().catch(() => {});
    }, [refreshBadge, refresh]),
  );

  const togglePublish = async () => {
    if (!venue || venue === 'none' || publishing) return;
    setPublishing(true);
    try {
      setVenue(await vendorApi.setPublished(!venue.published));
      haptic.success();
    } catch {
      haptic.error();
    } finally {
      setPublishing(false);
    }
  };

  const activeRequests = requests.filter((b) => b.status === 'pending_kapar' || b.status === 'reserved');

  // Today's activity (critic #9): after Kapar received the booking leaves the
  // actionable feed above, but the vendor's biggest win shouldn't make Today
  // collapse straight to an empty state. Derived from the same already-loaded
  // `requests` — no new endpoint. "Today" = the LAST timeline event's local
  // calendar day matches now, not the event date.
  const todayActivity = requests
    .map((b) => {
      const last = b.timeline[b.timeline.length - 1];
      if (!last || !ACTIVITY_STATUSES.includes(last.status)) return null;
      if (toISODate(new Date(last.at)) !== todayISO()) return null;
      return { booking: b, status: last.status, at: last.at };
    })
    .filter((x): x is { booking: Booking; status: BookingStatus; at: string } => x !== null)
    .sort((a, b) => (a.at < b.at ? 1 : -1));

  const clearStateChanged = (id: string) =>
    setStateChangedIds((s) => {
      if (!(id in s)) return s;
      const next = { ...s };
      delete next[id];
      return next;
    });

  const runAction = async (booking: Booking, action: CardAction, call: () => Promise<Booking>) => {
    setBusy({ id: booking.id, action });
    setCardErrors((e) => ({ ...e, [booking.id]: false }));
    clearStateChanged(booking.id);
    try {
      const updated = await call();
      setRequests((rs) => rs.map((r) => (r.id === booking.id ? updated : r)));
      if (action === 'decline') {
        setDecliningIds((s) => {
          const next = { ...s };
          delete next[booking.id];
          return next;
        });
      }
      haptic.success();
    } catch (err) {
      if (err instanceof TransitionError) {
        // Someone else already moved this booking (a second tab, or the TTL
        // sweep) — our card was stale, not broken. Refetch so it re-renders
        // its true state instead of showing a generic connection error.
        haptic.error();
        setStateChangedIds((s) => ({ ...s, [booking.id]: true }));
        refresh().catch(() => {});
        setTimeout(() => clearStateChanged(booking.id), 6_000);
      } else {
        haptic.error();
        setCardErrors((e) => ({ ...e, [booking.id]: true }));
      }
    } finally {
      setBusy(null);
    }
  };

  const onConfirm = (booking: Booking) => void runAction(booking, 'confirm', () => vendorApi.confirmBooking(booking.id));
  const onKaparReceived = (booking: Booking) => void runAction(booking, 'kapar', () => vendorApi.markKaparReceived(booking.id));
  const onDecline = (booking: Booking) => {
    const reason = declineReasons[booking.id]?.trim();
    void runAction(booking, 'decline', () => vendorApi.declineBooking(booking.id, reason ? reason : undefined));
  };
  const openDecline = (id: string) => {
    setCardErrors((e) => ({ ...e, [id]: false }));
    setDecliningIds((s) => ({ ...s, [id]: true }));
  };
  const closeDecline = (id: string) => {
    setDecliningIds((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
  };

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
        {/* The bell (Wave 5): real server-backed unread count. Absent in
            mock mode — there's no backend to earn a badge from. */}
        {API_MODE && authed ? (
          <PressableScale
            onPress={() => router.push('/notifications')}
            hapticFeedback="select"
            accessibilityRole="button"
            accessibilityLabel={t('notif.title')}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unreadBadge > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: colors.danger,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 3,
                }}
              >
                <AppText style={{ color: '#FFFFFF', fontSize: 9, lineHeight: 11 }}>
                  {unreadBadge > 99 ? '99+' : String(unreadBadge)}
                </AppText>
              </View>
            ) : null}
          </PressableScale>
        ) : null}
        <PressableScale
          onPress={() => router.replace('/(tabs)/profile')}
          hapticFeedback="select"
          accessibilityRole="button"
          accessibilityLabel={t('business.switchBack')}
        >
          <Ionicons name="swap-horizontal" size={22} color={colors.primary} />
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }} showsVerticalScrollIndicator={false}>
        {loadFailed ? (
          <ErrorState onRetry={retry} />
        ) : venue === null ? (
          <View style={{ gap: spacing(3) }}>
            <Skeleton height={180} radius={radius.lg} />
            <Skeleton height={90} radius={radius.lg} />
          </View>
        ) : venue === 'none' ? (
          <EmptyState
            icon="business-outline"
            title={t('vendor.noVenueTitle')}
            body={t('vendor.noVenueBody')}
            actionLabel={t('vendor.createCta')}
            onAction={() => router.push('/create-venue')}
          />
        ) : (
          <>
            {/* The listing card */}
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface }}>
              <BrandedImage uri={venue.photos[0]} style={{ width: '100%', height: 140 }} contentFit="cover" />
              <View style={{ padding: spacing(3.5), gap: spacing(2) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                  <AppText variant="subheading" style={{ flex: 1 }} numberOfLines={1}>
                    {venue.name}
                  </AppText>
                  <Badge
                    label={venue.published ? t('vendor.publishedChip') : t('vendor.draftChip')}
                    tone={venue.published ? 'success' : 'neutral'}
                    dot
                  />
                </View>
                <AppText variant="bodySm" color="secondary">
                  {t(`city.${venue.city}`)} · {t(`venueTypeShort.${venue.venueType}`)} · {venue.capacityMin}–{venue.capacityMax} {t('common.guests')}
                </AppText>
                {!venue.published ? (
                  <AppText variant="bodySm" color="secondary">
                    {t('vendor.draftHint')}
                  </AppText>
                ) : null}
                {/* flexWrap + sm: four md buttons overflowed 390px screens —
                    two of the four actions were unreachable (critic, W4 pass;
                    same collapsed-CTA class as b07b322). */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2.5), marginTop: spacing(1) }}>
                  <Button
                    title={venue.published ? t('vendor.unpublish') : t('vendor.publish')}
                    onPress={togglePublish}
                    loading={publishing}
                    variant={venue.published ? 'outline' : 'primary'}
                    size="sm"
                  />
                  <Button title={t('vendor.calendarTitle')} onPress={() => router.push('/calendar')} variant="dark" size="sm" />
                  <Button title={t('vendor.bookingsTitle')} onPress={() => router.push('/venue-bookings')} variant="outline" size="sm" />
                  <Button title={t('vendor.viewAsCouple')} onPress={() => router.push(`/venue/${venue.id}`)} variant="ghost" size="sm" />
                </View>
              </View>
            </View>

            {/* Today feed — the request inbox (Wave 4: confirm/decline/kapar-received) */}
            <View style={{ gap: spacing(2.5) }}>
              <AppText variant="title">{t('business.todayTitle')}</AppText>
              {activeRequests.length === 0 ? (
                <EmptyState icon="file-tray-outline" title={t('vendor.noRequestsTitle')} body={t('vendor.noRequestsBody')} />
              ) : (
                activeRequests.map((b) => {
                  const isBusyCard = busy?.id === b.id;
                  const isDeclining = !!decliningIds[b.id];
                  const hoursLeft = hoursLeftToRespond(b.createdAtISO, nowMs);
                  const isExpiredUnanswered = b.status === 'pending_kapar' && hoursLeft <= 0;
                  // Critic #17: this is the card's most urgent fact — bumped
                  // from a caption to bodySmStrong, amber inside 12h, danger inside 1h.
                  const slaColor = hoursLeft < 1 ? colors.danger : hoursLeft < 12 ? colors.amber : colors.textSecondary;
                  return (
                    <View
                      key={b.id}
                      testID={`vendor-request-${b.id}`}
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
                        <Badge label={t(`vendorBookingStatus.${b.status}`)} tone={b.status === 'pending_kapar' ? 'warning' : 'gold'} dot />
                      </View>
                      <AppText variant="bodySm" color="secondary">
                        {formatMediumDate(b.eventDateISO, locale)} · {t('bookings.guestCount', { count: b.guestCount })} · {b.confirmationCode}
                      </AppText>

                      {/* Critic #5: the vendor decides blind — no estimate/kapar
                          value on the card at all. Money is server-computed;
                          this just displays it. */}
                      <AppText variant="bodySm" color="secondary">
                        {t('details.estimateLine', { guests: b.guestCount })}: {formatMkd(b.estimatedTotalMkd, locale)} ·{' '}
                        {t('details.kaparDue')}: {formatMkd(b.kaparMkd, locale)}
                      </AppText>

                      {/* Critic #5: Viber-first market — a tappable phone row,
                          not just printed digits, at the 44px touch floor. */}
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

                      {b.status === 'pending_kapar' && !isDeclining && hoursLeft > 0 ? (
                        <AppText variant="bodySmStrong" style={{ color: slaColor }}>
                          {t('vendor.slaLeft', { hours: Math.max(1, Math.ceil(hoursLeft)) })}
                        </AppText>
                      ) : null}

                      {b.status === 'reserved' && b.payByISO ? (
                        <AppText variant="bodySm" color="secondary">
                          {t('vendor.payByLine', { date: formatMediumDate(b.payByISO, locale) })}
                        </AppText>
                      ) : null}

                      {b.status === 'pending_kapar' ? (
                        isExpiredUnanswered ? (
                          // Critic #10 edge case: a 24h-lapsed request would
                          // just 409 on Confirm/Decline — replace the dead
                          // buttons with an honest inert note instead.
                          <AppText variant="bodySm" color="secondary">
                            {t('vendorBookingStatus.expired')}
                          </AppText>
                        ) : isDeclining ? (
                          <View style={{ gap: spacing(2) }}>
                            <TextInput
                              value={declineReasons[b.id] ?? ''}
                              onChangeText={(v) => setDeclineReasons((r) => ({ ...r, [b.id]: v }))}
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
                                title={t('vendor.declineSend')}
                                onPress={() => onDecline(b)}
                                loading={isBusyCard && busy?.action === 'decline'}
                                disabled={isBusyCard && busy?.action !== 'decline'}
                                variant="danger"
                                size="sm"
                              />
                              <Button
                                title={t('common.back')}
                                onPress={() => closeDecline(b.id)}
                                disabled={isBusyCard}
                                variant="ghost"
                                size="sm"
                              />
                            </View>
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', gap: spacing(2.5) }}>
                            <Button
                              title={t('vendor.confirmAction')}
                              onPress={() => onConfirm(b)}
                              loading={isBusyCard && busy?.action === 'confirm'}
                              disabled={isBusyCard && busy?.action !== 'confirm'}
                              variant="primary"
                              size="sm"
                            />
                            <Button
                              title={t('vendor.declineAction')}
                              onPress={() => openDecline(b.id)}
                              disabled={isBusyCard}
                              variant="outline"
                              size="sm"
                            />
                          </View>
                        )
                      ) : null}

                      {b.status === 'reserved' ? (
                        <View style={{ flexDirection: 'row', gap: spacing(2.5) }}>
                          <Button
                            title={t('vendor.kaparReceivedAction')}
                            onPress={() => onKaparReceived(b)}
                            loading={isBusyCard && busy?.action === 'kapar'}
                            disabled={isBusyCard && busy?.action !== 'kapar'}
                            variant="mint"
                            size="sm"
                          />
                        </View>
                      ) : null}

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
                  );
                })
              )}
            </View>

            {/* Today's activity (critic #9) — a lightweight, read-only strip
                so a Kapar-received win (or any same-day transition) doesn't
                make Today collapse straight to "No new requests". */}
            {todayActivity.length > 0 ? (
              <View style={{ gap: spacing(2) }}>
                <AppText variant="subheading">{t('vendor.activityTitle')}</AppText>
                {todayActivity.map(({ booking: b, status }) => {
                  const icon = status === 'cancelled_by_couple' || status === 'cancelled_by_venue' ? '✕' : '✓';
                  return (
                    <PressableScale
                      key={`${b.id}-${status}`}
                      testID={`vendor-activity-${b.id}`}
                      onPress={() => router.push('/venue-bookings')}
                      hapticFeedback="select"
                      accessibilityRole="button"
                      style={{ minHeight: 44, justifyContent: 'center' }}
                    >
                      <AppText variant="bodySm" color="secondary">
                        {icon} {t(`vendorBookingStatus.${status}`)} — {b.contactName}, {formatMediumDate(b.eventDateISO, locale)}
                      </AppText>
                    </PressableScale>
                  );
                })}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
