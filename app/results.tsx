import React, { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Chip } from '@/design/components/Chip';
import { EmptyState } from '@/design/components/EmptyState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { Skeleton } from '@/design/components/Skeleton';
import { Stepper } from '@/design/components/Stepper';
import { MonthPager } from '@/components/MonthPager';
import { VenueCard } from '@/components/VenueCard';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatShortDate, todayISO } from '@/lib/dates';
import { cheapestPerGuest, minKaparMkd } from '@/domain/kapar';
import type { CityKey, Venue, VenueType } from '@/domain/types';
import { venueApi } from '@/data/api';
import { useI18n } from '@/i18n';

const TYPES: VenueType[] = ['garden', 'lake', 'ballroom', 'terrace', 'panoramic', 'restaurant'];
type PriceBand = 'b1' | 'b2' | 'b3' | null;
type KaparBand = 25000 | 40000 | null;

interface Filters {
  dateISO: string | null;
  guests: number;
  type: VenueType | null;
  priceBand: PriceBand;
  maxKapar: KaparBand;
}

function applyFilters(venues: Venue[], f: Filters): Venue[] {
  return venues.filter((v) => {
    if (f.dateISO && v.bookedDates.includes(f.dateISO)) return false;
    if (f.guests > 0 && v.capacityMax < f.guests) return false;
    if (f.type && v.venueType !== f.type) return false;
    const price = cheapestPerGuest(v);
    if (f.priceBand === 'b1' && price > 1200) return false;
    if (f.priceBand === 'b2' && (price <= 1200 || price > 1800)) return false;
    if (f.priceBand === 'b3' && price <= 1800) return false;
    if (f.maxKapar && minKaparMkd(v) > f.maxKapar) return false;
    return true;
  });
}

/**
 * Results — split cards under a compact search header + filter pill row.
 * The full filter sheet edits a working copy and applies atomically, with a
 * live result count on the apply button.
 */
export default function ResultsScreen() {
  const params = useLocalSearchParams<{ city?: CityKey; type?: VenueType }>();
  const city = typeof params.city === 'string' ? (params.city as CityKey) : null;
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [filters, setFilters] = useState<Filters>({
    dateISO: null,
    guests: 0,
    type: typeof params.type === 'string' ? (params.type as VenueType) : null,
    priceBand: null,
    maxKapar: null,
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(filters);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await venueApi.listVenues({ city: city ?? undefined });
      if (!cancelled) setVenues(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [city]);

  const visible = venues ? applyFilters(venues, filters) : null;
  const draftCount = venues ? applyFilters(venues, draft).length : 0;
  const hasFilters = filters.dateISO !== null || filters.guests > 0 || filters.type !== null || filters.priceBand !== null || filters.maxKapar !== null;

  const openSheet = () => {
    setDraft(filters);
    setSheetOpen(true);
  };

  const headerLabel = [
    city ? t(`city.${city}`) : t('results.all'),
    filters.dateISO ? formatShortDate(filters.dateISO, locale) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen>
      {/* Compact search header */}
      <PressableScale
        onPress={() => router.push('/search')}
        scaleTo={0.98}
        hapticFeedback="select"
        accessibilityRole="button"
        accessibilityLabel={headerLabel}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(2.5),
          marginHorizontal: spacing(4),
          marginTop: spacing(3),
          height: 46,
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: colors.border,
          paddingHorizontal: spacing(4),
          backgroundColor: colors.surface,
        }}
      >
        <Ionicons name="arrow-back" size={18} color={colors.text} onPress={() => router.back()} />
        <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
          {headerLabel}
        </AppText>
        <Ionicons name="options-outline" size={19} color={colors.text} onPress={openSheet} />
      </PressableScale>

      {/* Filter pills */}
      <View style={{ height: 54 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing(4), gap: spacing(2), alignItems: 'center' }}>
          <Chip
            label={filters.dateISO ? formatShortDate(filters.dateISO, locale) : t('results.date')}
            selected={filters.dateISO !== null}
            onPress={openSheet}
            icon={<Ionicons name="calendar-outline" size={14} color={filters.dateISO ? colors.onPrimary : colors.text} />}
          />
          <Chip
            label={filters.guests > 0 ? `${filters.guests} ${t('common.guests')}` : t('results.guests')}
            selected={filters.guests > 0}
            onPress={openSheet}
          />
          <Chip
            label={filters.type ? t(`venueTypeShort.${filters.type}`) : t('results.type')}
            selected={filters.type !== null}
            onPress={openSheet}
          />
          {hasFilters ? (
            <Chip
              label={t('filters.clearAll')}
              onPress={() => {
                haptic.select();
                setFilters({ dateISO: null, guests: 0, type: null, priceBand: null, maxKapar: null });
              }}
            />
          ) : null}
        </ScrollView>
      </View>

      {visible !== null ? (
        <AppText variant="bodySm" color="secondary" style={{ marginHorizontal: spacing(4), marginBottom: spacing(2) }}>
          {filters.dateISO
            ? t('results.freeOn', { count: visible.length, date: formatShortDate(filters.dateISO, locale) })
            : city
              ? t('results.inCity', { city: t(`city.${city}`) })
              : t('results.all')}
        </AppText>
      ) : null}

      <FlatList
        data={visible ?? []}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ paddingHorizontal: spacing(4), paddingBottom: spacing(8), gap: spacing(3) }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <VenueCard venue={item} variant="split" />}
        ListEmptyComponent={
          visible === null ? (
            <View style={{ gap: spacing(3) }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={130} radius={radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="calendar-clear-outline"
              title={t('results.emptyTitle')}
              body={t('results.emptyBody')}
              actionLabel={hasFilters ? t('filters.clearAll') : undefined}
              onAction={
                hasFilters
                  ? () => setFilters({ dateISO: null, guests: 0, type: null, priceBand: null, maxKapar: null })
                  : undefined
              }
            />
          )
        }
      />

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
                isBlocked={() => false}
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
              <AppText variant="heading">{t('filters.kapar')}</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                <Chip label={t('filters.any')} selected={draft.maxKapar === null} onPress={() => setDraft((d) => ({ ...d, maxKapar: null }))} />
                {([25000, 40000] as const).map((cap) => (
                  <Chip
                    key={cap}
                    label={t('filters.kaparUpTo', { amount: `${cap / 1000}.000 ден.` })}
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
                setDraft({ dateISO: null, guests: 0, type: null, priceBand: null, maxKapar: null });
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
