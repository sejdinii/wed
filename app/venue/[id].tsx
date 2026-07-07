import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { Badge } from '@/design/components/Badge';
import { Button } from '@/design/components/Button';
import { Divider } from '@/design/components/Divider';
import { EmptyState } from '@/design/components/EmptyState';
import { ExpandableSection } from '@/design/components/ExpandableSection';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { Skeleton } from '@/design/components/Skeleton';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import { RefundTimeline } from '@/components/RefundTimeline';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMkd, formatMkdBare } from '@/lib/money';
import { cheapestPerGuest, minKaparMkd, sortedRefundTiers } from '@/domain/kapar';
import type { AmenityKey, Venue } from '@/domain/types';
import { venueApi } from '@/data/api';
import { useFavorites } from '@/stores/favorites';
import { useBookingDraft } from '@/stores/bookingDraft';
import { useI18n } from '@/i18n';

const AMENITY_ICONS: Record<AmenityKey, React.ComponentProps<typeof Ionicons>['name']> = {
  parking: 'car-outline',
  liveMusic: 'musical-notes-outline',
  garden: 'flower-outline',
  lakeView: 'water-outline',
  terrace: 'sunny-outline',
  airCon: 'snow-outline',
  bridalSuite: 'bed-outline',
  inHouseCatering: 'restaurant-outline',
  fireworks: 'sparkles-outline',
  accessible: 'accessibility-outline',
  childrenArea: 'happy-outline',
  cityView: 'business-outline',
};

/**
 * Venue detail — Viator's activity-page anatomy adapted to venues:
 * hero gallery → title → per-guest price → stars + reviews → "book ahead"
 * nudge → refundable-kapar and capacity rows → overview with read-more →
 * menus ("what's included") → collapsed cancellation/amenities → sticky bar
 * anchored on the kapar with a green "Check dates" pill.
 */
export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [venue, setVenue] = useState<Venue | null | 'missing'>(null);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const isFavorite = useFavorites((s) => (typeof id === 'string' ? s.venueIds.includes(id) : false));
  const toggleFavorite = useFavorites((s) => s.toggle);
  const startDraft = useBookingDraft((s) => s.start);

  useEffect(() => {
    let cancelled = false;
    if (typeof id !== 'string') return;
    (async () => {
      const result = await venueApi.getVenue(id);
      if (!cancelled) setVenue(result ?? 'missing');
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (venue === 'missing') {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title={t('venue.notFound')} body="" actionLabel={t('common.back')} onAction={() => router.back()} />
      </Screen>
    );
  }

  if (venue === null) {
    return (
      <Screen edges={[]}>
        <Skeleton height={300} radius={0} />
        <View style={{ padding: spacing(4), gap: spacing(3) }}>
          <Skeleton height={24} width="80%" />
          <Skeleton height={16} width="40%" />
          <Skeleton height={90} radius={radius.lg} style={{ marginTop: spacing(3) }} />
        </View>
      </Screen>
    );
  }

  const beginBooking = () => {
    const firstTier = venue.menuTiers[0];
    if (!firstTier) return;
    startDraft(venue.id, { guestCount: venue.capacityMin, menuTierId: firstTier.id });
    router.push('/booking/availability');
  };

  const fullRefundDays = sortedRefundTiers(venue.kaparPolicy)[0];
  const bottomBarHeight = 78 + insets.bottom;

  const FloatingButton = ({
    icon,
    onPress,
    active,
    label,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    onPress: () => void;
    active?: boolean;
    label: string;
  }) => (
    <PressableScale
      onPress={onPress}
      scaleTo={0.85}
      hapticFeedback="select"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={19} color={active ? '#CC4433' : '#131A16'} />
    </PressableScale>
  );

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomBarHeight + spacing(6) }}>
        <PressableScale
          onPress={() => router.push(`/gallery/${venue.id}`)}
          scaleTo={1}
          hapticFeedback="select"
          accessibilityRole="button"
          accessibilityLabel={t('venue.gallery', { count: venue.photos.length })}
        >
          <PhotoCarousel photos={venue.photos} height={300} />
        </PressableScale>

        <View style={{ padding: spacing(4), gap: spacing(4) }}>
          {/* Title block */}
          <View style={{ gap: spacing(1.5) }}>
            <AppText variant="title">{venue.name} — {t(`city.${venue.city}`)}</AppText>
            <AppText variant="body" color="secondary">
              {t('common.from')}{' '}
              <AppText variant="price">{formatMkdBare(cheapestPerGuest(venue), locale)} ден.</AppText>{' '}
              {t('common.perGuest')}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
              <View style={{ flexDirection: 'row', gap: 1 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons key={i} name={i <= Math.round(venue.rating) ? 'star' : 'star-outline'} size={14} color={colors.primary} />
                ))}
              </View>
              <AppText variant="bodyStrong">{venue.rating.toFixed(1)}</AppText>
              <AppText variant="bodySm" color="secondary" style={{ textDecorationLine: 'underline' }}>
                {t('venue.reviews', { count: venue.reviewCount })}
              </AppText>
              {venue.verified ? <Badge label={t('venue.verified')} tone="success" dot /> : null}
            </View>
          </View>

          {/* Book-ahead nudge */}
          <View
            style={{
              flexDirection: 'row',
              gap: spacing(3),
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing(3),
              alignItems: 'flex-start',
            }}
          >
            <AppText variant="heading">📅</AppText>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{t('venue.bookAhead')}</AppText>
              <AppText variant="bodySm" color="secondary">
                {t('venue.bookAheadBody')}
              </AppText>
            </View>
          </View>

          {/* Trust + capacity rows */}
          <View>
            {fullRefundDays && fullRefundDays.refundPercent >= 100 ? (
              <View style={{ flexDirection: 'row', gap: spacing(3), paddingVertical: spacing(2.5), alignItems: 'flex-start' }}>
                <Ionicons name="card-outline" size={19} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{t('venue.kaparRefundable')}</AppText>
                  <AppText variant="bodySm" color="secondary">
                    {t('venue.kaparRefundableBody', { days: fullRefundDays.minDaysBeforeEvent })}
                  </AppText>
                </View>
              </View>
            ) : null}
            <Divider />
            <View style={{ flexDirection: 'row', gap: spacing(3), paddingVertical: spacing(2.5), alignItems: 'center' }}>
              <Ionicons name="people-outline" size={19} color={colors.primary} />
              <AppText variant="bodyStrong" style={{ flex: 1 }}>
                {t('venue.capacityLine', { min: venue.capacityMin, max: venue.capacityMax })}
              </AppText>
              <PressableScale
                onPress={() => Linking.openURL(`tel:${venue.phone}`).catch(() => {})}
                hapticFeedback="select"
                accessibilityRole="button"
                accessibilityLabel={t('venue.call')}
              >
                <AppText variant="label" color="brand" style={{ textDecorationLine: 'underline' }}>
                  {t('venue.call')}
                </AppText>
              </PressableScale>
            </View>
            <Divider />
          </View>

          {/* Overview */}
          <View style={{ gap: spacing(2) }}>
            <AppText variant="heading">{t('venue.overview')}</AppText>
            <AppText variant="body" color="secondary" numberOfLines={aboutExpanded ? undefined : 3}>
              {venue.description[locale]}
            </AppText>
            <PressableScale
              onPress={() => {
                haptic.select();
                setAboutExpanded((v) => !v);
              }}
              hapticFeedback={null}
              accessibilityRole="button"
            >
              <AppText variant="bodyStrong" style={{ textDecorationLine: 'underline' }}>
                {t('venue.readMore')}
              </AppText>
            </PressableScale>
          </View>

          {/* Menus — "what's included" */}
          <View style={{ gap: spacing(3) }}>
            <AppText variant="heading">{t('venue.included')}</AppText>
            {venue.menuTiers.map((tier) => (
              <View
                key={tier.id}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing(3),
                  gap: spacing(1),
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="subheading">{tier.name[locale]}</AppText>
                  <AppText variant="bodySmStrong" color="brand">
                    {t('venue.menuPerGuest', { amount: formatMkdBare(tier.pricePerGuestMkd, locale) })}
                  </AppText>
                </View>
                <AppText variant="bodySm" color="secondary">
                  {tier.description[locale]}
                </AppText>
              </View>
            ))}
          </View>

          {/* Collapsed verification sections */}
          <View>
            <Divider />
            <ExpandableSection title={t('venue.cancellation')}>
              <RefundTimeline policy={venue.kaparPolicy} />
            </ExpandableSection>
            <Divider />
            <ExpandableSection title={t('venue.amenities')}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {venue.amenities.map((amenity) => (
                  <View
                    key={amenity}
                    style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingVertical: spacing(1.5) }}
                  >
                    <Ionicons name={AMENITY_ICONS[amenity]} size={16} color={colors.textSecondary} />
                    <AppText variant="bodySm" color="secondary" style={{ flex: 1 }}>
                      {t(`amenity.${amenity}`)}
                    </AppText>
                  </View>
                ))}
              </View>
            </ExpandableSection>
            <Divider />
          </View>
        </View>
      </ScrollView>

      {/* Floating nav */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + spacing(2),
          left: spacing(4),
          right: spacing(4),
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <FloatingButton icon="chevron-back" onPress={() => router.back()} label={t('common.back')} />
        <FloatingButton
          icon={isFavorite ? 'heart' : 'heart-outline'}
          active={isFavorite}
          onPress={() => {
            haptic.light();
            toggleFavorite(venue.id);
          }}
          label={t('tabs.wishlist')}
        />
      </View>

      {/* Sticky bar — kapar left, green pill right */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: spacing(4),
          paddingTop: spacing(3),
          paddingBottom: insets.bottom + spacing(3),
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(3),
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText variant="subheading" color="gold">
            {venue.kaparPolicy.kind === 'fixed'
              ? t('venue.kaparExact', { amount: formatMkd(minKaparMkd(venue), locale) })
              : t('venue.kaparFrom', { amount: formatMkd(minKaparMkd(venue), locale) })}
          </AppText>
          <AppText variant="caption" color="tertiary">
            {t('venue.kaparProtectedShort')}
          </AppText>
        </View>
        <Button title={t('venue.checkDates')} onPress={beginBooking} size="lg" />
      </View>
    </Screen>
  );
}
