import React, { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { EmptyState } from '@/design/components/EmptyState';
import { Screen } from '@/design/components/Screen';
import { Skeleton } from '@/design/components/Skeleton';
import { VenueCard } from '@/components/VenueCard';
import { radius, spacing } from '@/design/tokens';
import type { Venue } from '@/domain/types';
import { venueApi } from '@/data/api';
import { useFavorites } from '@/stores/favorites';
import { useI18n } from '@/i18n';

/** Wishlist — the family shortlist. Weddings are chosen by committee. */
export default function WishlistScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const favoriteIds = useFavorites((s) => s.venueIds);
  const [allVenues, setAllVenues] = useState<Venue[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await venueApi.listVenues();
      if (!cancelled) setAllVenues(result);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saved = allVenues?.filter((v) => favoriteIds.includes(v.id)) ?? [];

  return (
    <Screen>
      <View style={{ paddingHorizontal: spacing(4), paddingTop: spacing(3), paddingBottom: spacing(3) }}>
        <AppText variant="display">{t('wishlist.title')}</AppText>
      </View>
      {allVenues === null ? (
        <View style={{ paddingHorizontal: spacing(4), gap: spacing(3) }}>
          <Skeleton height={130} radius={radius.lg} />
          <Skeleton height={130} radius={radius.lg} />
        </View>
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ paddingHorizontal: spacing(4), paddingBottom: spacing(8), gap: spacing(3) }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <VenueCard venue={item} variant="split" />}
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title={t('wishlist.emptyTitle')}
              body={t('wishlist.emptyBody')}
              actionLabel={t('wishlist.emptyCta')}
              onAction={() => router.push('/(tabs)')}
            />
          }
        />
      )}
    </Screen>
  );
}
