import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Badge } from '@/design/components/Badge';
import { PressableScale } from '@/design/components/PressableScale';
import { useTheme } from '@/design/theme';
import { radius, shadow, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMkd, formatMkdBare } from '@/lib/money';
import { cheapestPerGuest, minKaparMkd } from '@/domain/kapar';
import type { Venue } from '@/domain/types';
import { useFavorites } from '@/stores/favorites';
import { useI18n } from '@/i18n';

export interface VenueCardProps {
  venue: Venue;
  /** 'featured' renders a fixed-width card for horizontal carousels. */
  variant?: 'list' | 'featured';
}

/**
 * The workhorse of discovery. Deliberate hierarchy: photo sells the dream,
 * then name → social proof → capacity → price per guest → and always the
 * kapar amount, because "how much to lock the date?" is THE question here.
 */
export function VenueCard({ venue, variant = 'list' }: VenueCardProps) {
  const { colors, mode } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const isFavorite = useFavorites((s) => s.venueIds.includes(venue.id));
  const toggleFavorite = useFavorites((s) => s.toggle);

  const width = variant === 'featured' ? 300 : undefined;

  return (
    <PressableScale
      onPress={() => router.push(`/venue/${venue.id}`)}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={venue.name}
      style={[
        {
          width,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        mode === 'light' ? shadow.card : null,
      ]}
    >
      <View>
        <Image
          source={{ uri: venue.photos[0] }}
          style={{ width: '100%', aspectRatio: variant === 'featured' ? 4 / 3 : 16 / 10 }}
          contentFit="cover"
          transition={250}
          accessibilityIgnoresInvertColors
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.45)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 84 }}
        />
        <PressableScale
          onPress={() => {
            haptic.light();
            toggleFavorite(venue.id);
          }}
          scaleTo={0.85}
          hapticFeedback={null}
          accessibilityRole="button"
          accessibilityState={{ selected: isFavorite }}
          accessibilityLabel={t('tabs.saved')}
          style={{
            position: 'absolute',
            top: spacing(3),
            right: spacing(3),
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? '#FF6B6B' : '#FFFFFF'} />
        </PressableScale>
        <View style={{ position: 'absolute', bottom: spacing(3), left: spacing(3), flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
          <Ionicons name="star" size={13} color="#FFD66B" />
          <AppText variant="bodySmStrong" style={{ color: '#FFFFFF' }}>
            {venue.rating.toFixed(1)}
          </AppText>
          <AppText variant="bodySm" style={{ color: 'rgba(255,255,255,0.85)' }}>
            ({venue.reviewCount})
          </AppText>
        </View>
      </View>

      <View style={{ padding: spacing(3.5), gap: spacing(1.5) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
          <AppText variant="subheading" numberOfLines={1} style={{ flexShrink: 1 }}>
            {venue.name}
          </AppText>
          {venue.verified ? <Ionicons name="shield-checkmark" size={15} color={colors.primary} /> : null}
        </View>
        <AppText variant="bodySm" color="secondary">
          {t(`city.${venue.city}`)} · {t('explore.capacity', { min: venue.capacityMin, max: venue.capacityMax })}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing(1) }}>
          <AppText variant="bodySm" color="secondary">
            {t('common.from')}{' '}
            <AppText variant="bodyStrong">{formatMkdBare(cheapestPerGuest(venue), locale)} ден.</AppText>{' '}
            {t('common.perGuest')}
          </AppText>
          <Badge label={t('explore.kaparFrom', { amount: formatMkd(minKaparMkd(venue), locale) })} tone="accent" />
        </View>
      </View>
    </PressableScale>
  );
}
