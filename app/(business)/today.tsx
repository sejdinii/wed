import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
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
import { radius, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMediumDate } from '@/lib/dates';
import type { Booking, Venue } from '@/domain/types';
import { vendorApi } from '@/data/vendorApi';
import { usePreferences } from '@/stores/preferences';
import { useI18n } from '@/i18n';

/**
 * Business mode · Today — the vendor's landing feed (Pulse pattern: requests,
 * visits and messages in one stream, never a stats page first). Wave 3 adds
 * the listing card + publish switch; the request feed is read-only until the
 * Wave-4 inbox lands confirm/decline.
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
                  <Button title={t('vendor.viewAsCouple')} onPress={() => router.push(`/venue/${venue.id}`)} variant="ghost" size="md" />
                </View>
              </View>
            </View>

            {/* Today feed — read-only until the Wave-4 inbox */}
            <View style={{ gap: spacing(2.5) }}>
              <AppText variant="title">{t('business.todayTitle')}</AppText>
              {activeRequests.length === 0 ? (
                <EmptyState icon="file-tray-outline" title={t('vendor.noRequestsTitle')} body={t('vendor.noRequestsBody')} />
              ) : (
                activeRequests.map((b) => (
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
                    {/* Wave 4: confirm / decline actions land here. */}
                    <AppText variant="caption" color="tertiary">
                      {t('vendor.actionsSoon')}
                    </AppText>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
