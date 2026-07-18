import React, { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Chip } from '@/design/components/Chip';
import { EmptyState } from '@/design/components/EmptyState';
import { ErrorState } from '@/design/components/ErrorState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { Skeleton } from '@/design/components/Skeleton';
import { Stepper } from '@/design/components/Stepper';
import { MonthPager } from '@/components/MonthPager';
import { VenueCard } from '@/components/VenueCard';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMediumDate, todayISO } from '@/lib/dates';
import { cheapestPerGuest, minEstimateMkd, minKaparMkd } from '@/domain/kapar';
import { formatMkd } from '@/lib/money';
import type { CityKey, Venue, VenueType } from '@/domain/types';
import { venueApi } from '@/data/api';
import { useI18n } from '@/i18n';

const TYPES: VenueType[] = ['garden', 'lake', 'ballroom', 'terrace', 'panoramic', 'restaurant'];
type PriceBand = 'b1' | 'b2' | 'b3' | null;
type KaparBand = 18500 | 40000 | null;
type MinScore = 8 | 9 | null;
type SortKey = 'recommended' | 'priceAsc' | 'scoreDesc';

interface Filters {
  dateISO: string | null;
  guests: number;
  type: VenueType | null;
  priceBand: PriceBand;
  maxKapar: KaparBand;
  minScore: MinScore;
}

const EMPTY_FILTERS: Omit<Filters, 'dateISO' | 'guests' | 'type'> & Pick<Filters, 'dateISO' | 'guests' | 'type'> = {
  dateISO: null,
  guests: 0,
  type: null,
  priceBand: null,
  maxKapar: null,
  minScore: null,
};

function applyFilters(venues: Venue[], f: Filters): Venue[] {
  return venues.filter((v) => {
    if (f.dateISO && v.bookedDates.includes(f.dateISO)) return false;
    if (f.guests > 0 && v.capacityMax < f.guests) return false;
    if (f.type && v.venueType !== f.type) return false;
    const price = cheapestPerGuest(v);
    if (f.priceBand === 'b1' && price > 1250) return false;
    if (f.priceBand === 'b2' && (price <= 1250 || price > 1800)) return false;
    if (f.priceBand === 'b3' && price <= 1800) return false;
    if (f.maxKapar && minKaparMkd(v) > f.maxKapar) return false;
    if (f.minScore && v.rating * 2 < f.minScore) return false;
    return true;
  });
}

function applySort(venues: Venue[], sort: SortKey): Venue[] {
  const sorted = [...venues];
  if (sort === 'priceAsc') sorted.sort((a, b) => minEstimateMkd(a) - minEstimateMkd(b));
  if (sort === 'scoreDesc') sorted.sort((a, b) => b.rating - a.rating);
  // 'recommended' keeps catalogue order: featured venues first is the seed order.
  return sorted;
}

/**
 * Search results (v3) — back + title + Filter button, a context row
 * (location · date · guests), "N venues found" with the sort label, split
 * cards, and a floating Map View pill.
 */
export default function ResultsScreen() {
  const params = useLocalSearchParams<{ city?: CityKey; type?: VenueType; date?: string; guests?: string }>();
  const city = typeof params.city === 'string' ? (params.city as CityKey) : null;
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [filters, setFilters] = useState<Filters>({
    ...EMPTY_FILTERS,
    dateISO: typeof params.date === 'string' ? params.date : null,
    guests: typeof params.guests === 'string' ? Number(params.guests) || 0 : 0,
    type: typeof params.type === 'string' ? (params.type as VenueType) : null,
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>('recommended');
  const [sortOpen, setSortOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(filters);

  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((n) => n + 1);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    (async () => {
      try {
        const result = await venueApi.listVenues({ city: city ?? undefined });
        if (!cancelled) setVenues(result);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [city, attempt]);

  const visible = venues ? applySort(applyFilters(venues, filters), sort) : null;
  const draftCount = venues ? applyFilters(venues, draft).length : 0;
  const hasFilters =
    filters.dateISO !== null ||
    filters.guests > 0 ||
    filters.type !== null ||
    filters.priceBand !== null ||
    filters.maxKapar !== null ||
    filters.minScore !== null;
  const sortLabel: Record<SortKey, string> = {
    recommended: t('results.recommended'),
    priceAsc: t('sort.priceAsc'),
    scoreDesc: t('sort.scoreDesc'),
  };

  const openSheet = () => {
    setDraft(filters);
    setSheetOpen(true);
  };

  return (
    <Screen>
      {/* Header: back · title · Filter */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing(4),
          paddingVertical: spacing(3),
          gap: spacing(3),
        }}
      >
        <PressableScale onPress={() => router.back()} hapticFeedback="select" accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </PressableScale>
        <AppText variant="heading" style={{ flex: 1, textAlign: 'center' }}>
          {t('results.title')}
        </AppText>
        <PressableScale
          onPress={openSheet}
          hapticFeedback="select"
          accessibilityRole="button"
          accessibilityLabel={t('filters.title')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing(1.5),
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing(3),
            paddingVertical: spacing(2),
            backgroundColor: colors.surface,
          }}
        >
          <AppText variant="label">{t('filters.title')}</AppText>
          <Ionicons name="options-outline" size={15} color={colors.text} />
        </PressableScale>
      </View>

      {/* Context row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing(2),
          paddingHorizontal: spacing(4),
          paddingBottom: spacing(3),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Ionicons name="location-outline" size={14} color={colors.primary} />
        <AppText variant="bodySmStrong">{city ? `${t(`city.${city}`)}, ${t('home.country')}` : t('home.country')}</AppText>
        {filters.dateISO ? (
          <>
            <AppText variant="bodySm" color="tertiary">·</AppText>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <AppText variant="bodySmStrong">{formatMediumDate(filters.dateISO, locale)}</AppText>
          </>
        ) : null}
        {filters.guests > 0 ? (
          <>
            <AppText variant="bodySm" color="tertiary">·</AppText>
            <Ionicons name="people-outline" size={14} color={colors.primary} />
            <AppText variant="bodySmStrong">
              {filters.guests} {t('common.guests')}
            </AppText>
          </>
        ) : null}
      </View>

      {/* Count + sort */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing(4),
          paddingVertical: spacing(3),
        }}
      >
        <AppText variant="bodyStrong">{visible !== null ? t('results.found', { count: visible.length }) : ' '}</AppText>
        <PressableScale
          onPress={() => setSortOpen(true)}
          hapticFeedback="select"
          accessibilityRole="button"
          accessibilityLabel={t('results.sortBy')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
            <AppText variant="bodySm" color="secondary">
              {t('results.sortBy')}
            </AppText>
            <AppText variant="bodySmStrong" color="brand">
              {sortLabel[sort]}
            </AppText>
            <Ionicons name="chevron-down" size={13} color={colors.primary} />
          </View>
        </PressableScale>
      </View>

      <FlatList
        data={visible ?? []}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ paddingHorizontal: spacing(4), paddingBottom: spacing(20), gap: spacing(3) }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <VenueCard venue={item} variant="split" showAvailable={filters.dateISO !== null} />}
        ListEmptyComponent={
          loadFailed ? (
            <ErrorState onRetry={retry} />
          ) : visible === null ? (
            <View style={{ gap: spacing(3) }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={150} radius={radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="calendar-clear-outline"
              title={t('results.emptyTitle')}
              body={t('results.emptyBody')}
              actionLabel={hasFilters ? t('filters.clearAll') : undefined}
              onAction={hasFilters ? () => setFilters({ ...EMPTY_FILTERS }) : undefined}
            />
          )
        }
      />

      {/* Sort options sheet */}
      <Modal visible={sortOpen} transparent animationType="slide" onRequestClose={() => setSortOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setSortOpen(false)} accessibilityRole="button" />
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing(4),
              paddingBottom: insets.bottom + spacing(5),
              gap: spacing(2),
            }}
          >
            <AppText variant="heading" style={{ marginBottom: spacing(2) }}>
              {t('results.sortBy')}
            </AppText>
            {(['recommended', 'priceAsc', 'scoreDesc'] as const).map((key) => (
              <PressableScale
                key={key}
                onPress={() => {
                  setSort(key);
                  setSortOpen(false);
                }}
                hapticFeedback="select"
                scaleTo={0.99}
                accessibilityRole="radio"
                accessibilityState={{ selected: sort === key }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2.5), paddingVertical: spacing(2.5) }}
              >
                <Ionicons
                  name={sort === key ? 'radio-button-on' : 'radio-button-off'}
                  size={19}
                  color={sort === key ? colors.primary : colors.textTertiary}
                />
                <AppText variant="body">{sortLabel[key]}</AppText>
              </PressableScale>
            ))}
          </View>
        </View>
      </Modal>

      {/* Map View pill removed (Wave 5 honesty sweep) — it only fired a
          haptic and pretended to open a map. Map view lands Wave 6 with real
          founder research behind it; see SUGGESTIONS in the wave report. */}

      {/* Filters sheet */}
      <Modal visible={sheetOpen} animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Screen edges={['top', 'bottom']}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: spacing(4),
              paddingVertical: spacing(3),
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <AppText variant="title">{t('filters.title')}</AppText>
            <Pressable onPress={() => setSheetOpen(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing(4), gap: spacing(5), paddingBottom: spacing(10) }}>
            <View style={{ gap: spacing(3) }}>
              <AppText variant="heading">{t('filters.weddingDate')}</AppText>
              <MonthPager
                locale={locale}
                selectedISO={draft.dateISO}
                minISO={todayISO()}
                stateFor={() => 'available'}
                onSelect={(iso) => setDraft((d) => ({ ...d, dateISO: d.dateISO === iso ? null : iso }))}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <AppText variant="heading">{t('filters.guestCount')}</AppText>
                <AppText variant="bodySm" color="tertiary">
                  {draft.guests === 0 ? t('filters.any') : `${draft.guests} ${t('common.guests')}`}
                </AppText>
              </View>
              <Stepper
                value={draft.guests}
                min={0}
                max={600}
                step={50}
                onChange={(guests) => setDraft((d) => ({ ...d, guests }))}
                accessibilityLabel={t('filters.guestCount')}
              />
            </View>

            <View style={{ gap: spacing(3) }}>
              <AppText variant="heading">{t('filters.venueType')}</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                <Chip label={t('filters.any')} selected={draft.type === null} onPress={() => setDraft((d) => ({ ...d, type: null }))} />
                {TYPES.map((type) => (
                  <Chip
                    key={type}
                    label={t(`venueTypeShort.${type}`)}
                    selected={draft.type === type}
                    onPress={() => setDraft((d) => ({ ...d, type: d.type === type ? null : type }))}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: spacing(3) }}>
              <AppText variant="heading">{t('filters.pricePerGuest')}</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                {(
                  [
                    ['b1', t('filters.priceBand1')],
                    ['b2', t('filters.priceBand2')],
                    ['b3', t('filters.priceBand3')],
                  ] as const
                ).map(([band, label]) => (
                  <Chip
                    key={band}
                    label={label}
                    selected={draft.priceBand === band}
                    onPress={() => setDraft((d) => ({ ...d, priceBand: d.priceBand === band ? null : band }))}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: spacing(3) }}>
              <AppText variant="heading">{t('filters.minScore')}</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                <Chip label={t('filters.any')} selected={draft.minScore === null} onPress={() => setDraft((d) => ({ ...d, minScore: null }))} />
                {([8, 9] as const).map((score) => (
                  <Chip
                    key={score}
                    label={`${score}+`}
                    selected={draft.minScore === score}
                    onPress={() => setDraft((d) => ({ ...d, minScore: d.minScore === score ? null : score }))}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: spacing(3) }}>
              <AppText variant="heading">{t('filters.kapar')}</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                <Chip label={t('filters.any')} selected={draft.maxKapar === null} onPress={() => setDraft((d) => ({ ...d, maxKapar: null }))} />
                {([18500, 40000] as const).map((cap) => (
                  <Chip
                    key={cap}
                    label={t('filters.kaparUpTo', { amount: formatMkd(cap, locale) })}
                    selected={draft.maxKapar === cap}
                    onPress={() => setDraft((d) => ({ ...d, maxKapar: d.maxKapar === cap ? null : cap }))}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing(4),
              borderTopWidth: 1,
              borderTopColor: colors.border,
              padding: spacing(4),
              paddingBottom: insets.bottom > 0 ? insets.bottom : spacing(4),
            }}
          >
            <Pressable
              onPress={() => {
                haptic.select();
                setDraft({ ...EMPTY_FILTERS });
              }}
              accessibilityRole="button"
            >
              <AppText variant="bodyStrong" style={{ textDecorationLine: 'underline' }}>
                {t('filters.clearAll')}
              </AppText>
            </Pressable>
            <Button
              title={t('filters.show', { count: draftCount })}
              onPress={() => {
                setFilters(draft);
                setSheetOpen(false);
              }}
              style={{ flex: 1 }}
            />
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}
