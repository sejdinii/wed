import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { ErrorState } from '@/design/components/ErrorState';
import { Skeleton } from '@/design/components/Skeleton';
import { MonthPager } from '@/components/MonthPager';
import { useTheme } from '@/design/theme';
import { radius, shadow, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMkd } from '@/lib/money';
import { formatLongDate, todayISO } from '@/lib/dates';
import { estimateTotalMkd, hallFor, kaparAmountMkd, venueDayState } from '@/domain/kapar';
import type { Venue } from '@/domain/types';
import { venueApi } from '@/data/api';
import { useBookingDraft } from '@/stores/bookingDraft';
import { useIsAuthenticated } from '@/stores/preferences';
import { useI18n } from '@/i18n';

/**
 * Availability (v3) — the calendar with green/amber/red day dots and legend,
 * the Selected Date card, a full-width guests stepper, and the lavender
 * kapar card explaining exactly what the deposit does. Menu selection moved
 * to checkout so this screen stays date + guests + kapar.
 */
export default function AvailabilityScreen() {
  const { colors, mode } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const draft = useBookingDraft();
  const authed = useIsAuthenticated();
  const [venue, setVenue] = useState<Venue | null>(null);

  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((n) => n + 1);

  useEffect(() => {
    let cancelled = false;
    if (!draft.venueId) return;
    setLoadFailed(false);
    (async () => {
      try {
        const result = await venueApi.getVenue(draft.venueId as string);
        if (!cancelled && result) setVenue(result);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draft.venueId, attempt]);

  // Booking requires an account (Wave 2) — venue browsing stays public.
  if (!authed) return <Redirect href="/welcome" />;
  if (!draft.venueId) return <Redirect href="/(tabs)" />;

  // Kapar preview on the selected hall + default menu; firms up in checkout.
  const kapar =
    venue && draft.menuTierId
      ? kaparAmountMkd(venue.kaparPolicy, estimateTotalMkd(venue, draft.menuTierId, draft.guestCount, draft.hallId))
      : 0;
  const hall = venue ? hallFor(venue, draft.hallId) : undefined;
  const capMin = hall?.capacityMin ?? venue?.capacityMin ?? 0;
  const capMax = hall?.capacityMax ?? venue?.capacityMax ?? 0;

  const cardStyle = [
    {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing(4),
    },
    mode === 'light' ? shadow.card : null,
  ];

  const Legend = ({ color, label }: { color: string; label: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
    </View>
  );

  const StepButton = ({ type }: { type: 'inc' | 'dec' }) => {
    if (!venue) return null;
    const step = 10;
    const next = type === 'inc' ? draft.guestCount + step : draft.guestCount - step;
    const enabled = next >= capMin && next <= capMax;
    return (
      <PressableScale
        onPress={() => {
          haptic.select();
          draft.setGuestCount(next);
        }}
        disabled={!enabled}
        hapticFeedback={null}
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel={type === 'inc' ? '+' : '−'}
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: enabled ? 1 : 0.35,
          backgroundColor: colors.surface,
        }}
      >
        <Ionicons name={type === 'inc' ? 'add' : 'remove'} size={20} color={colors.text} />
      </PressableScale>
    );
  };

  return (
    <Screen>
      {/* Header */}
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
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </PressableScale>
        <AppText variant="heading" style={{ flex: 1, textAlign: 'center' }}>
          {t('availability.title')}
        </AppText>
        <View style={{ width: 22 }} />
      </View>

      {loadFailed ? (
        <ErrorState onRetry={retry} secondaryLabel={t('common.back')} onSecondary={() => router.back()} />
      ) : venue === null ? (
        <View style={{ padding: spacing(4), gap: spacing(3) }}>
          <Skeleton height={340} radius={radius.lg} />
          <Skeleton height={90} radius={radius.lg} />
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: spacing(4), gap: spacing(4), paddingBottom: spacing(34) }}
          >
            {/* Calendar with state dots + legend */}
            <View style={cardStyle}>
              <MonthPager
                locale={locale}
                selectedISO={draft.dateISO}
                minISO={todayISO()}
                stateFor={(iso) => venueDayState(venue, iso)}
                onSelect={draft.setDate}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing(3), flexWrap: 'wrap', gap: spacing(2) }}>
                <Legend color={colors.success} label={t('availability.legendAvailable')} />
                <Legend color={colors.danger} label={t('availability.legendBooked')} />
                <Legend color={colors.primary} label={t('availability.legendSelected')} />
              </View>
            </View>

            {/* Selected date card */}
            {draft.dateISO ? (
              <View style={[...cardStyle, { gap: spacing(3) }]}>
                <AppText variant="subheading">{t('availability.selectedDate')}</AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.md,
                      backgroundColor: colors.mint,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="calendar-outline" size={19} color={colors.primary} />
                  </View>
                  <AppText variant="bodyStrong" style={{ flex: 1 }}>
                    {formatLongDate(draft.dateISO, locale)}
                  </AppText>
                  <AppText variant="bodySmStrong" color="success">
                    {t('results.available')}
                  </AppText>
                </View>
              </View>
            ) : null}

            {/* Guests */}
            <View style={{ gap: spacing(2) }}>
              <AppText variant="subheading">{t('home.guestsLabel')}</AppText>
              <View
                style={[
                  ...cardStyle,
                  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing(3) },
                ]}
              >
                <StepButton type="dec" />
                <AppText variant="heading">
                  {draft.guestCount} {t('common.guests')}
                </AppText>
                <StepButton type="inc" />
              </View>
              <AppText variant="bodySm" color="secondary" align="center">
                {t('availability.accommodates', { min: capMin, max: capMax })}
              </AppText>
            </View>

            {/* Kapar card */}
            <View
              style={{
                flexDirection: 'row',
                gap: spacing(3),
                backgroundColor: colors.mint,
                borderRadius: radius.lg,
                padding: spacing(4),
                alignItems: 'flex-start',
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyStrong" style={{ color: colors.onMint }}>
                  {t('availability.kaparTitle')}
                </AppText>
                <AppText variant="bodySm" style={{ color: colors.onMint }}>
                  {t('availability.kaparRequired')}
                </AppText>
                <AppText variant="bodySm" style={{ color: colors.onMint, marginTop: spacing(1) }}>
                  {t('availability.kaparHeld')}
                </AppText>
              </View>
              <AppText variant="title" color="brand">
                {formatMkd(kapar, locale)}
              </AppText>
            </View>
          </ScrollView>

          {/* Continue + secure footer */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              padding: spacing(4),
              paddingBottom: insets.bottom + spacing(2),
              gap: spacing(2),
            }}
          >
            <Button title={t('common.continue')} onPress={() => router.push('/booking/checkout')} disabled={!draft.dateISO} fullWidth />
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing(1.5) }}>
              <Ionicons name="wallet-outline" size={13} color={colors.textSecondary} />
              <AppText variant="bodySm" color="secondary">
                {t('availability.payAtVisitNote')}
              </AppText>
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}
