import React, { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { EmptyState } from '@/design/components/EmptyState';
import { ErrorState } from '@/design/components/ErrorState';
import { Skeleton } from '@/design/components/Skeleton';
import { ScoreBadge } from '@/components/ScoreBadge';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { formatMediumDate } from '@/lib/dates';
import { SCORE_CATEGORIES } from '@/domain/reviews';
import type { Review, Venue } from '@/domain/types';
import { venueApi } from '@/data/api';
import { useI18n } from '@/i18n';

/**
 * Guest reviews: overall score plaque, per-category bars, then the review
 * list — each card with author, score box, wedding details, and the
 * loved / remarks split. Display-only in MVP (seeded), per spec.
 */
export default function ReviewsScreen() {
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);

  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((n) => n + 1);

  useEffect(() => {
    let cancelled = false;
    if (typeof venueId !== 'string') return;
    setLoadFailed(false);
    (async () => {
      try {
        const [v, r] = await Promise.all([venueApi.getVenue(venueId), venueApi.listReviews(venueId)]);
        if (!cancelled) {
          if (v) setVenue(v);
          setReviews(r);
        }
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [venueId, attempt]);

  const header = venue ? (
    <View style={{ gap: spacing(4), paddingBottom: spacing(4) }}>
      <ScoreBadge venue={venue} size="md" />
      <View style={{ gap: spacing(2.5) }}>
        {SCORE_CATEGORIES.map(({ key, labelKey }) => {
          const value = venue.scores[key];
          return (
            <View key={key} style={{ gap: spacing(1) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="bodySm" color="secondary">
                  {t(labelKey)}
                </AppText>
                <AppText variant="bodySmStrong">{value.toFixed(1)}</AppText>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceElevated, overflow: 'hidden' }}>
                <View style={{ width: `${value * 10}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 3 }} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  ) : (
    <View style={{ gap: spacing(3), paddingBottom: spacing(4) }}>
      <Skeleton height={34} width="55%" />
      <Skeleton height={120} radius={radius.md} />
    </View>
  );

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing(4),
          paddingVertical: spacing(3),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <PressableScale onPress={() => router.back()} hapticFeedback="select" accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </PressableScale>
        <AppText variant="heading" style={{ flex: 1, textAlign: 'center' }}>
          {t('reviews.title')}
        </AppText>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={reviews ?? []}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loadFailed ? (
            <ErrorState onRetry={retry} />
          ) : reviews === null ? (
            <View style={{ gap: spacing(3) }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={120} radius={radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState icon="chatbox-ellipses-outline" title={t('reviews.emptyTitle')} body={t('reviews.emptyBody')} />
          )
        }
        contentContainerStyle={{ padding: spacing(4), gap: spacing(3), paddingBottom: spacing(8) }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.lg,
              padding: spacing(3.5),
              gap: spacing(2.5),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2.5) }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.mint,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="bodySmStrong" style={{ color: colors.onMint }}>
                  {item.author.charAt(0)}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodySmStrong">{item.author}</AppText>
                <AppText variant="caption" color="secondary">
                  {t('reviews.guestLine', { guests: item.guestCount, date: formatMediumDate(item.eventDateISO, locale) })}
                </AppText>
              </View>
              <View
                style={{
                  minWidth: 28,
                  height: 28,
                  paddingHorizontal: 4,
                  borderRadius: radius.sm,
                  borderBottomLeftRadius: 0,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="bodySmStrong" style={{ color: colors.onPrimary }}>
                  {item.score.toFixed(1)}
                </AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing(2), alignItems: 'flex-start' }}>
              <Ionicons name="happy-outline" size={15} color={colors.success} style={{ marginTop: 2 }} />
              <AppText variant="bodySm" style={{ flex: 1 }}>
                {item.positive}
              </AppText>
            </View>
            {item.negative ? (
              <View style={{ flexDirection: 'row', gap: spacing(2), alignItems: 'flex-start' }}>
                <Ionicons name="sad-outline" size={15} color={colors.textTertiary} style={{ marginTop: 2 }} />
                <AppText variant="bodySm" color="secondary" style={{ flex: 1 }}>
                  {item.negative}
                </AppText>
              </View>
            ) : null}
          </View>
        )}
      />
    </Screen>
  );
}
