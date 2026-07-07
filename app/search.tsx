import React, { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { useTheme } from '@/design/theme';
import { radius, spacing, typeScale } from '@/design/tokens';
import { CITIES } from '@/data/cities';
import { VENUES } from '@/data/venues';
import type { CityKey } from '@/domain/types';
import { usePreferences } from '@/stores/preferences';
import { useI18n } from '@/i18n';

/** Latin fallback names so diaspora users can type "ohrid" on any keyboard. */
const LATIN: Record<CityKey, string> = {
  skopje: 'skopje',
  tetovo: 'tetovo',
  gostivar: 'gostivar',
  ohrid: 'ohrid',
  bitola: 'bitola',
  struga: 'struga',
  kumanovo: 'kumanovo',
  prilep: 'prilep',
  veles: 'veles',
  stip: 'stip',
  strumica: 'strumica',
  kavadarci: 'kavadarci',
  gevgelija: 'gevgelija',
};

/** City search overlay — recents, live-filtered list, region + venue count per row. */
export default function SearchScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const recentCities = usePreferences((s) => s.recentCities);
  const pushRecentCity = usePreferences((s) => s.pushRecentCity);

  const venueCount = useMemo(() => {
    const counts = new Map<CityKey, number>();
    for (const venue of VENUES) counts.set(venue.city, (counts.get(venue.city) ?? 0) + 1);
    return counts;
  }, []);

  const q = query.trim().toLowerCase();
  const matches = CITIES.filter(
    (c) => q.length === 0 || t(`city.${c.key}`).toLowerCase().includes(q) || LATIN[c.key].includes(q),
  );

  const openCity = (city: CityKey) => {
    pushRecentCity(city);
    router.replace({ pathname: '/results', params: { city } });
  };

  const CityRow = ({ city }: { city: CityKey }) => {
    const region = CITIES.find((c) => c.key === city)?.region;
    const count = venueCount.get(city) ?? 0;
    return (
      <PressableScale
        onPress={() => openCity(city)}
        scaleTo={0.99}
        hapticFeedback="select"
        accessibilityRole="button"
        accessibilityLabel={t(`city.${city}`)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(3),
          paddingVertical: spacing(3),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="location-outline" size={17} color={colors.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{t(`city.${city}`)}</AppText>
          <AppText variant="bodySm" color="secondary">
            {region ? t(`region.${region}`) : ''}
            {count > 0 ? ` · ${t('search.venueCount', { count })}` : ''}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </PressableScale>
    );
  };

  return (
    <Screen>
      {/* Active search field */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(2.5),
          marginHorizontal: spacing(4),
          marginTop: spacing(3),
          height: 50,
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: colors.primary,
          paddingHorizontal: spacing(4),
          backgroundColor: colors.surface,
        }}
      >
        <PressableScale onPress={() => router.back()} hapticFeedback="select" accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="arrow-back" size={19} color={colors.text} />
        </PressableScale>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.textTertiary}
          autoFocus
          autoCorrect={false}
          accessibilityLabel={t('search.placeholder')}
          style={{ flex: 1, ...typeScale.body, color: colors.text }}
        />
        {query.length > 0 ? (
          <PressableScale onPress={() => setQuery('')} hapticFeedback="select" accessibilityRole="button" accessibilityLabel="✕">
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </PressableScale>
        ) : null}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing(4), paddingBottom: spacing(8) }}
      >
        {q.length === 0 && recentCities.length > 0 ? (
          <>
            <AppText variant="caption" color="tertiary" style={{ marginTop: spacing(5), marginBottom: spacing(1) }}>
              {t('search.recent').toUpperCase()}
            </AppText>
            {recentCities.map((city) => (
              <CityRow key={`r-${city}`} city={city} />
            ))}
          </>
        ) : null}

        <AppText variant="caption" color="tertiary" style={{ marginTop: spacing(5), marginBottom: spacing(1) }}>
          {(q.length > 0 ? t('search.results') : t('search.allCities')).toUpperCase()}
        </AppText>
        {matches.map((c) => (
          <CityRow key={c.key} city={c.key} />
        ))}
      </ScrollView>
    </Screen>
  );
}
