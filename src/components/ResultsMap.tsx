import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/design/components/AppText';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import type { Venue } from '@/domain/types';
import { useI18n } from '@/i18n';

export interface ResultsMapProps {
  /** Same filtered/sorted array the list renders — list and map are one result set. */
  venues: Venue[];
  selectedId: string | null;
  onSelectVenue: (id: string | null) => void;
  /**
   * Web only: fired if the map library itself fails catastrophically (not
   * just a blocked tile host, which degrades in-place). Native ignores this —
   * there's no map library running here yet, see the component doc below.
   */
  onFatalError?: () => void;
}

/**
 * Native results map (iOS/Android) — resolves to ResultsMap.web.tsx on web
 * instead, which is the real MapLibre implementation this wave ships.
 *
 * react-native-maps IS already wired for the single-pin venue detail map
 * (VenueMap.tsx), but a results GRID needs multi-pin layout, zoom-based
 * clustering, and tap-target sizing verified on a physical device — this
 * cloud environment can only run/verify the web target. Shipping unverified
 * interactive native map code would be exactly the "affordance theatre" the
 * Wave 5 honesty sweep removed the old dead pill for (see BACKLOG.md). So
 * native gets the same honest static-panel treatment VenueMap.web.tsx uses
 * for its own fallback, until a device pass verifies real pins — swap this
 * file's body for a MapView + per-venue Markers (pattern in VenueMap.tsx)
 * once that happens. The List/Map toggle pill still works normally; couples
 * on native just see this panel instead of pins for now.
 */
export function ResultsMap({ venues }: ResultsMapProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.mint,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing(2),
        paddingHorizontal: spacing(8),
      }}
    >
      <Ionicons name="map-outline" size={36} color={colors.onMint} />
      <AppText variant="heading" align="center" style={{ color: colors.onMint }}>
        {t('results.mapNativePendingTitle')}
      </AppText>
      <AppText variant="bodySm" align="center" style={{ color: colors.onMint }}>
        {t('results.mapNativePendingBody', { count: venues.length })}
      </AppText>
    </View>
  );
}
