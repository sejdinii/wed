import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Badge } from '@/design/components/Badge';
import { ErrorState } from '@/design/components/ErrorState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { Skeleton } from '@/design/components/Skeleton';
import { MonthPager } from '@/components/MonthPager';
import type { DayState } from '@/design/components/CalendarMonth';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMediumDate, todayISO } from '@/lib/dates';
import { DateBookedError, vendorApi, type VendorCalendar } from '@/data/vendorApi';
import { useI18n } from '@/i18n';

/**
 * Vendor availability calendar — the 3-state deviation from Booking.com's
 * binary calendar (accepted 2026-07-12): green open · gray blocked-by-you ·
 * red booked-by-a-couple. Tapping an open day blocks it, a blocked day
 * reopens it, a booked day shows the booking (it can never be "reopened" by
 * tapping — a booking holds it).
 */
export default function VendorCalendarScreen() {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();

  const [calendar, setCalendar] = useState<VendorCalendar | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [toggleFailed, setToggleFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((n) => n + 1);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    (async () => {
      try {
        const result = await vendorApi.calendar();
        if (!cancelled) setCalendar(result);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const stateFor = useCallback(
    (iso: string): DayState => {
      if (!calendar) return 'available';
      if (calendar.booked.some((b) => b.date === iso)) return 'booked';
      if (calendar.blocked.includes(iso)) return 'blocked';
      return 'available';
    },
    [calendar],
  );

  const onDayTap = async (iso: string) => {
    if (!calendar) return;
    setSelected(iso);
    setToggleFailed(false);
    const state = stateFor(iso);
    // Booked days only get inspected — the booking card below shows details.
    if (state === 'booked') return;
    try {
      const updated = await vendorApi.setBlocked(iso, state === 'available');
      setCalendar(updated);
      haptic.success();
    } catch (e) {
      haptic.error();
      // date_booked: a request landed between render and tap — refresh shows it.
      if (e instanceof DateBookedError) retry();
      else setToggleFailed(true);
    }
  };

  const selectedBooking = selected ? calendar?.booked.find((b) => b.date === selected) : undefined;

  const Legend = ({ color, label }: { color: string; label: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
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
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <AppText variant="heading" style={{ flex: 1, textAlign: 'center' }}>
          {t('vendor.calendarTitle')}
        </AppText>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }} showsVerticalScrollIndicator={false}>
        {loadFailed ? (
          <ErrorState onRetry={retry} secondaryLabel={t('common.back')} onSecondary={() => router.back()} />
        ) : calendar === null ? (
          <Skeleton height={360} radius={radius.lg} />
        ) : (
          <>
            <AppText variant="bodySm" color="secondary">
              {t('vendor.calendarHint')}
            </AppText>
            <View
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing(4),
              }}
            >
              <MonthPager
                locale={locale}
                selectedISO={selected}
                minISO={todayISO()}
                stateFor={stateFor}
                onSelect={(iso) => void onDayTap(iso)}
                allowSelectingAll
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing(3), flexWrap: 'wrap', gap: spacing(2) }}>
                <Legend color={colors.success} label={t('vendor.legendOpen')} />
                <Legend color={colors.textTertiary} label={t('vendor.legendBlocked')} />
                <Legend color={colors.danger} label={t('vendor.legendBooked')} />
              </View>
            </View>

            {toggleFailed ? (
              <AppText variant="bodySm" color="danger">
                {t('error.body')}
              </AppText>
            ) : null}

            {selectedBooking ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  padding: spacing(3.5),
                  gap: spacing(1.5),
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                  <AppText variant="bodyStrong" style={{ flex: 1 }}>
                    {selectedBooking.contactName}
                  </AppText>
                  <Badge label={t(`bookingStatus.${selectedBooking.status}` as Parameters<typeof t>[0])} tone="warning" dot />
                </View>
                <AppText variant="bodySm" color="secondary">
                  {formatMediumDate(selectedBooking.date, locale)} · {t('bookings.guestCount', { count: selectedBooking.guestCount })}
                </AppText>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
