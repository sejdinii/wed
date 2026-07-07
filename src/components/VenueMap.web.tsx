import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/design/components/AppText';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import type { VenueMapProps } from './VenueMap';

/**
 * Web fallback for the venue map — a static location card (the native map
 * module doesn't run in browsers). The "Open in maps" button below it links
 * out to Google Maps, which is the better web experience anyway.
 */
export function VenueMap({ name, height = 160 }: VenueMapProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: '100%',
        height,
        backgroundColor: colors.mint,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing(2),
      }}
    >
      <Ionicons name="location" size={36} color={colors.primary} />
      <AppText variant="bodySmStrong" style={{ color: colors.onMint }}>
        {name}
      </AppText>
    </View>
  );
}
