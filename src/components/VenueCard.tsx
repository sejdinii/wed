import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Badge } from '@/design/components/Badge';
import { PressableScale } from '@/design/components/PressableScale';
import { useTheme } from '@/design/theme';
import { radius, shadow, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMkdBare } from '@/lib/money';
import { addDaysISO, nextFreeSaturdays, todayISO } from '@/lib/dates';
import { cheapestPerGuest } from '@/domain/kapar';
import type { Venue } from '@/domain/types';
import { useFavorites } from '@/stores/favorites';
import { useI18n } from '@/i18n';

/** Red scarcity pill — only when the calendar is genuinely tight (≤3 free Saturdays in 90 days). */
function urgencyCount(venue: Venue): number | null {
  const horizon = addDaysISO(todayISO(), 90);
  const free = nextFreeSaturdays(todayISO(), 4, (iso) => iso > horizon || venue.bookedDates.includes(iso));
  return free.length <= 3 ? free.length : null;
}

function Stars({ rating }: { rating: number }) {
  const { colors } = useTheme();
  const full = Math.round(rating);
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= full ? 'star' : 'star-outline'} size={11} color={colors.primary} />
      ))}
    </View>
  );
}

function HeartButton({ venueId }: { venueId: string }) {
  const isFavorite = useFavorites((s) => s.venueIds.includes(venueId));
  const toggle = useFavorites((s) => s.toggle);
  return (
    <PressableScale
      onPress={() => {
        haptic.light();
        toggle(venueId);
      }}
      scaleTo={0.8}
      hapticFeedback={null}
      accessibilityRole="button"
      accessibilityState={{ selected: isFavorite }}
      accessibilityLabel="♥"
      style={{
        position: 'absolute',
        top: spacing(2),
        right: spacing(2),
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={17} color={isFavorite ? '#CC4433' : '#131A16'} />
    </PressableScale>
  );
}

export interface VenueCardProps {
  venue: Venue;
  /** 'carousel': fixed-width vertical card (home). 'split': image-left row card (results). */
  variant?: 'carousel' | 'split';
}

export function VenueCard({ venue, variant = 'split' }: VenueCardProps) {
  const { colors, mode } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();

  const urgency = urgencyCount(venue);
  const priceLine = (
    <AppText variant="bodySm" color="secondary">
      {t('common.from')}{' '}
      <AppText variant="price" style={{ fontSize: 14 }}>
        {formatMkdBare(cheapestPerGuest(venue), locale)} ден.
      </AppText>{' '}
      {t('common.perGuest')}
    </AppText>
  );

  if (variant === 'carousel') {
    return (
      <PressableScale
        onPress={() => router.push(`/venue/${venue.id}`)}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={venue.name}
        style={{ width: 210 }}
      >
        <View style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
          <Image
            source={{ uri: venue.photos[0] }}
            style={{ width: '100%', aspectRatio: 4 / 3 }}
            contentFit="cover"
            transition={200}
            accessibilityIgnoresInvertColors
          />
          {urgency !== null ? (
            <View style={{ position: 'absolute', top: spacing(2), left: spacing(2) }}>
              <Badge label={t('home.fewSaturdays', { count: urgency })} tone="urgency" style={{ backgroundColor: '#FFFFFF' }} />
            </View>
          ) : null}
          <HeartButton venueId={venue.id} />
        </View>
        <View style={{ paddingTop: spacing(2), gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
            <Stars rating={venue.rating} />
            <AppText variant="bodySm" color="secondary">
              {venue.rating.toFixed(1)} ({venue.reviewCount})
            </AppText>
          </View>
          <AppText variant="bodySmStrong" numberOfLines={2}>
            {venue.name}, {t(`city.${venue.city}`)}
          </AppText>
          <AppText variant="bodySm" color="secondary">
            {t('venue.capacityLine', { min: venue.capacityMin, max: venue.capacityMax })}
          </AppText>
          {priceLine}
        </View>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      onPress={() => router.push(`/venue/${venue.id}`)}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={venue.name}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        mode === 'light' ? shadow.card : null,
      ]}
    >
      <View style={{ width: 128 }}>
        <Image
          source={{ uri: venue.photos[0] }}
          style={{ width: '100%', height: '100%', minHeight: 128 }}
          contentFit="cover"
          transition={200}
          accessibilityIgnoresInvertColors
        />
        <HeartButton venueId={venue.id} />
      </View>
      <View style={{ flex: 1, padding: spacing(3), gap: 2 }}>
        {urgency !== null ? <Badge label={t('home.fewSaturdays', { count: urgency })} tone="urgency" /> : null}
        <AppText variant="bodyStrong" numberOfLines={2}>
          {venue.name}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
          <Stars rating={venue.rating} />
          <AppText variant="bodySm" color="secondary">
            ({venue.reviewCount})
          </AppText>
        </View>
        <AppText variant="bodySm" color="secondary" numberOfLines={1}>
          {t('venue.capacityLine', { min: venue.capacityMin, max: venue.capacityMax })} · {t(`city.${venue.city}`)}
        </AppText>
        <View style={{ alignItems: 'flex-end', marginTop: 'auto' }}>{priceLine}</View>
      </View>
    </PressableScale>
  );
}
