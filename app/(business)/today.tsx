import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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
import { REQUEST_TTL_HOURS } from '@/domain/kapar';
import type { Booking, Venue } from '@/domain/types';
import { vendorApi } from '@/data/vendorApi';
import { usePreferences } from '@/stores/preferences';
import { useI18n } from '@/i18n';

/** Hours left before an unanswered request auto-expires (server enforces the actual expiry). */
function hoursLeftToRespond(createdAtISO: string, nowMs: number): number {
  const deadlineMs = new Date(createdAtISO).getTime() + REQUEST_TTL_HOURS * 3_600_000;
  return (deadlineMs - nowMs) / 3_600_000;
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
  const [decliningIds, setDecliningIds] = useState<Record<string, boolean>>({});
  const [declineReasons, setDeclineReasons] = useState<Record<string, string>>({});

  // Refreshes the SLA line ("Xh left to respond") without a full data reload.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const handle = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(handle);
  }, []);

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

  const runAction = async (booking: Booking, action: CardAction, call: () => Promise<Booking>) => {
    setBusy({ id: booking.id, action });
    setCardErrors((e) => ({ ...e, [booking.id]: false }));
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
    } catch {
      haptic.error();
      setCardErrors((e) => ({ ...e, [booking.id]: true }));
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
                <View style={{ flexDirection: 'row', gap: spacing(2.5), marginTop: spacing(1) }}>
                  <Button
                    title={venue.published ? t('vendor.unpublish') : t('vendor.publish')}
                    onPress={togglePublish}
                    loading={publishing}
                    variant={venue.published ? 'outline' : 'primary'}
                    size="md"
                  />
                  <Button title={t('vendor.calendarTitle')} onPress={() => router.push('/calendar')} variant="dark" size="md" />
                  <Button title={t('vendor.bookingsTitle')} onPress={() => router.push('/bookings')} variant="outline" size="md" />
                  <Button title={t('vendor.viewAsCouple')} onPress={() => router.push(`/venue/${venue.id}`)} variant="ghost" size="md" />
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
                  const slaColor = hoursLeft < 1 ? colors.danger : hoursLeft < 6 ? colors.amber : colors.textSecondary;
                  return (
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
                        <Badge label={t(`bookingStatus.${b.status}`)} tone={b.status === 'pending_kapar' ? 'warning' : 'gold'} dot />
                      </View>
                      <AppText variant="bodySm" color="secondary">
                        {formatMediumDate(b.eventDateISO, locale)} · {t('bookings.guestCount', { count: b.guestCount })} · {b.confirmationCode}
                      </AppText>

                      {b.status === 'pending_kapar' && !isDeclining && hoursLeft > 0 ? (
                        <AppText variant="caption" style={{ color: slaColor }}>
                          {t('vendor.slaLeft', { hours: Math.max(1, Math.ceil(hoursLeft)) })}
                        </AppText>
                      ) : null}

                      {b.status === 'reserved' && b.payByISO ? (
                        <AppText variant="bodySm" color="secondary">
                          {t('vendor.payByLine', { date: formatMediumDate(b.payByISO, locale) })}
                        </AppText>
                      ) : null}

                      {b.status === 'pending_kapar' ? (
                        isDeclining ? (
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

                      {cardErrors[b.id] ? (
                        <AppText variant="bodySm" color="danger">
                          {t('error.body')}
                        </AppText>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
