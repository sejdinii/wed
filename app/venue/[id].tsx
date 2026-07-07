import React, { useEffect, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
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
import { hallFor, minEstimateMkd } from '@/domain/kapar';
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
 * C3 — Venue Details: the conversion page.
 * Gallery (swipe, 1/N counter, tap → full-screen) with heart + share;
 * name / rating / location; amenity chips row (hall · guests · indoor ·
 * parking); hall selector on multi-hall venues (price follows); "About this
 * venue" with Read more; "What's included" checklist; sticky bar with
 * "From €X" + Check Availability + "Kapar required" caption.
 * Unpublished venues render a friendly 410. Failed images fall back to the
 * branded gradient (BrandedImage).
 */
export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [venue, setVenue] = useState<Venue | null | 'missing'>(null);
  const [hallId, setHallId] = useState<string | null>(null);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const isFavorite = useFavorites((s) => (typeof id === 'string' ? s.venueIds.includes(id) : false));
  const toggleFavorite = useFavorites((s) => s.toggle);
  const startDraft = useBookingDraft((s) => s.start);

  useEffect(() => {
    let cancelled = false;
    if (typeof id !== 'string') return;
    (async () => {
      const result = await venueApi.getVenue(id);
      if (!cancelled) {
        setVenue(result ?? 'missing');
        if (result) setHallId(result.halls[0]?.id ?? null);
      }
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

  // C3 edge case: unpublished venue → friendly 410, route back to browsing.
  if (venue !== null && !venue.published) {
    return (
      <Screen>
        <EmptyState
          icon="cloud-offline-outline"
          title={t('venue.goneTitle')}
          body={t('venue.goneBody')}
          actionLabel={t('bookings.emptyCta')}
          onAction={() => router.replace('/(tabs)')}
        />
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

  const hall = hallFor(venue, hallId);
  const fromPrice = minEstimateMkd(venue, hallId);

  const share = () => {
    haptic.select();
    // Deep link per C3: kapar.mk/v/{slug}
    Share.share({
      message: t('venue.shareMessage', { name: venue.name, url: `https://kapar.mk/v/${venue.slug}` }),
    }).catch(() => {});
  };

  const beginBooking = () => {
    const firstTier = venue.menuTiers[0];
    if (!firstTier) return;
    startDraft(venue.id, {
      guestCount: hall?.capacityMin ?? venue.capacityMin,
      menuTierId: firstTier.id,
      hallId: hall?.id,
    });
    router.push('/booking/availability');
  };

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
        backgroundColor: 'rgba(255,255,255,0.95)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={19} color={active ? colors.urgency : '#1E1B2E'} />
    </PressableScale>
  );

  const FactChip = ({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) => (
    <View
      style={{
        alignItems: 'center',
        gap: spacing(1.5),
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingVertical: spacing(3),
        paddingHorizontal: spacing(3.5),
        minWidth: 86,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.primary} />
      <AppText variant="caption" color="secondary" align="center">
        {label}
      </AppText>
    </View>
  );

  const bottomBarHeight = 92 + insets.bottom;

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomBarHeight + spacing(6) }}>
        {/* Gallery: swipe + counter; tap opens full-screen at that photo */}
        <PhotoCarousel
          photos={venue.photos}
          height={300}
          onPhotoPress={(index) => router.push({ pathname: '/gallery/[venueId]', params: { venueId: venue.id, index: String(index) } })}
        />

        <View style={{ padding: spacing(4), gap: spacing(4) }}>
          {/* Name · rating · location */}
          <View style={{ gap: spacing(1.5) }}>
            <AppText variant="title">{venue.name}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="star" size={14} color={colors.primary} />
              <AppText variant="bodySmStrong" color="brand">
                {venue.rating.toFixed(1)}
              </AppText>
              <AppText variant="bodySm" color="secondary">
                ({t('venue.reviews', { count: venue.reviewCount })})
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <AppText variant="bodySm" color="secondary">
                {t(`city.${venue.city}`)}, {t('home.country')}
              </AppText>
            </View>
          </View>

          {/* Amenity chips: hall · guests · indoor/outdoor · parking */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing(2.5), alignItems: 'center' }}>
            {hall ? <FactChip icon="business-outline" label={hall.name[locale]} /> : null}
            <FactChip
              icon="people-outline"
              label={`${hall?.capacityMin ?? venue.capacityMin} – ${hall?.capacityMax ?? venue.capacityMax} ${t('common.guests')}`}
            />
            <FactChip icon={hall?.indoor ? 'home-outline' : 'sunny-outline'} label={hall?.indoor ? t('venue.indoor') : t('venue.outdoor')} />
            {venue.amenities.includes('parking') ? <FactChip icon="car-outline" label={t('amenity.parking')} /> : null}
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </ScrollView>

          {/* Hall selector (multi-hall venues) — price follows the selection */}
          {venue.halls.length > 1 ? (
            <View style={{ gap: spacing(2.5) }}>
              <AppText variant="subheading">{t('venue.halls')}</AppText>
              {venue.halls.map((h) => {
                const selected = h.id === hall?.id;
                return (
                  <PressableScale
                    key={h.id}
                    onPress={() => setHallId(h.id)}
                    scaleTo={0.99}
                    hapticFeedback="select"
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing(2.5),
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.mint : colors.surface,
                      borderRadius: radius.md,
                      padding: spacing(3),
                    }}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selected ? colors.primary : colors.textTertiary}
                    />
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong">{h.name[locale]}</AppText>
                      <AppText variant="bodySm" color="secondary">
                        {h.capacityMin} – {h.capacityMax} {t('common.guests')} · {h.indoor ? t('venue.indoor') : t('venue.outdoor')}
                      </AppText>
                    </View>
                    <AppText variant="bodySmStrong" color="brand">
                      {t('common.from')} {formatMkd(minEstimateMkd(venue, h.id), locale)}
                    </AppText>
                  </PressableScale>
                );
              })}
            </View>
          ) : null}

          {/* About this venue + Read more */}
          <View style={{ gap: spacing(2) }}>
            <AppText variant="heading">{t('venue.aboutThis')}</AppText>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <AppText variant="bodySmStrong" color="brand">
                  {aboutExpanded ? t('venue.readLess') : t('venue.readMore')}
                </AppText>
                <Ionicons name={aboutExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={colors.primary} />
              </View>
            </PressableScale>
          </View>

          {/* What's included — checklist */}
          <View style={{ gap: spacing(2.5) }}>
            <AppText variant="heading">{t('venue.whatsIncluded')}</AppText>
            <View
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing(4),
                gap: spacing(3),
              }}
            >
              {venue.included.map((key) => (
                <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2.5) }}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <AppText variant="body">{t(`included.${key}`)}</AppText>
                </View>
              ))}
            </View>
          </View>

          {/* Menus — feeds the estimate at checkout */}
          <View style={{ gap: spacing(2.5) }}>
            <AppText variant="heading">{t('venue.menus')}</AppText>
            {venue.menuTiers.map((tier) => (
              <View
                key={tier.id}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  padding: spacing(3),
                  gap: spacing(1),
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="subheading">{tier.name[locale]}</AppText>
                  <AppText variant="bodySmStrong" color="brand">
                    {t('venue.menuPerGuest', { amount: formatMkdBare(tier.pricePerGuestMkd + (hall?.pricePerGuestAdjMkd ?? 0), locale) })}
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

      {/* Floating: back · heart · share */}
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
        <FloatingButton icon="arrow-back" onPress={() => router.back()} label={t('common.back')} />
        <View style={{ flexDirection: 'row', gap: spacing(2.5) }}>
          <FloatingButton
            icon={isFavorite ? 'heart' : 'heart-outline'}
            active={isFavorite}
            onPress={() => {
              haptic.light();
              toggleFavorite(venue.id);
            }}
            label={t('tabs.favorites')}
          />
          <FloatingButton icon="share-outline" onPress={share} label="↥" />
        </View>
      </View>

      {/* Sticky bar: From €X · Check Availability · kapar caption */}
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
          paddingBottom: insets.bottom + spacing(2),
          gap: spacing(1.5),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(4) }}>
          <View>
            <AppText variant="bodySm" color="secondary">
              {t('common.from')}
            </AppText>
            <AppText variant="price" style={{ fontSize: 20 }}>
              {formatMkd(fromPrice, locale)}
            </AppText>
          </View>
          <Button title={t('venue.checkDates')} onPress={beginBooking} style={{ flex: 1 }} />
        </View>
        <AppText variant="caption" color="tertiary" align="center">
          {t('venue.kaparRequired')}
        </AppText>
      </View>
    </Screen>
  );
}
