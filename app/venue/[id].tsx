import React, { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, Share, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
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
import { ScoreBadge } from '@/components/ScoreBadge';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMkd, formatMkdBare } from '@/lib/money';
import { hallFor, minEstimateMkd } from '@/domain/kapar';
import type { AmenityKey, Review, Venue } from '@/domain/types';
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

/** Booking-style facility groups. */
const FACILITY_GROUPS: ReadonlyArray<{ labelKey: 'fac.space' | 'fac.music' | 'fac.food' | 'fac.family' | 'fac.access'; keys: AmenityKey[] }> = [
  { labelKey: 'fac.space', keys: ['garden', 'terrace', 'lakeView', 'cityView', 'airCon'] },
  { labelKey: 'fac.music', keys: ['liveMusic', 'fireworks'] },
  { labelKey: 'fac.food', keys: ['inHouseCatering'] },
  { labelKey: 'fac.family', keys: ['childrenArea', 'bridalSuite'] },
  { labelKey: 'fac.access', keys: ['parking', 'accessible'] },
];

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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hallId, setHallId] = useState<string | null>(null);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const isFavorite = useFavorites((s) => (typeof id === 'string' ? s.venueIds.includes(id) : false));
  const toggleFavorite = useFavorites((s) => s.toggle);
  const startDraft = useBookingDraft((s) => s.start);

  useEffect(() => {
    let cancelled = false;
    if (typeof id !== 'string') return;
    (async () => {
      const [result, venueReviews] = await Promise.all([venueApi.getVenue(id), venueApi.listReviews(id)]);
      if (!cancelled) {
        setVenue(result ?? 'missing');
        setReviews(venueReviews);
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
          {/* Name · score plaque · location */}
          <View style={{ gap: spacing(2) }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing(3) }}>
              <AppText variant="title" style={{ flexShrink: 1 }}>
                {venue.name}
              </AppText>
              <PressableScale
                onPress={() => router.push(`/reviews/${venue.id}`)}
                hapticFeedback="select"
                accessibilityRole="button"
                accessibilityLabel={t('reviews.title')}
              >
                <ScoreBadge venue={venue} size="md" />
              </PressableScale>
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
              <View style={{ gap: spacing(3) }}>
                {FACILITY_GROUPS.map((group) => {
                  const present = group.keys.filter((k) => venue.amenities.includes(k));
                  if (present.length === 0) return null;
                  return (
                    <View key={group.labelKey} style={{ gap: spacing(1) }}>
                      <AppText variant="bodySmStrong">{t(group.labelKey)}</AppText>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {present.map((amenity) => (
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
                    </View>
                  );
                })}
              </View>
            </ExpandableSection>
            <Divider />
          </View>

          {/* Venue rules — the policies block */}
          <View style={{ gap: spacing(2.5) }}>
            <AppText variant="heading">{t('rules.title')}</AppText>
            <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing(4), gap: spacing(3) }}>
              {(
                [
                  ['musical-notes-outline', t('rules.music'), t('rules.until', { time: venue.houseRules.musicUntil })],
                  ['sparkles-outline', t('rules.fireworks'), venue.houseRules.fireworksAllowed ? t('rules.allowed') : t('rules.notAllowed')],
                  ['wine-outline', t('rules.ownAlcohol'), venue.houseRules.ownAlcoholAllowed ? t('rules.allowed') : t('rules.notAllowed')],
                  ['color-palette-outline', t('rules.decor'), venue.houseRules.ownDecorAllowed ? t('rules.allowed') : t('rules.notAllowed')],
                  ['card-outline', t('rules.payment'), t('rules.paymentBody')],
                ] as const
              ).map(([icon, label, value]) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(2.5) }}>
                  <Ionicons name={icon} size={17} color={colors.textSecondary} style={{ marginTop: 1 }} />
                  <AppText variant="bodySm" style={{ width: 110 }}>
                    {label}
                  </AppText>
                  <AppText variant="bodySmStrong" style={{ flex: 1 }}>
                    {value}
                  </AppText>
                </View>
              ))}
            </View>
          </View>

          {/* Location: map, nearby distances, open-in-maps */}
          <View style={{ gap: spacing(2.5) }}>
            <AppText variant="heading">{t('location.title')}</AppText>
            <View style={{ borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
              <MapView
                style={{ width: '100%', height: 160 }}
                initialRegion={{
                  latitude: venue.coords.lat,
                  longitude: venue.coords.lng,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker coordinate={{ latitude: venue.coords.lat, longitude: venue.coords.lng }} title={venue.name} />
              </MapView>
            </View>
            <AppText variant="bodySm" color="secondary">
              {venue.address}
            </AppText>
            <View style={{ gap: spacing(1.5) }}>
              <AppText variant="bodySmStrong">{t('location.nearby')}</AppText>
              {venue.nearby.map((place) => (
                <View key={place.label.en} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="bodySm" color="secondary">
                    {place.label[locale]}
                  </AppText>
                  <AppText variant="bodySm" color="secondary">
                    {place.km} km
                  </AppText>
                </View>
              ))}
            </View>
            <Button
              title={t('location.openMap')}
              onPress={() => {
                const { lat, lng } = venue.coords;
                const url = Platform.select({
                  ios: `maps:0,0?q=${encodeURIComponent(venue.name)}@${lat},${lng}`,
                  default: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(venue.name)})`,
                });
                Linking.openURL(url).catch(() => {});
              }}
              variant="outline"
              size="md"
            />
          </View>

          {/* Reviews preview + show all */}
          <View style={{ gap: spacing(2.5) }}>
            <AppText variant="heading">{t('reviews.title')}</AppText>
            {reviews.slice(0, 2).map((review) => (
              <View
                key={review.id}
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing(3.5), gap: spacing(2) }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText variant="bodySmStrong">{review.author}</AppText>
                  <View
                    style={{
                      minWidth: 26,
                      height: 26,
                      paddingHorizontal: 4,
                      borderRadius: radius.sm,
                      borderBottomLeftRadius: 0,
                      backgroundColor: colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText variant="caption" style={{ color: colors.onPrimary }}>
                      {review.score.toFixed(1)}
                    </AppText>
                  </View>
                </View>
                <AppText variant="bodySm" color="secondary" numberOfLines={3}>
                  “{review.positive}”
                </AppText>
              </View>
            ))}
            <Button
              title={t('reviews.showAll', { count: venue.reviewCount })}
              onPress={() => router.push(`/reviews/${venue.id}`)}
              variant="outline"
              size="md"
            />
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
