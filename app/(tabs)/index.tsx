import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { Card } from '@/design/components/Card';
import { Chip } from '@/design/components/Chip';
import { EmptyState } from '@/design/components/EmptyState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { SectionHeader } from '@/design/components/SectionHeader';
import { Skeleton } from '@/design/components/Skeleton';
import { MonthPager } from '@/components/MonthPager';
import { VenueCard } from '@/components/VenueCard';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMediumDate, todayISO } from '@/lib/dates';
import { venueApi } from '@/data/api';
import type { CityKey, Venue } from '@/domain/types';
import { useI18n } from '@/i18n';

const CITIES: CityKey[] = ['skopje', 'ohrid', 'bitola', 'tetovo', 'struga', 'kumanovo', 'veles', 'prilep'];

/**
 * Explore — the storefront.
 *
 * Discovery here is date-first: in North Macedonia the wedding date is chosen
 * before the venue (church calendars, family logistics, "our Saturday"), and
 * peak-season Saturdays sell out a year ahead. So the primary control is
 * "Кога е свадбата?" — pick a date and the catalogue instantly reduces to
 * venues actually free that day. No CTA button: filters apply immediately.
 */
export default function ExploreScreen() {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const insets = useSafeAreaInsets();

  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dateISO, setDateISO] = useState<string | null>(null);
  const [city, setCity] = useState<CityKey | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setVenues(null);
      else setRefreshing(true);
      try {
        const result = await venueApi.listVenues({
          city: city ?? undefined,
          dateISO: dateISO ?? undefined,
        });
        setVenues(result);
      } finally {
        setRefreshing(false);
      }
    },
    [city, dateISO],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setVenues(null);
      const result = await venueApi.listVenues({ city: city ?? undefined, dateISO: dateISO ?? undefined });
      if (!cancelled) setVenues(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [city, dateISO]);

  const featured = venues?.filter((v) => v.featured) ?? [];
  const hasActiveFilters = dateISO !== null || city !== null;

  const clearFilters = () => {
    haptic.select();
    setDateISO(null);
    setCity(null);
  };

  const header = (
    <View style={{ gap: spacing(5), paddingBottom: spacing(5) }}>
      {/* Brand header */}
      <View style={{ paddingHorizontal: spacing(5), paddingTop: spacing(3), gap: spacing(1) }}>
        <AppText variant="display" color="brand">
          {t('common.appName')}
        </AppText>
        <AppText variant="body" color="secondary">
          {t('explore.tagline')}
        </AppText>
      </View>

      {/* Date-first search card */}
      <View style={{ paddingHorizontal: spacing(5) }}>
        <Card padding={4} style={{ gap: spacing(3) }}>
          <AppText variant="subheading">{t('explore.searchTitle')}</AppText>
          <PressableScale
            onPress={() => setCalendarOpen(true)}
            hapticFeedback="select"
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={t('explore.searchDatePlaceholder')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing(3),
              borderWidth: 1.5,
              borderColor: dateISO ? colors.primary : colors.borderStrong,
              borderRadius: radius.md,
              paddingHorizontal: spacing(4),
              height: 52,
              backgroundColor: dateISO ? colors.primarySoft : 'transparent',
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={dateISO ? colors.onPrimarySoft : colors.textSecondary} />
            <AppText variant="bodyStrong" style={{ flex: 1, color: dateISO ? colors.onPrimarySoft : colors.textSecondary }}>
              {dateISO ? formatMediumDate(dateISO, locale) : t('explore.searchDatePlaceholder')}
            </AppText>
            {dateISO ? (
              <Pressable
                onPress={() => {
                  haptic.select();
                  setDateISO(null);
                }}
                hitSlop={10}
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={20} color={colors.onPrimarySoft} />
              </Pressable>
            ) : null}
          </PressableScale>
        </Card>
      </View>

      {/* City filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing(5), gap: spacing(2) }}
      >
        <Chip label={t('explore.cityAll')} selected={city === null} onPress={() => setCity(null)} />
        {CITIES.map((key) => (
          <Chip key={key} label={t(`city.${key}`)} selected={city === key} onPress={() => setCity(key)} />
        ))}
      </ScrollView>

      {/* Featured carousel (browsing mode) or results header (searching mode) */}
      {venues === null ? (
        <View style={{ paddingHorizontal: spacing(5), gap: spacing(3) }}>
          <Skeleton height={210} radius={radius.lg} />
          <Skeleton height={20} width="55%" />
        </View>
      ) : dateISO ? (
        <View
          style={{
            paddingHorizontal: spacing(5),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <AppText variant="heading" style={{ flexShrink: 1 }}>
            {t('explore.resultsFor', { date: formatMediumDate(dateISO, locale) })}
          </AppText>
        </View>
      ) : featured.length > 0 ? (
        <View style={{ gap: spacing(3) }}>
          <SectionHeader title={t('explore.featured')} />
          <FlatList
            data={featured}
            keyExtractor={(v) => v.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing(5), gap: spacing(3) }}
            renderItem={({ item }) => <VenueCard venue={item} variant="featured" />}
          />
          <View style={{ height: spacing(2) }} />
          <SectionHeader title={t('explore.allVenues')} />
        </View>
      ) : (
        <SectionHeader title={t('explore.allVenues')} />
      )}
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={venues ?? []}
        keyExtractor={(v) => v.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing(5), marginBottom: spacing(4) }}>
            <VenueCard venue={item} />
          </View>
        )}
        ListEmptyComponent={
          venues === null ? (
            <View style={{ paddingHorizontal: spacing(5), gap: spacing(4) }}>
              {[0, 1].map((i) => (
                <View key={i} style={{ gap: spacing(2) }}>
                  <Skeleton height={220} radius={radius.lg} />
                  <Skeleton height={18} width="70%" />
                  <Skeleton height={14} width="45%" />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="calendar-clear-outline"
              title={t('explore.noResultsTitle')}
              body={t('explore.noResultsBody')}
              actionLabel={hasActiveFilters ? t('explore.clearFilters') : undefined}
              onAction={hasActiveFilters ? clearFilters : undefined}
            />
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={colors.textSecondary} />
        }
        contentContainerStyle={{ paddingBottom: spacing(8) }}
        showsVerticalScrollIndicator={false}
      />

      {/* Date picker sheet */}
      <Modal visible={calendarOpen} transparent animationType="slide" onRequestClose={() => setCalendarOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setCalendarOpen(false)} accessibilityRole="button" />
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing(5),
              paddingBottom: insets.bottom + spacing(5),
              gap: spacing(4),
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />
            </View>
            <AppText variant="heading">{t('explore.searchTitle')}</AppText>
            <MonthPager
              locale={locale}
              selectedISO={dateISO}
              minISO={todayISO()}
              isBlocked={() => false}
              onSelect={(iso) => {
                setDateISO(iso);
                setCalendarOpen(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
