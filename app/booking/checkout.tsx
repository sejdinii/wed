import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { useTheme } from '@/design/theme';
import { radius, spacing, typeScale } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMkd } from '@/lib/money';
import { formatLongDate } from '@/lib/dates';
import { estimateTotalMkd, kaparAmountMkd, makeConfirmationCode } from '@/domain/kapar';
import type { Booking, Venue } from '@/domain/types';
import { venueApi } from '@/data/api';
import { simulateVenueSide } from '@/data/venueBot';
import { useBookingDraft } from '@/stores/bookingDraft';
import { useBookings } from '@/stores/bookings';
import { useI18n } from '@/i18n';

function isValidCardNumber(digits: string): boolean {
  if (digits.length < 15 || digits.length > 16) return false;
  let sum = 0;
  let doubleIt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits.charAt(i));
    if (doubleIt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    doubleIt = !doubleIt;
  }
  return sum % 10 === 0;
}

function isValidExpiry(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

type Step = 1 | 2 | 3;

/**
 * Checkout — numbered stepper (Contact › Event › Payment) under a pinned
 * kapar amount bar. Only the kapar is ever charged; the copy repeats where
 * the balance goes at the exact moment of commitment.
 *
 * INTEGRATION POINT: `processPayment` timeout simulates the gateway.
 * Production wires CaSys cPay (domestic, 3-D Secure) / Stripe (diaspora)
 * behind the same async boundary; the booking is written only after the
 * charge resolves.
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
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [holderName, setHolderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!draft.venueId) return;
    (async () => {
      const result = await venueApi.getVenue(draft.venueId as string);
      if (!cancelled && result) setVenue(result);
    })();
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [draft.venueId]);

  if (!draft.venueId || !draft.dateISO || !draft.menuTierId) return <Redirect href="/(tabs)" />;

  const estimate = venue ? estimateTotalMkd(venue, draft.menuTierId, draft.guestCount) : 0;
  const kapar = venue ? kaparAmountMkd(venue.kaparPolicy, estimate) : 0;
  const balance = Math.max(0, estimate - kapar);

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
    pay();
  };

  const pay = () => {
    if (!venue) return;
    const digits = cardNumber.replace(/\D/g, '');
    if (!isValidCardNumber(digits) || !isValidExpiry(expiry) || cvc.length < 3 || holderName.trim().length < 2) {
      setError(t('checkout.invalidCard'));
      haptic.error();
      return;
    }
    setError(null);
    setProcessing(true);

    // PLACEHOLDER PAYMENT GATEWAY — replace with CaSys cPay / Stripe.
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
        status: 'reserved',
        createdAtISO: now,
        timeline: [
          { status: 'pending_kapar', at: now },
          { status: 'reserved', at: now },
        ],
        contactName: `${draft.firstName.trim()} ${draft.lastName.trim()}`,
        contactPhone: draft.phone.trim(),
        specialRequests: draft.specialRequests.trim() || undefined,
      };
      addBooking(booking);
      simulateVenueSide(booking.id, venue.name);
      haptic.success();
      router.replace({ pathname: '/booking/status', params: { bookingId: booking.id } });
    }, 1400);
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
        ? t('checkout.processing')
        : t('checkout.payKapar', { amount: formatMkd(kapar, locale) })
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
          <StepMarker n={3} label={t('checkout.stepPayment')} />
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
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing(3.5), gap: spacing(2) }}>
              <AppText variant="subheading">{venue.name}</AppText>
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

        {step === 3 ? (
          <View style={{ gap: spacing(4) }}>
            <AppText variant="title">{t('checkout.paymentTitle')}</AppText>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(2.5),
                borderWidth: 2,
                borderColor: colors.text,
                borderRadius: radius.md,
                padding: spacing(3),
              }}
            >
              <Ionicons name="radio-button-on" size={18} color={colors.primary} />
              <Ionicons name="card-outline" size={20} color={colors.text} />
              <AppText variant="bodyStrong">{t('checkout.cardMethod')}</AppText>
            </View>
            {renderField({
              label: t('checkout.cardName'),
              value: holderName,
              onChange: setHolderName,
              placeholder: 'ANA STOJANOVSKA',
            })}
            {renderField({
              label: t('checkout.cardNumber'),
              value: cardNumber,
              onChange: (raw) => {
                const digits = raw.replace(/\D/g, '').slice(0, 16);
                setCardNumber(digits.replace(/(\d{4})(?=\d)/g, '$1 '));
              },
              placeholder: '1234 5678 9012 3456',
              keyboardType: 'number-pad',
              maxLength: 19,
            })}
            <View style={{ flexDirection: 'row', gap: spacing(3) }}>
              {renderField({
                label: t('checkout.expiry'),
                value: expiry,
                onChange: (raw) => {
                  const digits = raw.replace(/\D/g, '').slice(0, 4);
                  setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
                },
                placeholder: '09/27',
                keyboardType: 'number-pad',
                maxLength: 5,
                flex: 1,
              })}
              {renderField({
                label: t('checkout.cvc'),
                value: cvc,
                onChange: (v) => setCvc(v.replace(/\D/g, '').slice(0, 4)),
                placeholder: '123',
                keyboardType: 'number-pad',
                secure: true,
                maxLength: 4,
                flex: 1,
              })}
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(2.5),
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing(3),
                opacity: 0.55,
              }}
            >
              <Ionicons name="radio-button-off" size={18} color={colors.textTertiary} />
              <Ionicons name="phone-portrait-outline" size={20} color={colors.textSecondary} />
              <AppText variant="bodyStrong" color="secondary" style={{ flex: 1 }}>
                {t('checkout.walletMethod')}
              </AppText>
              <AppText variant="caption" color="tertiary">
                {t('common.soon')}
              </AppText>
            </View>
            <AppText variant="bodySm" color="tertiary">
              {t('checkout.onlyKaparNote', { amount: formatMkd(balance, locale) })}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(2) }}>
              <Ionicons name="lock-closed" size={14} color={colors.textTertiary} style={{ marginTop: 2 }} />
              <AppText variant="bodySm" color="tertiary" style={{ flex: 1 }}>
                {t('checkout.secure')}
              </AppText>
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
          iconLeft={step === 3 && !processing ? <Ionicons name="lock-closed" size={15} color={colors.onPrimary} /> : undefined}
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
