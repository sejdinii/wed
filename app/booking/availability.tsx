import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { Skeleton } from '@/design/components/Skeleton';
import { Stepper } from '@/design/components/Stepper';
import { MonthPager } from '@/components/MonthPager';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { formatMkd, formatMkdBare } from '@/lib/money';
import { addDaysISO, formatMediumDate, todayISO } from '@/lib/dates';
import { estimateTotalMkd, kaparAmountMkd, sortedRefundTiers } from '@/domain/kapar';
import type { Venue } from '@/domain/types';
import { venueApi } from '@/data/api';
import { useBookingDraft } from '@/stores/bookingDraft';
import { useI18n } from '@/i18n';

/**
 * Check availability — date and guest pills up top, then the menus as
 * selectable option cards. The selected card expands with the refund note,
 * the live estimate and the kapar due now (gold). One green "Select" pill.
 */
export default function AvailabilityScreen() {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const draft = useBookingDraft();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [guestSheetOpen, setGuestSheetOpen] = useState(false);

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

  const PillDropdown = ({
    icon,
    label,
    onPress,
    active,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    onPress: () => void;
    active: boolean;
  }) => (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      hapticFeedback="select"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing(2),
        borderWidth: 1.5,
        borderColor: active ? colors.text : colors.borderStrong,
        borderRadius: radius.md,
        paddingHorizontal: spacing(3),
        height: 46,
      }}
    >
      <Ionicons name={icon} size={16} color={colors.text} />
      <AppText variant="bodySmStrong" style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </AppText>
      <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
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
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <AppText variant="heading" style={{ flex: 1, textAlign: 'center' }}>
          {t('availability.title')}
        </AppText>
        <View style={{ width: 22 }} />
      </View>

      {venue === null ? (
        <View style={{ padding: spacing(4), gap: spacing(3) }}>
          <Skeleton height={46} radius={radius.md} />
          <Skeleton height={180} radius={radius.lg} />
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing(4), gap: spacing(4), paddingBottom: spacing(30) }}>
            {/* Date + guests pills */}
            <View style={{ flexDirection: 'row', gap: spacing(2.5) }}>
              <PillDropdown
                icon="calendar-outline"
                label={draft.dateISO ? formatMediumDate(draft.dateISO, locale) : t('availability.pickDate')}
                onPress={() => setDateSheetOpen(true)}
                active={draft.dateISO !== null}
              />
              <PillDropdown
                icon="people-outline"
                label={`${draft.guestCount} ${t('common.guests')}`}
                onPress={() => setGuestSheetOpen(true)}
                active
              />
            </View>

            <AppText variant="subheading">{t('availability.menusAvailable', { count: venue.menuTiers.length })}</AppText>

            {/* Menu option cards */}
            {venue.menuTiers.map((tier) => {
              const selected = tier.id === draft.menuTierId;
              const estimate = estimateTotalMkd(venue, tier.id, draft.guestCount);
              const kapar = kaparAmountMkd(venue.kaparPolicy, estimate);
              const fullTier = sortedRefundTiers(venue.kaparPolicy)[0];
              const refundDeadline =
                draft.dateISO && fullTier && fullTier.refundPercent >= 100
                  ? addDaysISO(draft.dateISO, -fullTier.minDaysBeforeEvent)
                  : null;

              return (
                <PressableScale
                  key={tier.id}
                  onPress={() => draft.setMenuTier(tier.id)}
                  scaleTo={0.99}
                  hapticFeedback="select"
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={{
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colors.text : colors.border,
                    borderRadius: radius.lg,
                    padding: spacing(3.5),
                    gap: spacing(2),
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText variant="subheading">{tier.name[locale]}</AppText>
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selected ? colors.primary : colors.textTertiary}
                    />
                  </View>
                  <AppText variant="bodySm" color="secondary">
                    {tier.description[locale]}
                  </AppText>
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: selected ? colors.chip : colors.surfaceElevated,
                      borderRadius: radius.pill,
                      paddingHorizontal: spacing(3),
                      paddingVertical: spacing(1.5),
                    }}
                  >
                    <AppText variant="bodySmStrong" style={{ color: selected ? colors.onChip : colors.text }}>
                      {t('venue.menuPerGuest', { amount: formatMkdBare(tier.pricePerGuestMkd, locale) })}
                    </AppText>
                  </View>

                  {selected ? (
                    <>
                      {refundDeadline ? (
                        <View style={{ backgroundColor: colors.mint, borderRadius: radius.sm, padding: spacing(2.5) }}>
                          <AppText variant="bodySmStrong" style={{ color: colors.onMint }}>
                            ✓ {t('availability.refundUntil', { date: formatMediumDate(refundDeadline, locale) })}
                          </AppText>
                        </View>
                      ) : null}
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <AppText variant="bodySm" color="secondary">
                          {t('availability.calc', { guests: draft.guestCount, price: formatMkdBare(tier.pricePerGuestMkd, locale) })}
                        </AppText>
                        <AppText variant="bodyStrong">{t('availability.estimate', { amount: formatMkd(estimate, locale) })}</AppText>
                        <AppText variant="subheading" color="gold">
                          {t('availability.kaparNow', { amount: formatMkd(kapar, locale) })}
                        </AppText>
                      </View>
                    </>
                  ) : null}
                </PressableScale>
              );
            })}
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
              padding: spacing(4),
              paddingBottom: insets.bottom + spacing(3),
            }}
          >
            <Button
              title={t('availability.select')}
              onPress={() => router.push('/booking/checkout')}
              disabled={!draft.dateISO || !draft.menuTierId}
              fullWidth
            />
          </View>

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
                  selectedISO={draft.dateISO}
                  minISO={todayISO()}
                  isBlocked={(iso) => venue.bookedDates.includes(iso)}
                  onSelect={(iso) => {
                    draft.setDate(iso);
                    setDateSheetOpen(false);
                  }}
                />
                <View style={{ flexDirection: 'row', gap: spacing(4), justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold }} />
                    <AppText variant="caption" color="tertiary">
                      {t('availability.legendSaturday')}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                    <AppText variant="caption" color="tertiary" style={{ textDecorationLine: 'line-through' }}>
                      12
                    </AppText>
                    <AppText variant="caption" color="tertiary">
                      {t('availability.legendBooked')}
                    </AppText>
                  </View>
                </View>
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
                  <View>
                    <AppText variant="heading">{t('filters.guestCount')}</AppText>
                    <AppText variant="bodySm" color="tertiary">
                      {t('venue.capacityLine', { min: venue.capacityMin, max: venue.capacityMax })}
                    </AppText>
                  </View>
                  <Stepper
                    value={draft.guestCount}
                    min={venue.capacityMin}
                    max={venue.capacityMax}
                    onChange={draft.setGuestCount}
                    accessibilityLabel={t('filters.guestCount')}
                  />
                </View>
                <Button title={t('common.done')} onPress={() => setGuestSheetOpen(false)} variant="dark" size="md" fullWidth />
              </View>
            </View>
          </Modal>
        </>
      )}
    </Screen>
  );
}
