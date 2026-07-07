import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { Skeleton } from '@/design/components/Skeleton';
import { VenueCard } from '@/components/VenueCard';
import { useTheme } from '@/design/theme';
import { radius, shadow, spacing } from '@/design/tokens';
import { venueApi } from '@/data/api';
import { TRENDING_CITIES } from '@/data/cities';
import type { Venue, VenueType } from '@/domain/types';
import { useI18n } from '@/i18n';

const TYPE_ORDER: VenueType[] = ['garden', 'lake', 'ballroom', 'panoramic', 'terrace', 'restaurant'];

/**
 * Home — search pill on top, numbered trending cities, then one horizontal
 * carousel per venue category. Pure discovery; every tap leads toward a venue.
 */
export default function HomeScreen() {
  const { colors, mode } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const result = await venueApi.listVenues();
    setVenues(result);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await venueApi.listVenues();
      if (!cancelled) setVenues(result);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = TYPE_ORDER.map((type) => ({
    type,
    venues: (venues ?? []).filter((v) => v.venueType === type),
  })).filter((s) => s.venues.length > 0);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing(8) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.textSecondary}
          />
        }
      >
        {/* Search pill */}
        <PressableScale
          onPress={() => router.push('/search')}
          scaleTo={0.98}
          hapticFeedback="select"
          accessibilityRole="button"
          accessibilityLabel={t('home.searchPlaceholder')}
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing(2.5),
              marginHorizontal: spacing(4),
              marginTop: spacing(3),
              height: 50,
              borderRadius: radius.pill,
              borderWidth: 1.5,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingHorizontal: spacing(4),
            },
            mode === 'light' ? shadow.card : null,
          ]}
        >
          <Ionicons name="search" size={19} color={colors.textSecondary} />
          <AppText variant="body" color="secondary">
            {t('home.searchPlaceholder')}
          </AppText>
        </PressableScale>

        {/* Trending cities */}
        <AppText variant="heading" style={{ marginHorizontal: spacing(4), marginTop: spacing(6), marginBottom: spacing(3) }}>
          {t('home.topCities')}
        </AppText>
        {venues === null ? (
          <View style={{ flexDirection: 'row', gap: spacing(2.5), paddingHorizontal: spacing(4) }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width={96} height={90} radius={radius.md} />
            ))}
          </View>
        ) : (
          <FlatList
            data={TRENDING_CITIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(c) => c}
            contentContainerStyle={{ paddingHorizontal: spacing(4), gap: spacing(2.5) }}
            renderItem={({ item, index }) => {
              const cityVenue = venues.find((v) => v.city === item);
              return (
                <PressableScale
                  onPress={() => router.push({ pathname: '/results', params: { city: item } })}
                  scaleTo={0.96}
                  hapticFeedback="select"
                  accessibilityRole="button"
                  accessibilityLabel={t(`city.${item}`)}
                  style={{ width: 96 }}
                >
                  <View style={{ borderRadius: radius.md, overflow: 'hidden', height: 68 }}>
                    <Image
                      source={{ uri: cityVenue?.photos[0] }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={200}
                      accessibilityIgnoresInvertColors
                    />
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: spacing(2),
                        backgroundColor: colors.urgency,
                        paddingHorizontal: spacing(1.5),
                        paddingVertical: 3,
                        borderBottomLeftRadius: 4,
                        borderBottomRightRadius: 4,
                      }}
                    >
                      <AppText variant="caption" style={{ color: '#FFFFFF' }}>
                        #{index + 1}
                      </AppText>
                    </View>
                  </View>
                  <AppText variant="bodySmStrong" style={{ marginTop: spacing(1) }}>
                    {t(`city.${item}`)}
                  </AppText>
                </PressableScale>
              );
            }}
          />
        )}

        {/* Category carousels */}
        {venues === null ? (
          <View style={{ paddingHorizontal: spacing(4), marginTop: spacing(6), gap: spacing(3) }}>
            <Skeleton width="45%" height={20} />
            <View style={{ flexDirection: 'row', gap: spacing(3) }}>
              <Skeleton width={210} height={200} radius={radius.lg} />
              <Skeleton width={210} height={200} radius={radius.lg} />
            </View>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.type} style={{ marginTop: spacing(6) }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginHorizontal: spacing(4),
                  marginBottom: spacing(3),
                }}
              >
                <AppText variant="heading">{t(`venueType.${section.type}`)}</AppText>
                <PressableScale
                  onPress={() => router.push({ pathname: '/results', params: { type: section.type } })}
                  hapticFeedback="select"
                  accessibilityRole="button"
                >
                  <AppText variant="label" color="brand">
                    {t('common.seeAll')}
                  </AppText>
                </PressableScale>
              </View>
              <FlatList
                data={section.venues}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(v) => v.id}
                contentContainerStyle={{ paddingHorizontal: spacing(4), gap: spacing(3) }}
                renderItem={({ item }) => <VenueCard venue={item} variant="carousel" />}
              />
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
