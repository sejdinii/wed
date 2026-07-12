import React, { useEffect, useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { BrandedImage } from '@/components/BrandedImage';
import { ErrorState } from '@/design/components/ErrorState';
import { PressableScale } from '@/design/components/PressableScale';
import { spacing } from '@/design/tokens';
import type { Venue } from '@/domain/types';
import { venueApi } from '@/data/api';
import { useI18n } from '@/i18n';

/**
 * Full-screen gallery (C3): black canvas, swipe between photos, "1/18"
 * counter, close button. Opens at the tapped photo via ?index=.
 */
export default function GalleryScreen() {
  const { venueId, index: indexParam } = useLocalSearchParams<{ venueId: string; index?: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const initialIndex = typeof indexParam === 'string' ? Math.max(0, Number(indexParam) || 0) : 0;
  const [venue, setVenue] = useState<Venue | null>(null);
  const [index, setIndex] = useState(initialIndex);

  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((n) => n + 1);

  useEffect(() => {
    let cancelled = false;
    if (typeof venueId !== 'string') return;
    setLoadFailed(false);
    (async () => {
      try {
        const result = await venueApi.getVenue(venueId);
        if (!cancelled && result) setVenue(result);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [venueId, attempt]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {loadFailed ? (
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
          <ErrorState onRetry={retry} secondaryLabel={t('common.back')} onSecondary={() => router.back()} />
        </View>
      ) : venue ? (
        <FlatList
          data={venue.photos}
          keyExtractor={(uri) => uri}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex, venue.photos.length - 1)}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, height, justifyContent: 'center' }}>
              <BrandedImage uri={item} style={{ width, height: height * 0.7 }} contentFit="contain" />
            </View>
          )}
        />
      ) : null}

      {/* Close */}
      <PressableScale
        onPress={() => router.back()}
        hapticFeedback="select"
        scaleTo={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('common.done')}
        style={{
          position: 'absolute',
          top: insets.top + spacing(2),
          left: spacing(4),
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: 'rgba(255,255,255,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="close" size={20} color="#FFFFFF" />
      </PressableScale>

      {/* Counter */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + spacing(3.5),
          alignSelf: 'center',
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: 999,
          paddingHorizontal: spacing(3),
          paddingVertical: spacing(1),
        }}
      >
        <AppText variant="bodySmStrong" style={{ color: '#FFFFFF' }}>
          {venue ? `${index + 1}/${venue.photos.length}` : ''}
        </AppText>
      </View>
    </View>
  );
}
