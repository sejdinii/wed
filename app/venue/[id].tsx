import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { Badge } from '@/design/components/Badge';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { Chip } from '@/design/components/Chip';
import { Divider } from '@/design/components/Divider';
import { EmptyState } from '@/design/components/EmptyState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { Skeleton } from '@/design/components/Skeleton';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import { RefundTimeline } from '@/components/RefundTimeline';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMkd, formatMkdBare } from '@/lib/money';
import { formatShortDate, nextFreeSaturdays, todayISO } from '@/lib/dates';
import { minKaparMkd } from '@/domain/kapar';
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
 * Venue detail. Structure follows the conversion argument:
 * dream (photos) → proof (rating, verified) → practicalities (menus, amenities)
 * → the kapar terms in full daylight → one sticky CTA anchored on the KAPAR
 * amount, not the scary total. Transparency before commitment.
 */
export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [venue, setVenue] = useState<Venue | null | 'missing'>(null);
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
        <EmptyState
          icon="alert-circle-outline"
          title={t('venue.notFound')}
          body=""
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  if (venue === null) {
    return (
      <Screen edges={[]}>
        <Skeleton height={340} radius={0} />
        <View style={{ padding: spacing(5), gap: spacing(3) }}>
          <Skeleton height={28} width="70%" />
          <Skeleton height={16} width="45%" />
          <Skeleton height={120} radius={radius.lg} style={{ marginTop: spacing(3) }} />
        </View>
      </Screen>
    );
  }

  const beginBooking = (presetDateISO?: string) => {
    const firstTier = venue.menuTiers[0];
    if (!firstTier) return;
    startDraft(venue.id, {
      guestCount: venue.capacityMin,
      menuTierId: firstTier.id,
      dateISO: presetDateISO,
    });
    router.push('/booking/date');
  };

  const kapar = venue.kaparPolicy;
  const saturdays = nextFreeSaturdays(todayISO(), 3, (iso) => venue.bookedDates.includes(iso));
  const bottomBarHeight = 76 + insets.bottom;

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
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={20} color={active ? '#FF6B6B' : '#FFFFFF'} />
    </PressableScale>
  );

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomBarHeight + spacing(6) }}>
        <PhotoCarousel photos={venue.photos} height={340} />

        <View style={{ padding: spacing(5), gap: spacing(6) }}>
          {/* Identity + social proof */}
          <View style={{ gap: spacing(2) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), flexWrap: 'wrap' }}>
              <AppText variant="title" style={{ flexShrink: 1 }}>
                {venue.name}
              </AppText>
              {venue.verified ? <Badge label={t('venue.verified')} tone="primary" dot /> : null}
            </View>
            <AppText variant="bodySm" color="secondary">
              {t(`city.${venue.city}`)} · {venue.address}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
              <Ionicons name="star" size={15} color={colors.accent} />
              <AppText variant="bodyStrong">{venue.rating.toFixed(1)}</AppText>
              <AppText variant="bodySm" color="secondary">
                {t('venue.reviews', { count: venue.reviewCount })}
              </AppText>
              <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textTertiary }} />
              <AppText variant="bodySm" color="secondary">
                {t('venue.respondsIn', { hours: venue.responseTimeHours })}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing(2), marginTop: spacing(1) }}>
              <Chip
                label={t('venue.capacity', { min: venue.capacityMin, max: venue.capacityMax })}
                icon={<Ionicons name="people-outline" size={15} color={colors.text} />}
              />
              <Chip
                label={t('venue.call')}
                icon={<Ionicons name="call-outline" size={15} color={colors.text} />}
                onPress={() => Linking.openURL(`tel:${venue.phone}`).catch(() => {})}
              />
            </View>
          </View>

          {/* Kapar terms — in full daylight, never fine print */}
          <Card padding={4} style={{ backgroundColor: colors.accentSoft, borderColor: colors.accent, gap: spacing(3) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
              <Ionicons name="wallet" size={18} color={colors.onAccentSoft} />
              <AppText variant="subheading" style={{ color: colors.onAccentSoft }}>
                {t('venue.kaparTitle')}
              </AppText>
            </View>
            <AppText variant="priceHero" style={{ color: colors.onAccentSoft }}>
              {kapar.kind === 'fixed'
                ? formatMkd(kapar.fixedAmountMkd ?? kapar.minAmountMkd, locale)
                : `${kapar.percentOfEstimate}%`}
            </AppText>
            {kapar.kind === 'percent' ? (
              <AppText variant="bodySm" style={{ color: colors.onAccentSoft }}>
                {t('venue.kaparPercentNote', { amount: formatMkd(kapar.minAmountMkd, locale) })}
              </AppText>
            ) : null}
            <AppText variant="body" style={{ color: colors.onAccentSoft }}>
              {t('venue.kaparBody')}
            </AppText>
          </Card>

          {/* Kapar Protection */}
          <View style={{ gap: spacing(3) }}>
            <AppText variant="heading">{t('venue.protectionTitle')}</AppText>
            {([1, 2, 3] as const).map((n) => (
              <View key={n} style={{ flexDirection: 'row', gap: spacing(3), alignItems: 'flex-start' }}>
                <Ionicons name="shield-checkmark" size={18} color={colors.success} style={{ marginTop: 2 }} />
                <AppText variant="body" color="secondary" style={{ flex: 1 }}>
                  {t(`venue.protect${n}`)}
                </AppText>
              </View>
            ))}
          </View>

          {/* Next free Saturdays — date-first shortcut into checkout */}
          {saturdays.length > 0 ? (
            <View style={{ gap: spacing(3) }}>
              <AppText variant="heading">{t('venue.nextSaturdays')}</AppText>
              <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
                {saturdays.map((iso) => (
                  <Chip
                    key={iso}
                    label={formatShortDate(iso, locale)}
                    icon={<Ionicons name="calendar-outline" size={15} color={colors.text} />}
                    onPress={() => beginBooking(iso)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Menus & per-guest pricing */}
          <View style={{ gap: spacing(3) }}>
            <AppText variant="heading">{t('venue.menus')}</AppText>
            {venue.menuTiers.map((tier) => (
              <Card key={tier.id} padding={4} style={{ gap: spacing(1.5) }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="subheading">{tier.name[locale]}</AppText>
                  <AppText variant="bodyStrong" color="brand">
                    {t('venue.menuPerGuest', { amount: formatMkdBare(tier.pricePerGuestMkd, locale) })}
                  </AppText>
                </View>
                <AppText variant="bodySm" color="secondary">
                  {tier.description[locale]}
                </AppText>
              </Card>
            ))}
          </View>

          {/* Cancellation ladder */}
          <View style={{ gap: spacing(3) }}>
            <AppText variant="heading">{t('venue.refundTitle')}</AppText>
            <Card padding={4}>
              <RefundTimeline policy={venue.kaparPolicy} />
            </Card>
          </View>

          {/* About */}
          <View style={{ gap: spacing(3) }}>
            <AppText variant="heading">{t('venue.about')}</AppText>
            <AppText variant="body" color="secondary">
              {venue.description[locale]}
            </AppText>
          </View>

          {/* Amenities */}
          <View style={{ gap: spacing(3) }}>
            <AppText variant="heading">{t('venue.amenities')}</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {venue.amenities.map((amenity) => (
                <View
                  key={amenity}
                  style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingVertical: spacing(1.5) }}
                >
                  <Ionicons name={AMENITY_ICONS[amenity]} size={17} color={colors.textSecondary} />
                  <AppText variant="bodySm" color="secondary" style={{ flex: 1 }}>
                    {t(`amenity.${amenity}`)}
                  </AppText>
                </View>
              ))}
            </View>
          </View>

          <Divider />
          <AppText variant="bodySm" color="tertiary" align="center">
            {t('venue.reviews', { count: venue.reviewCount })} · {venue.rating.toFixed(1)} ★
          </AppText>
        </View>
      </ScrollView>

      {/* Floating nav over photos */}
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
          label={t('tabs.saved')}
        />
      </View>

      {/* Sticky kapar bar — the CTA anchors on the deposit, not the total */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: spacing(5),
          paddingTop: spacing(3),
          paddingBottom: insets.bottom + spacing(3),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing(4),
        }}
      >
        <View>
          <AppText variant="heading" color="brand">
            {kapar.kind === 'percent' ? `${t('common.from')} ` : ''}
            {formatMkd(minKaparMkd(venue), locale)}
          </AppText>
          <AppText variant="caption" color="tertiary">
            {t('venue.kaparLabel').toUpperCase()}
          </AppText>
        </View>
        <Button title={t('venue.reserveCta')} onPress={() => beginBooking()} size="lg" style={{ flex: 1, maxWidth: 200 }} />
      </View>
    </Screen>
  );
}
