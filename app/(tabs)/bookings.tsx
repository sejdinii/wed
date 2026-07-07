import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Badge, type BadgeTone } from '@/design/components/Badge';
import { Card } from '@/design/components/Card';
import { EmptyState } from '@/design/components/EmptyState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { SegmentedControl } from '@/design/components/SegmentedControl';
import { radius, spacing } from '@/design/tokens';
import { formatMkd } from '@/lib/money';
import { formatMediumDate, todayISO } from '@/lib/dates';
import type { Booking, BookingStatus } from '@/domain/types';
import { useBookings } from '@/stores/bookings';
import { useI18n } from '@/i18n';

const STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  pending_kapar: 'warning',
  reserved: 'accent',
  confirmed: 'success',
  completed: 'neutral',
  cancelled_by_couple: 'danger',
  cancelled_by_venue: 'danger',
  expired: 'neutral',
};

const ACTIVE_STATUSES: BookingStatus[] = ['pending_kapar', 'reserved', 'confirmed'];

/**
 * Bookings — the couple's ledger. Every row answers the three questions a
 * couple actually re-opens the app for: which date, what state is my
 * reservation in (badge = lifecycle status), and how much kapar is committed.
 */
export default function BookingsScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const bookings = useBookings((s) => s.bookings);
  const [segment, setSegment] = useState<'upcoming' | 'past'>('upcoming');

  const today = todayISO();
  const isUpcoming = (b: Booking) => b.eventDateISO >= today && ACTIVE_STATUSES.includes(b.status);
  const visible = bookings
    .filter((b) => (segment === 'upcoming' ? isUpcoming(b) : !isUpcoming(b)))
    .sort((a, b) => (segment === 'upcoming' ? (a.eventDateISO < b.eventDateISO ? -1 : 1) : a.eventDateISO < b.eventDateISO ? 1 : -1));

  return (
    <Screen>
      <View style={{ paddingHorizontal: spacing(5), paddingTop: spacing(3), gap: spacing(4) }}>
        <AppText variant="title">{t('bookings.title')}</AppText>
        <SegmentedControl
          options={[
            { key: 'upcoming', label: t('bookings.upcoming') },
            { key: 'past', label: t('bookings.past') },
          ]}
          value={segment}
          onChange={setSegment}
        />
      </View>

      <FlatList
        data={visible}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: spacing(5), gap: spacing(3), paddingBottom: spacing(8) }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PressableScale
            onPress={() => router.push(`/venue/${item.venueId}`)}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={item.venueName}
          >
            <Card padding={3.5} style={{ flexDirection: 'row', gap: spacing(3) }}>
              <Image
                source={{ uri: item.venuePhoto }}
                style={{ width: 76, height: 76, borderRadius: radius.md }}
                contentFit="cover"
                accessibilityIgnoresInvertColors
              />
              <View style={{ flex: 1, gap: spacing(1) }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing(2) }}>
                  <AppText variant="subheading" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {item.venueName}
                  </AppText>
                  <Badge label={t(`status.${item.status}`)} tone={STATUS_TONE[item.status]} dot />
                </View>
                <AppText variant="bodySm" color="secondary">
                  {formatMediumDate(item.eventDateISO, locale)} · {t('bookings.guestCount', { count: item.guestCount })}
                </AppText>
                <AppText variant="bodySmStrong" color="accent">
                  {t('bookings.kaparPaid', { amount: formatMkd(item.kaparMkd, locale) })}
                </AppText>
              </View>
            </Card>
          </PressableScale>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={t('bookings.emptyTitle')}
            body={t('bookings.emptyBody')}
            actionLabel={t('bookings.emptyCta')}
            onAction={() => router.push('/(tabs)')}
          />
        }
      />
    </Screen>
  );
}
