import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { Skeleton } from '@/design/components/Skeleton';
import { Stepper } from '@/design/components/Stepper';
import { FlowHeader } from '@/components/FlowHeader';
import { MonthPager } from '@/components/MonthPager';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { formatMkd, formatMkdBare } from '@/lib/money';
import { todayISO } from '@/lib/dates';
import { estimateTotalMkd } from '@/domain/kapar';
import type { Venue } from '@/domain/types';
import { venueApi } from '@/data/api';
import { useBookingDraft } from '@/stores/bookingDraft';
import { useI18n } from '@/i18n';

/**
 * Checkout step 1 — date, guests, menu.
 * The calendar leads: availability IS the product. Guests move in steps of 10
 * (tables), bounded by the venue's real capacity. The estimate updates live
 * so there is never a price surprise at the next step.
 */
export default function BookingDateScreen() {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const draft = useBookingDraft();
  const [venue, setVenue] = useState<Venue | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!draft.venueId) return;
    (async () => {
      const result = await venueApi.getVenue(draft.venueId as string);
      if (!cancelled && result) setVenue(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [draft.venueId]);

  if (!draft.venueId) return <Redirect href="/(tabs)" />;

  const estimate =
    venue && draft.menuTierId ? estimateTotalMkd(venue, draft.menuTierId, draft.guestCount) : 0;

  return (
    <Screen>
      <FlowHeader title={t('booking.step1Title')} step={1} />
      {venue === null ? (
        <View style={{ padding: spacing(5), gap: spacing(4) }}>
          <Skeleton height={340} radius={radius.lg} />
          <Skeleton height={80} radius={radius.lg} />
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: spacing(5), gap: spacing(4), paddingBottom: spacing(30) }}
          >
            {/* Calendar */}
            <Card padding={4} style={{ gap: spacing(3) }}>
              <MonthPager
                locale={locale}
                selectedISO={draft.dateISO}
                minISO={todayISO()}
                isBlocked={(iso) => venue.bookedDates.includes(iso)}
                onSelect={draft.setDate}
              />
              <View style={{ flexDirection: 'row', gap: spacing(4), justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
                  <AppText variant="caption" color="tertiary">
                    {t('booking.legendSaturday')}
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                  <AppText variant="caption" color="tertiary" style={{ textDecorationLine: 'line-through' }}>
                    12
                  </AppText>
                  <AppText variant="caption" color="tertiary">
                    {t('booking.legendBooked')}
                  </AppText>
                </View>
              </View>
            </Card>

            {/* Guests */}
            <Card padding={4} style={{ gap: spacing(3) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ gap: 2, flexShrink: 1 }}>
                  <AppText variant="subheading">{t('booking.guestsLabel')}</AppText>
                  <AppText variant="caption" color="tertiary">
                    {t('venue.capacity', { min: venue.capacityMin, max: venue.capacityMax })}
                  </AppText>
                </View>
                <Stepper
                  value={draft.guestCount}
                  min={venue.capacityMin}
                  max={venue.capacityMax}
                  onChange={draft.setGuestCount}
                  accessibilityLabel={t('booking.guestsLabel')}
                />
              </View>
            </Card>

            {/* Menu tier */}
            <Card padding={4} style={{ gap: spacing(3) }}>
              <AppText variant="subheading">{t('booking.menuLabel')}</AppText>
              {venue.menuTiers.map((tier) => {
                const selected = tier.id === draft.menuTierId;
                return (
                  <PressableScale
                    key={tier.id}
                    onPress={() => draft.setMenuTier(tier.id)}
                    hapticFeedback="select"
                    scaleTo={0.99}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={{
                      borderWidth: 1.5,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primarySoft : 'transparent',
                      borderRadius: radius.md,
                      padding: spacing(3.5),
                      gap: spacing(1),
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={19}
                        color={selected ? colors.primary : colors.textTertiary}
                      />
                      <AppText variant="bodyStrong" style={{ flex: 1 }}>
                        {tier.name[locale]}
                      </AppText>
                      <AppText variant="bodyStrong" color="brand">
                        {t('venue.menuPerGuest', { amount: formatMkdBare(tier.pricePerGuestMkd, locale) })}
                      </AppText>
                    </View>
                    <AppText variant="bodySm" color="secondary" style={{ marginLeft: spacing(6.5) }}>
                      {tier.description[locale]}
                    </AppText>
                  </PressableScale>
                );
              })}
            </Card>

            {/* Live estimate */}
            <View style={{ gap: spacing(1.5) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="body" color="secondary">
                  {t('booking.estimatedTotal')}
                </AppText>
                <AppText variant="heading">{formatMkd(estimate, locale)}</AppText>
              </View>
              <AppText variant="bodySm" color="tertiary">
                {t('booking.estimateNote')}
              </AppText>
            </View>
          </ScrollView>

          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              padding: spacing(5),
              paddingBottom: insets.bottom + spacing(3),
            }}
          >
            <Button
              title={t('booking.toReview')}
              onPress={() => router.push('/booking/review')}
              disabled={!draft.dateISO}
              fullWidth
            />
          </View>
        </>
      )}
    </Screen>
  );
}
