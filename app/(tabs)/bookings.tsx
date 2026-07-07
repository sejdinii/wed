import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BrandedImage } from '@/components/BrandedImage';
import { AppText } from '@/design/components/AppText';
import { Badge, type BadgeTone } from '@/design/components/Badge';
import { EmptyState } from '@/design/components/EmptyState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { SegmentedControl } from '@/design/components/SegmentedControl';
import { useTheme } from '@/design/theme';
import { radius, shadow, spacing } from '@/design/tokens';
import { formatMediumDate, daysBetween, todayISO } from '@/lib/dates';
import type { Booking, BookingStatus } from '@/domain/types';
import { useBookings } from '@/stores/bookings';
import { useI18n } from '@/i18n';

const STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  pending_kapar: 'warning',
  reserved: 'warning',
  confirmed: 'success',
  completed: 'neutral',
  cancelled_by_couple: 'danger',
  cancelled_by_venue: 'danger',
  expired: 'neutral',
};

const ACTIVE: BookingStatus[] = ['pending_kapar', 'reserved', 'confirmed'];

/**
 * Bookings — big photo cards with a white countdown badge ("X days to go",
 * the wedding version of "starts in 25 days") and a lifecycle status pill.
 */
export default function BookingsScreen() {
  const { colors, mode } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const bookings = useBookings((s) => s.bookings);
  const [segment, setSegment] = useState<'upcoming' | 'past'>('upcoming');

  const today = todayISO();
  const isUpcoming = (b: Booking) => b.eventDateISO >= today && ACTIVE.includes(b.status);
  const visible = bookings
    .filter((b) => (segment === 'upcoming' ? isUpcoming(b) : !isUpcoming(b)))
    .sort((a, b) =>
      segment === 'upcoming' ? (a.eventDateISO < b.eventDateISO ? -1 : 1) : a.eventDateISO < b.eventDateISO ? 1 : -1,
    );

  return (
    <Screen>
      <View style={{ paddingHorizontal: spacing(4), paddingTop: spacing(3), gap: spacing(3) }}>
        <AppText variant="display">{t('bookings.title')}</AppText>
        <SegmentedControl
          options={[
            { key: 'upcoming', label: t('bookings.title') },
            { key: 'past', label: t('bookings.pastCancelled') },
          ]}
          value={segment}
          onChange={setSegment}
        />
      </View>

      <FlatList
        data={visible}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: spacing(4), gap: spacing(4), paddingBottom: spacing(8) }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const daysLeft = daysBetween(today, item.eventDateISO);
          return (
            <PressableScale
              onPress={() => router.push(`/booking/${item.id}`)}
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel={item.venueName}
              style={[
                {
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: 'hidden',
                },
                mode === 'light' ? shadow.card : null,
              ]}
            >
              <View>
                <BrandedImage uri={item.venuePhoto}
                  style={{ width: '100%', height: 150 }}
                  contentFit="cover"
                  transition={200}
                />
                {segment === 'upcoming' && daysLeft >= 0 ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: spacing(2.5),
                      left: spacing(2.5),
                      backgroundColor: '#FFFFFF',
                      borderRadius: radius.pill,
                      paddingHorizontal: spacing(2.5),
                      paddingVertical: spacing(1),
                    }}
                  >
                    <AppText variant="caption" style={{ color: '#131A16' }}>
                      {t('bookings.daysLeft', { count: daysLeft })} 💍
                    </AppText>
                  </View>
                ) : null}
              </View>
              <View style={{ padding: spacing(3.5), gap: spacing(1.5) }}>
                <AppText variant="subheading" numberOfLines={1}>
                  {item.venueName}
                </AppText>
                <AppText variant="bodySm" color="secondary">
                  {formatMediumDate(item.eventDateISO, locale)} · {t('bookings.guestCount', { count: item.guestCount })}
                </AppText>
                <Badge label={t(`bookingStatus.${item.status}`)} tone={STATUS_TONE[item.status]} dot />
              </View>
            </PressableScale>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="ticket-outline"
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
