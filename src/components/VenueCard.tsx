import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { BrandedImage } from '@/components/BrandedImage';
import { ScoreBadge } from '@/components/ScoreBadge';
import { AppText } from '@/design/components/AppText';
import { Divider } from '@/design/components/Divider';
import { PressableScale } from '@/design/components/PressableScale';
import { useTheme } from '@/design/theme';
import { radius, shadow, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMkd } from '@/lib/money';
import { minEstimateMkd, priceLevel } from '@/domain/kapar';
import type { Venue } from '@/domain/types';
import { useFavorites } from '@/stores/favorites';
import { useI18n } from '@/i18n';

function HeartButton({ venueId, onImage = false }: { venueId: string; onImage?: boolean }) {
  const { colors } = useTheme();
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
      style={
        onImage
          ? {
              position: 'absolute',
              top: spacing(2),
              right: spacing(2),
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: 'rgba(255,255,255,0.92)',
              alignItems: 'center',
              justifyContent: 'center',
            }
          : { padding: 2 }
      }
    >
      <Ionicons
        name={isFavorite ? 'heart' : 'heart-outline'}
        size={onImage ? 16 : 20}
        color={isFavorite ? colors.urgency : onImage ? '#1E1B2E' : colors.text}
      />
    </PressableScale>
  );
}

function RatingChip({ venue, onImage = false }: { venue: Venue; onImage?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: onImage ? 'rgba(255,255,255,0.94)' : colors.mint,
        borderRadius: radius.pill,
        paddingHorizontal: spacing(2),
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Ionicons name="star" size={11} color={onImage ? '#5B21B6' : colors.primary} />
      <AppText variant="caption" style={{ color: onImage ? '#1E1B2E' : colors.onMint }}>
        {venue.rating.toFixed(1)} ({venue.reviewCount})
      </AppText>
    </View>
  );
}

function InfoChip({ icon, label }: { icon?: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.sm,
        paddingHorizontal: spacing(1.5),
        paddingVertical: 3,
      }}
    >
      {icon ? <Ionicons name={icon} size={11} color={colors.textSecondary} /> : null}
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
    </View>
  );
}

export interface VenueCardProps {
  venue: Venue;
  /** 'carousel' (home Popular), 'split' (results), 'row' (home Top Rated). */
  variant?: 'carousel' | 'split' | 'row';
  /** Show the green "Available" state (results with a date filter). */
  showAvailable?: boolean;
}

export function VenueCard({ venue, variant = 'split', showAvailable = false }: VenueCardProps) {
  const { colors, mode } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();

  const open = () => router.push(`/venue/${venue.id}`);
  const hallName = venue.halls[0]?.name[locale] ?? t(`venueTypeShort.${venue.venueType}`);
  const chips = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5) }}>
      <InfoChip label={priceLevel(venue)} />
      <InfoChip icon="people-outline" label={`${venue.capacityMax}`} />
      <InfoChip icon="business-outline" label={hallName} />
    </View>
  );

  if (variant === 'carousel') {
    return (
      <PressableScale
        onPress={open}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={venue.name}
        style={[
          { width: 168, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
          mode === 'light' ? shadow.card : null,
        ]}
      >
        <View>
          <BrandedImage uri={venue.photos[0]}
            style={{ width: '100%', aspectRatio: 1 }}
            contentFit="cover"
            transition={200}
          />
          <HeartButton venueId={venue.id} onImage />
          <View style={{ position: 'absolute', bottom: spacing(2), left: spacing(2) }}>
            <RatingChip venue={venue} onImage />
          </View>
        </View>
        <View style={{ padding: spacing(3), gap: spacing(1.5) }}>
          <AppText variant="subheading" numberOfLines={1}>
            {venue.name}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            <AppText variant="bodySm" color="secondary">
              {t(`city.${venue.city}`)}
            </AppText>
          </View>
          {chips}
          <AppText variant="bodySmStrong" color="brand">
            {t('common.from')} {formatMkd(minEstimateMkd(venue), locale)}
          </AppText>
        </View>
      </PressableScale>
    );
  }

  if (variant === 'row') {
    return (
      <PressableScale
        onPress={open}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={venue.name}
        style={[
          {
            flexDirection: 'row',
            gap: spacing(3),
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing(2.5),
            alignItems: 'center',
          },
          mode === 'light' ? shadow.card : null,
        ]}
      >
        <BrandedImage uri={venue.photos[0]}
          style={{ width: 64, height: 64, borderRadius: radius.md }}
          contentFit="cover"
          transition={200}
        />
        <View style={{ flex: 1, gap: spacing(1) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
            <AppText variant="subheading" numberOfLines={1} style={{ flexShrink: 1 }}>
              {venue.name}
            </AppText>
            <RatingChip venue={venue} />
          </View>
          <AppText variant="bodySm" color="secondary">
            {t(`city.${venue.city}`)}
          </AppText>
          {chips}
        </View>
        <HeartButton venueId={venue.id} />
      </PressableScale>
    );
  }

  // 'split' — results card
  return (
    <PressableScale
      onPress={open}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={venue.name}
      style={[
        {
          flexDirection: 'row',
          gap: spacing(3),
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing(2.5),
        },
        mode === 'light' ? shadow.card : null,
      ]}
    >
      <View>
        <BrandedImage uri={venue.photos[0]}
          style={{ width: 118, height: 132, borderRadius: radius.md }}
          contentFit="cover"
          transition={200}
        />
        {venue.featured ? (
          <View
            style={{
              position: 'absolute',
              top: spacing(1.5),
              left: spacing(1.5),
              backgroundColor: colors.primary,
              borderRadius: radius.sm,
              paddingHorizontal: spacing(2),
              paddingVertical: 3,
            }}
          >
            <AppText variant="caption" style={{ color: colors.onPrimary }}>
              {t('common.popularBadge')}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: spacing(1.5) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(2) }}>
          <AppText variant="subheading" numberOfLines={1} style={{ flexShrink: 1 }}>
            {venue.name}
          </AppText>
          <HeartButton venueId={venue.id} />
        </View>
        <View style={{ alignSelf: 'flex-start' }}>
          <ScoreBadge venue={venue} size="sm" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
          <Ionicons name="business-outline" size={13} color={colors.textSecondary} />
          <AppText variant="bodySm" color="secondary">
            {t(`venueTypeShort.${venue.venueType}`)}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
          <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
          <AppText variant="bodySm" color="secondary">
            {t('venue.capacityLine', { min: venue.capacityMin, max: venue.capacityMax })}
          </AppText>
        </View>
        <Divider />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="bodySm" color="secondary">
            {t('common.from')}{' '}
            <AppText variant="price" style={{ fontSize: 15 }}>
              {formatMkd(minEstimateMkd(venue), locale)}
            </AppText>
          </AppText>
          {showAvailable ? (
            <AppText variant="bodySmStrong" color="success">
              {t('results.available')}
            </AppText>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}
