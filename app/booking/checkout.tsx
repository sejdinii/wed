import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { ErrorState } from '@/design/components/ErrorState';
import { RefundTimeline } from '@/components/RefundTimeline';
import { useTheme } from '@/design/theme';
import { radius, spacing, typeScale } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMkd, formatMkdBare } from '@/lib/money';
import { formatLongDate } from '@/lib/dates';
import { estimateTotalMkd, hallFor, kaparAmountMkd, KAPAR_PAY_WINDOW_DAYS, makeConfirmationCode } from '@/domain/kapar';
import type { Booking, Venue } from '@/domain/types';
import { venueApi } from '@/data/api';
import { simulateVenueSide } from '@/data/venueBot';
import { useBookingDraft } from '@/stores/bookingDraft';
import { useBookings } from '@/stores/bookings';
import { useI18n } from '@/i18n';

type Step = 1 | 2 | 3;

/**
 * Reserve flow — numbered stepper (Contact › Event › Review) under a pinned
 * kapar amount bar. NOTHING is paid online (MVP decision 2026-07-09): the
 * request holds the date, the venue confirms within 24h, and the kapar is
 * paid in person at the venue visit. The review step repeats exactly that at
 * the moment of commitment, plus the cancellation ladder.
 *
 * INTEGRATION POINT: the submit timeout stands in for the request API call;
 * the booking is written locally as `pending_kapar` and the venue bot mocks
 * the venue's side.
 */
export default function CheckoutScreen() {
  const { colors, mode } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const draft = useBookingDraft();
  const addBooking = useBookings((s) => s.addBooking);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [draft.venueId, attempt]);

  if (!draft.venueId || !draft.dateISO || !draft.menuTierId) return <Redirect href="/(tabs)" />;

  if (loadFailed) {
    return (
      <Screen>
        <ErrorState onRetry={retry} secondaryLabel={t('common.back')} onSecondary={() => router.back()} />
      </Screen>
    );
  }

  const estimate = venue ? estimateTotalMkd(venue, draft.menuTierId, draft.guestCount, draft.hallId) : 0;
  const kapar = venue ? kaparAmountMkd(venue.kaparPolicy, estimate) : 0;
  const balance = Math.max(0, estimate - kapar);
  const hall = venue ? hallFor(venue, draft.hallId) : undefined;

  const goNext = () => {
    if (step === 1) {
      if (draft.firstName.trim().length < 2 || draft.lastName.trim().length < 2 || draft.phone.trim().length < 6) {
        setError(t('checkout.invalidContact'));
        haptic.error();
        return;
      }
      setError(null);
      setStep(2);
      return;
    }
    if (step === 2) {
      setError(null);
      setStep(3);
      return;
    }
    sendRequest();
  };

  const sendRequest = () => {
    if (!venue) return;
    setError(null);
    setProcessing(true);

    // PLACEHOLDER — stands in for the booking-request API call.
    timeoutRef.current = setTimeout(() => {
      const now = new Date().toISOString();
      const booking: Booking = {
        id: `bk_${Date.now().toString(36)}`,
        confirmationCode: makeConfirmationCode(),
        venueId: venue.id,
        venueName: venue.name,
        venuePhoto: venue.photos[0] ?? '',
        city: venue.city,
        eventDateISO: draft.dateISO as string,
        guestCount: draft.guestCount,
        menuTierId: draft.menuTierId as string,
        estimatedTotalMkd: estimate,
        kaparMkd: kapar,
        balanceDueMkd: balance,
        status: 'pending_kapar',
        createdAtISO: now,
        timeline: [{ status: 'pending_kapar', at: now }],
        contactName: `${draft.firstName.trim()} ${draft.lastName.trim()}`,
        contactPhone: draft.phone.trim(),
        specialRequests: draft.specialRequests.trim() || undefined,
        hallName: venue.halls.length > 1 ? hall?.name[locale] : undefined,
      };
      addBooking(booking);
      simulateVenueSide(booking.id, venue.name, booking.eventDateISO);
      haptic.success();
      router.replace({ pathname: '/booking/status', params: { bookingId: booking.id } });
    }, 900);
  };

  const inputStyle = {
    ...typeScale.body,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3.5),
    height: 50,
    backgroundColor: mode === 'dark' ? colors.surfaceElevated : colors.surface,
  } as const;

  // Render helper, NOT a component — a component defined in render would
  // remount the TextInput and drop keyboard focus on every keystroke.
  const renderField = (opts: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    keyboardType?: KeyboardTypeOptions;
    secure?: boolean;
    maxLength?: number;
    flex?: number;
    multiline?: boolean;
  }) => (
    <View style={{ gap: spacing(1.5), flex: opts.flex }}>
      <AppText variant="label" color="secondary">
        {opts.label}
      </AppText>
      <TextInput
        value={opts.value}
        onChangeText={opts.onChange}
        placeholder={opts.placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={opts.keyboardType}
        secureTextEntry={opts.secure}
        maxLength={opts.maxLength}
        multiline={opts.multiline}
        autoCapitalize={opts.keyboardType === 'number-pad' ? 'none' : 'words'}
        accessibilityLabel={opts.label}
        style={[inputStyle, opts.multiline ? { height: 84, paddingTop: spacing(3) } : null]}
      />
    </View>
  );

  const StepMarker = ({ n, label }: { n: Step; label: string }) => {
    const stateStyle =
      n === step
        ? { bg: colors.chip, fg: colors.onChip, border: colors.chip }
        : n < step
          ? { bg: colors.mint, fg: colors.onMint, border: colors.mint }
          : { bg: 'transparent', fg: colors.textTertiary, border: colors.borderStrong };
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: stateStyle.bg,
            borderWidth: 1.2,
            borderColor: stateStyle.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {n < step ? (
            <Ionicons name="checkmark" size={12} color={stateStyle.fg} />
          ) : (
            <AppText variant="caption" style={{ color: stateStyle.fg }}>
              {n}
            </AppText>
          )}
        </View>
        <AppText variant="label" color={n === step ? 'primary' : 'tertiary'}>
          {label}
        </AppText>
      </View>
    );
  };

  const ctaTitle =
    step === 3
      ? processing
        ? t('checkout.sending')
        : t('checkout.sendRequest')
      : t('common.continue');

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
        <PressableScale
          onPress={() => {
            if (step > 1) setStep((s) => (s - 1) as Step);
            else router.back();
          }}
          hapticFeedback="select"
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <AppText variant="heading" style={{ flex: 1, textAlign: 'center' }}>
          {t('checkout.title')} | {t('common.appName')}
        </AppText>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing(4), gap: spacing(4), paddingBottom: spacing(34) }}
      >
        {/* Pinned kapar bar */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: colors.mint,
            borderRadius: radius.md,
            paddingHorizontal: spacing(3.5),
            paddingVertical: spacing(2.5),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
            <Ionicons name="wallet-outline" size={16} color={colors.onMint} />
            <AppText variant="bodySmStrong" style={{ color: colors.onMint }}>
              {t('checkout.kaparBar')}
            </AppText>
          </View>
          <AppText variant="subheading" style={{ color: colors.onMint }}>
            {formatMkd(kapar, locale)}
          </AppText>
        </View>

        {/* Stepper */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
          <StepMarker n={1} label={t('checkout.stepContact')} />
          <Ionicons name="chevron-forward" size={12} color={colors.textTertiary} />
          <StepMarker n={2} label={t('checkout.stepEvent')} />
          <Ionicons name="chevron-forward" size={12} color={colors.textTertiary} />
          <StepMarker n={3} label={t('checkout.stepReview')} />
        </View>

        {step === 1 ? (
          <View style={{ gap: spacing(4) }}>
            <View style={{ gap: spacing(1) }}>
              <AppText variant="title">{t('checkout.contactTitle')}</AppText>
              <AppText variant="bodySm" color="secondary">
                {t('checkout.contactBody')}
              </AppText>
            </View>
            {renderField({
              label: t('checkout.firstName'),
              value: draft.firstName,
              onChange: (v) => draft.setContact({ firstName: v }),
              placeholder: 'Ана',
            })}
            {renderField({
              label: t('checkout.lastName'),
              value: draft.lastName,
              onChange: (v) => draft.setContact({ lastName: v }),
              placeholder: 'Стојановска',
            })}
            {renderField({
              label: t('checkout.phone'),
              value: draft.phone,
              onChange: (v) => draft.setContact({ phone: v.replace(/[^\d+ ]/g, '') }),
              placeholder: '+389 70 123 456',
              keyboardType: 'phone-pad',
              maxLength: 16,
            })}
          </View>
        ) : null}

        {step === 2 && venue ? (
          <View style={{ gap: spacing(4) }}>
            <AppText variant="title">{t('checkout.eventTitle')}</AppText>
            {/* Menu selection (moved here from availability in v3) */}
            <View style={{ gap: spacing(2.5) }}>
              <AppText variant="subheading">{t('checkout.menuLabel')}</AppText>
              {venue.menuTiers.map((tier) => {
                const selected = tier.id === draft.menuTierId;
                return (
                  <PressableScale
                    key={tier.id}
                    onPress={() => draft.setMenuTier(tier.id)}
                    scaleTo={0.99}
                    hapticFeedback="select"
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing(2.5),
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.mint : colors.surface,
                      borderRadius: radius.md,
                      padding: spacing(3),
                    }}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selected ? colors.primary : colors.textTertiary}
                    />
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong">{tier.name[locale]}</AppText>
                      <AppText variant="bodySm" color="secondary" numberOfLines={1}>
                        {tier.description[locale]}
                      </AppText>
                    </View>
                    <AppText variant="bodySmStrong" color="brand">
                      {t('venue.menuPerGuest', { amount: formatMkdBare(tier.pricePerGuestMkd, locale) })}
                    </AppText>
                  </PressableScale>
                );
              })}
            </View>
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing(3.5), gap: spacing(2) }}>
              <AppText variant="subheading">
                {venue.name}
                {venue.halls.length > 1 && hall ? ` · ${hall.name[locale]}` : ''}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} />
                <AppText variant="bodySm" color="secondary">
                  {formatLongDate(draft.dateISO, locale)}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                <Ionicons name="people-outline" size={15} color={colors.textSecondary} />
                <AppText variant="bodySm" color="secondary">
                  {t('bookings.guestCount', { count: draft.guestCount })} ·{' '}
                  {venue.menuTiers.find((m) => m.id === draft.menuTierId)?.name[locale] ?? ''}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
                <AppText variant="bodySmStrong" color="brand">
                  {t('checkout.confirmNote')}
                </AppText>
              </View>
            </View>
            {renderField({
              label: t('checkout.specialRequests'),
              value: draft.specialRequests,
              onChange: (v) => draft.setContact({ specialRequests: v }),
              placeholder: t('checkout.specialPlaceholder'),
              multiline: true,
            })}
          </View>
        ) : null}

        {step === 3 && venue ? (
          <View style={{ gap: spacing(4) }}>
            <AppText variant="title">{t('checkout.reviewTitle')}</AppText>

            {/* Request summary with the money story in one card */}
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing(3.5), gap: spacing(2) }}>
              <AppText variant="subheading">
                {venue.name}
                {venue.halls.length > 1 && hall ? ` · ${hall.name[locale]}` : ''}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} />
                <AppText variant="bodySm" color="secondary">
                  {formatLongDate(draft.dateISO, locale)}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                <Ionicons name="people-outline" size={15} color={colors.textSecondary} />
                <AppText variant="bodySm" color="secondary">
                  {t('bookings.guestCount', { count: draft.guestCount })} ·{' '}
                  {venue.menuTiers.find((m) => m.id === draft.menuTierId)?.name[locale] ?? ''}
                </AppText>
              </View>
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing(1) }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="bodySm" color="secondary">
                  {t('checkout.estimateLabel', { guests: draft.guestCount })}
                </AppText>
                <AppText variant="bodySmStrong">{formatMkd(estimate, locale)}</AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="bodySm" color="secondary">
                  {t('checkout.kaparAtVisit')}
                </AppText>
                <AppText variant="bodySmStrong" color="gold">
                  {formatMkd(kapar, locale)}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="bodySm" color="secondary">
                  {t('checkout.balanceAtVenue')}
                </AppText>
                <AppText variant="bodySmStrong">{formatMkd(balance, locale)}</AppText>
              </View>
            </View>

            {/* The commitment, stated honestly: nothing is paid online */}
            <View style={{ backgroundColor: colors.mint, borderRadius: radius.md, padding: spacing(3.5), gap: spacing(1.5) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                <Ionicons name="wallet-outline" size={16} color={colors.onMint} />
                <AppText variant="bodySmStrong" style={{ color: colors.onMint }}>
                  {t('checkout.noOnlinePayment')}
                </AppText>
              </View>
              <AppText variant="bodySm" style={{ color: colors.onMint }}>
                {t('checkout.noOnlinePaymentBody', { amount: formatMkd(kapar, locale) })}
              </AppText>
            </View>

            {/* How it works — 3 numbered steps */}
            <View style={{ gap: spacing(2.5) }}>
              <AppText variant="subheading">{t('checkout.howTitle')}</AppText>
              {[
                t('checkout.how1', { venue: venue.name }),
                t('checkout.how2', { days: KAPAR_PAY_WINDOW_DAYS }),
                t('checkout.how3'),
              ].map((text, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: spacing(2.5), alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: colors.chip,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 1,
                    }}
                  >
                    <AppText variant="caption" style={{ color: colors.onChip }}>
                      {i + 1}
                    </AppText>
                  </View>
                  <AppText variant="bodySm" color="secondary" style={{ flex: 1 }}>
                    {text}
                  </AppText>
                </View>
              ))}
            </View>

            {/* Cancellation ladder — the same terms shown on the venue page */}
            <View style={{ gap: spacing(2.5) }}>
              <AppText variant="subheading">{t('details.cancellationTerms')}</AppText>
              <AppText variant="bodySm" color="secondary">
                {t('checkout.freeCancelNote')}
              </AppText>
              <RefundTimeline policy={venue.kaparPolicy} eventDateISO={draft.dateISO} />
            </View>
          </View>
        ) : null}

        {error ? (
          <View
            style={{
              flexDirection: 'row',
              gap: spacing(2),
              backgroundColor: colors.dangerSoft,
              borderLeftWidth: 3,
              borderLeftColor: colors.danger,
              borderRadius: radius.sm,
              padding: spacing(3),
            }}
          >
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <AppText variant="bodySm" color="danger" style={{ flex: 1 }}>
              {error}
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom CTA */}
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
          gap: spacing(2),
        }}
      >
        <Button
          title={ctaTitle}
          onPress={goNext}
          loading={processing}
          iconLeft={step === 3 && !processing ? <Ionicons name="paper-plane-outline" size={15} color={colors.onPrimary} /> : undefined}
          fullWidth
        />
        {step === 3 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing(1.5) }}>
            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            <AppText variant="bodySmStrong" color="brand">
              {t('checkout.reassure')}
            </AppText>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
