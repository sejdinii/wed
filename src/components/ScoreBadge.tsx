import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/design/components/AppText';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { score10, scoreWordKey } from '@/domain/reviews';
import type { Venue } from '@/domain/types';
import { useI18n } from '@/i18n';
import { REVIEWS_ENABLED } from '@/lib/launchGates';

export interface ScoreBadgeProps {
  venue: Pick<Venue, 'rating' | 'reviewCount'>;
  /** 'sm' for result cards, 'md' for the detail header. */
  size?: 'sm' | 'md';
  /** Render the adjective + review count next to the box. */
  withWord?: boolean;
}

/**
 * 10-scale review score in a solid violet box (bottom corner squared — the
 * classic score-plaque shape), with the adjective and review count beside it.
 *
 * Wave 6 LAUNCH-HONESTY gate: seed reviews are generated fiction (see
 * src/lib/launchGates.ts) — renders nothing until REVIEWS_ENABLED flips true,
 * or when the venue genuinely has zero reviews. Callers still own their own
 * wrapping layout so an omitted badge never leaves a dangling gap.
 */
export function ScoreBadge({ venue, size = 'sm', withWord = true }: ScoreBadgeProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const score = score10(venue);
  const box = size === 'md' ? 34 : 28;

  if (!REVIEWS_ENABLED || venue.reviewCount === 0) return null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
      {withWord ? (
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant={size === 'md' ? 'bodySmStrong' : 'caption'}>{t(scoreWordKey(score))}</AppText>
          <AppText variant="caption" color="secondary">
            {t('venue.reviews', { count: venue.reviewCount })}
          </AppText>
        </View>
      ) : null}
      <View
        style={{
          minWidth: box,
          height: box,
          paddingHorizontal: 4,
          borderRadius: radius.sm,
          borderBottomLeftRadius: 0,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText variant={size === 'md' ? 'bodyStrong' : 'bodySmStrong'} style={{ color: colors.onPrimary }}>
          {score.toFixed(1)}
        </AppText>
      </View>
    </View>
  );
}
