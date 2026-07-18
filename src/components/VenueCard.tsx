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
import { REVIEWS_ENABLED } from '@/lib/launchGates';
import { formatMkd } from '@/lib/money';
import { minEstimateMkd, priceLevel } from '@/domain/kapar';
import type { Venue } from '@/domain/types';
import { useFavorites } from '@/stores/favorites';
import { useI18n } from '@/i18n';

// Card chrome constants shared between the layout below and the hoisted
// HeartButton's absolute-position math (Wave 5 hydration fix — see the
// per-variant comments further down).
const CARD_PADDING = spacing(2.5);
const CARD_BORDER = 1;
const SPLIT_IMAGE_WIDTH = 118;
const ROW_HEART_GUTTER = spacing(7);

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

/** Wave 6 LAUNCH-HONESTY gate — see ScoreBadge; renders nothing pre-launch or with zero reviews. Callers skip the wrapping View too, so no dangling gap. */
function RatingChip({ venue, onImage = false }: { venue: Venue; onImage?: boolean }) {
  const { colors } = useTheme();
  if (!REVIEWS_ENABLED || venue.reviewCount === 0) return null;
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
      // Wrapping View (Wave 5): HeartButton must be a SIBLING of the card's
      // PressableScale, never a descendant — a Pressable nested inside
      // another Pressable renders as <button> inside <button> on web, which
      // react-native-web logs as a DOM nesting/hydration error on every
      // render. The heart still visually overlays the image via absolute
      // positioning; it just no longer participates in the card's own touch
      // target.
      <View style={{ width: 168 }}>
        <PressableScale
          onPress={open}
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={venue.name}
          style={[
            { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
            mode === 'light' ? shadow.card : null,
          ]}
        >
          <View>
            <BrandedImage uri={venue.photos[0]}
              style={{ width: '100%', aspectRatio: 1 }}
              contentFit="cover"
              transition={200}
            />
            {REVIEWS_ENABLED ? (
              <View style={{ position: 'absolute', bottom: spacing(2), left: spacing(2) }}>
                <RatingChip venue={venue} onImage />
              </View>
            ) : null}
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
        <View style={{ position: 'absolute', top: spacing(2), right: spacing(2) }}>
          <HeartButton venueId={venue.id} onImage />
        </View>
      </View>
    );
  }

  if (variant === 'row') {
    return (
      // See carousel's comment above — same sibling-hoist fix. Row places
      // the heart at the card's right edge, vertically centered, since
      // there's no image region to overlay.
      <View>
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
          <View style={{ flex: 1, gap: spacing(1), paddingRight: ROW_HEART_GUTTER }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
              <AppText variant="subheading" numberOfLines={1} style={{ flexShrink: 1 }}>
                {venue.name}
              </AppText>
              {REVIEWS_ENABLED ? <RatingChip venue={venue} /> : null}
            </View>
            <AppText variant="bodySm" color="secondary">
              {t(`city.${venue.city}`)}
            </AppText>
            {chips}
          </View>
        </PressableScale>
        <View style={{ position: 'absolute', top: 0, bottom: 0, right: CARD_PADDING + CARD_BORDER, justifyContent: 'center' }}>
          <HeartButton venueId={venue.id} />
        </View>
      </View>
    );
  }

  // 'split' — results card. Same sibling-hoist fix; the heart still overlays
  // the image's top-right corner (spec calls for carousel + split to keep
  // that placement), computed from the card's own padding/border since the
  // image sits left of the text column rather than flush with the card edge.
  return (
    <View>
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
            style={{ width: SPLIT_IMAGE_WIDTH, height: 132, borderRadius: radius.md }}
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
          <AppText variant="subheading" numberOfLines={1}>
            {venue.name}
          </AppText>
          {REVIEWS_ENABLED ? (
            <View style={{ alignSelf: 'flex-start' }}>
              <ScoreBadge venue={venue} size="sm" />
            </View>
          ) : null}
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
      <View
        style={{
          position: 'absolute',
          top: CARD_PADDING + CARD_BORDER + spacing(2),
          left: CARD_PADDING + CARD_BORDER + SPLIT_IMAGE_WIDTH - spacing(2) - 30,
        }}
      >
        <HeartButton venueId={venue.id} onImage />
      </View>
    </View>
  );
}
