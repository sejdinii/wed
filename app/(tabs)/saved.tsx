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

/** Saved venues — the couple's shortlist. Weddings are chosen by committee;
 *  the shortlist is what gets passed around the family table. */
export default function SavedScreen() {
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
      <View style={{ paddingHorizontal: spacing(5), paddingTop: spacing(3), paddingBottom: spacing(4) }}>
        <AppText variant="title">{t('saved.title')}</AppText>
      </View>
      {allVenues === null ? (
        <View style={{ paddingHorizontal: spacing(5), gap: spacing(4) }}>
          <Skeleton height={220} radius={radius.lg} />
          <Skeleton height={18} width="60%" />
        </View>
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ paddingHorizontal: spacing(5), paddingBottom: spacing(8), gap: spacing(4) }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <VenueCard venue={item} />}
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title={t('saved.emptyTitle')}
              body={t('saved.emptyBody')}
              actionLabel={t('saved.emptyCta')}
              onAction={() => router.push('/(tabs)')}
            />
          }
        />
      )}
    </Screen>
  );
}
