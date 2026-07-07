import React, { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { Skeleton } from '@/design/components/Skeleton';
import { Stepper } from '@/design/components/Stepper';
import { MonthPager } from '@/components/MonthPager';
import { VenueCard } from '@/components/VenueCard';
import { useTheme } from '@/design/theme';
import { radius, shadow, spacing } from '@/design/tokens';
import { formatDowMediumDate, nextFreeSaturdays, todayISO } from '@/lib/dates';
import { venueApi } from '@/data/api';
import type { Venue } from '@/domain/types';
import { usePreferences } from '@/stores/preferences';
import { useI18n } from '@/i18n';

/**
 * Home (v3) — location header with a notification bell, the big headline,
 * a date+guests search card with one violet CTA, then Popular Venues
 * (carousel cards) and Top Rated (compact rows).
 */
export default function HomeScreen() {
  const { colors, mode } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [venues, setVenues] = useState<Venue[] | null>(null);
  // Pre-filled with the next Saturday — the default wedding day here.
  const [dateISO, setDateISO] = useState<string | null>(() => nextFreeSaturdays(todayISO(), 1, () => false)[0] ?? null);
  const [guests, setGuests] = useState(300);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [guestSheetOpen, setGuestSheetOpen] = useState(false);
  const recentCities = usePreferences((s) => s.recentCities);
  const city = recentCities[0] ?? 'skopje';

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

  const popular = venues?.filter((v) => v.featured) ?? [];
  const topRated = venues ? [...venues].sort((a, b) => b.rating - a.rating).slice(0, 4) : [];

  const searchField = (label: string, icon: React.ComponentProps<typeof Ionicons>['name'], value: string, onPress: () => void) => (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      hapticFeedback="select"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ flex: 1, gap: spacing(1) }}
    >
      <AppText variant="label" color="secondary">
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
          {value}
        </AppText>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </View>
    </PressableScale>
  );

  const sheetBase = {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing(4),
    paddingBottom: insets.bottom + spacing(5),
    gap: spacing(4),
  } as const;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
        {/* Location header + bell */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing(4), paddingTop: spacing(3), gap: spacing(2) }}>
          <PressableScale
            onPress={() => router.push('/search')}
            hapticFeedback="select"
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), flex: 1 }}
          >
            <Ionicons name="location" size={17} color={colors.primary} />
            <AppText variant="bodyStrong">
              {t(`city.${city}`)}, {t('home.country')}
            </AppText>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </PressableScale>
          {/* PLACEHOLDER — notification center lands with push in v0.3. */}
          <PressableScale onPress={() => {}} hapticFeedback="select" accessibilityRole="button" accessibilityLabel="🔔">
            <View>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              <View
                style={{
                  position: 'absolute',
                  top: 1,
                  right: 1,
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: colors.primary,
                }}
              />
            </View>
          </PressableScale>
        </View>

        {/* Headline: ink first line, violet second line + heart */}
        <View style={{ paddingHorizontal: spacing(4), paddingTop: spacing(4), gap: spacing(2) }}>
          <AppText variant="display" style={{ fontSize: 30, lineHeight: 37 }}>
            {t('home.headline1')}
            {'\n'}
            <AppText variant="display" color="brand" style={{ fontSize: 30, lineHeight: 37 }}>
              {t('home.headline2')}
            </AppText>{' '}
            <Ionicons name="heart-outline" size={25} color={colors.primary} />
          </AppText>
          <AppText variant="body" color="secondary">
            {t('home.sub')}
          </AppText>
        </View>

        {/* Search card */}
        <View
          style={[
            {
              marginHorizontal: spacing(4),
              marginTop: spacing(4),
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing(4),
              gap: spacing(4),
            },
            mode === 'light' ? shadow.card : null,
          ]}
        >
          <View style={{ flexDirection: 'row', gap: spacing(4) }}>
            {searchField(
              t('home.dateLabel'),
              'calendar-outline',
              dateISO ? formatDowMediumDate(dateISO, locale) : t('availability.pickDate'),
              () => setDateSheetOpen(true),
            )}
            <View style={{ width: 1, backgroundColor: colors.border }} />
            {searchField(t('home.guestsLabel'), 'person-outline', `${guests} ${t('common.guests')}`, () => setGuestSheetOpen(true))}
          </View>
          <Button
            title={t('home.searchCta')}
            onPress={() =>
              router.push({
                pathname: '/results',
                params: { city, ...(dateISO ? { date: dateISO } : {}), guests: String(guests) },
              })
            }
            iconLeft={<Ionicons name="search" size={16} color={colors.onPrimary} />}
            fullWidth
          />
        </View>

        {/* Popular Venues */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing(4), marginTop: spacing(6), marginBottom: spacing(3) }}>
          <AppText variant="heading">{t('home.popular')}</AppText>
          <PressableScale onPress={() => router.push('/results')} hapticFeedback="select" accessibilityRole="button">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <AppText variant="label" color="brand">
                {t('common.seeAll')}
              </AppText>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </View>
          </PressableScale>
        </View>
        {venues === null ? (
          <View style={{ flexDirection: 'row', gap: spacing(3), paddingHorizontal: spacing(4) }}>
            <Skeleton width={168} height={280} radius={radius.lg} />
            <Skeleton width={168} height={280} radius={radius.lg} />
            <Skeleton width={80} height={280} radius={radius.lg} />
          </View>
        ) : (
          <FlatList
            data={popular}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(v) => v.id}
            contentContainerStyle={{ paddingHorizontal: spacing(4), gap: spacing(3) }}
            renderItem={({ item }) => <VenueCard venue={item} variant="carousel" />}
          />
        )}

        {/* Top Rated */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing(4), marginTop: spacing(6), marginBottom: spacing(3) }}>
          <AppText variant="heading">{t('home.topRated')}</AppText>
          <PressableScale onPress={() => router.push('/results')} hapticFeedback="select" accessibilityRole="button">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <AppText variant="label" color="brand">
                {t('common.seeAll')}
              </AppText>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </View>
          </PressableScale>
        </View>
        <View style={{ paddingHorizontal: spacing(4), gap: spacing(2.5) }}>
          {venues === null
            ? [0, 1, 2].map((i) => <Skeleton key={i} height={84} radius={radius.lg} />)
            : topRated.map((venue) => <VenueCard key={venue.id} venue={venue} variant="row" />)}
        </View>
      </ScrollView>

      {/* Date sheet */}
      <Modal visible={dateSheetOpen} transparent animationType="slide" onRequestClose={() => setDateSheetOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setDateSheetOpen(false)} accessibilityRole="button" />
          <View style={sheetBase}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />
            </View>
            <MonthPager
              locale={locale}
              selectedISO={dateISO}
              minISO={todayISO()}
              stateFor={() => 'available'}
              onSelect={(iso) => {
                setDateISO(iso);
                setDateSheetOpen(false);
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Guests sheet */}
      <Modal visible={guestSheetOpen} transparent animationType="slide" onRequestClose={() => setGuestSheetOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setGuestSheetOpen(false)} accessibilityRole="button" />
          <View style={sheetBase}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="heading">{t('filters.guestCount')}</AppText>
              <Stepper value={guests} min={50} max={600} step={50} onChange={setGuests} accessibilityLabel={t('filters.guestCount')} />
            </View>
            <Button title={t('common.done')} onPress={() => setGuestSheetOpen(false)} variant="dark" size="md" fullWidth />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
