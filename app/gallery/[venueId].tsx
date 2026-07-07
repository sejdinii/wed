import React, { useEffect, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { Skeleton } from '@/design/components/Skeleton';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import type { Venue } from '@/domain/types';
import { venueApi } from '@/data/api';
import { useI18n } from '@/i18n';

/** Gallery — two-column photo grid presented as a modal sheet. */
export default function GalleryScreen() {
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [venue, setVenue] = useState<Venue | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (typeof venueId !== 'string') return;
    (async () => {
      const result = await venueApi.getVenue(venueId);
      if (!cancelled && result) setVenue(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  const cellWidth = (width - spacing(4) * 2 - spacing(2)) / 2;

  return (
    <Screen edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing(4),
          paddingVertical: spacing(3),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <AppText variant="heading">{t('venue.gallery', { count: venue?.photos.length ?? 0 })}</AppText>
        <PressableScale onPress={() => router.back()} hapticFeedback="select" accessibilityRole="button" accessibilityLabel={t('common.done')}>
          <Ionicons name="close" size={22} color={colors.text} />
        </PressableScale>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing(4) }} showsVerticalScrollIndicator={false}>
        {venue === null ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} width={cellWidth} height={140} radius={radius.md} />
            ))}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {venue.photos.map((uri, index) => (
              <Image
                key={uri}
                source={{ uri }}
                style={{
                  width: index === 0 ? cellWidth * 2 + spacing(2) : cellWidth,
                  height: index === 0 ? 200 : 140,
                  borderRadius: radius.md,
                }}
                contentFit="cover"
                transition={200}
                accessibilityIgnoresInvertColors
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
