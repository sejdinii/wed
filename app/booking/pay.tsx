import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { Badge } from '@/design/components/Badge';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { Screen } from '@/design/components/Screen';
import { FlowHeader } from '@/components/FlowHeader';
import { useTheme } from '@/design/theme';
import { radius, spacing, typeScale } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { formatMkd } from '@/lib/money';
import { estimateTotalMkd, kaparAmountMkd, makeConfirmationCode } from '@/domain/kapar';
import type { Booking, Venue } from '@/domain/types';
import { venueApi } from '@/data/api';
import { useBookingDraft } from '@/stores/bookingDraft';
import { useBookings } from '@/stores/bookings';
import { useI18n } from '@/i18n';

/** Luhn checksum — catches typos client-side before the gateway round-trip. */
function isValidCardNumber(digits: string): boolean {
  if (digits.length < 15 || digits.length > 16) return false;
  let sum = 0;
  let doubleIt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
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

/**
 * Checkout step 3 — pay the kapar.
 *
 * The hero is the kapar amount alone: by this point the user has already seen
 * and accepted the full breakdown; repeating the total here would only
 * re-trigger sticker shock at the exact moment of commitment.
 *
 * INTEGRATION POINT (marked, not hidden): `processPayment` simulates the
 * gateway. Production wires this to CaSys cPay (the local card processor,
 * with 3-D Secure) behind the same async signature; Stripe covers diaspora
 * cards when we expand. The booking is only written after the (simulated)
 * charge resolves — never before.
 */
export default function BookingPayScreen() {
  const { colors, mode } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const draft = useBookingDraft();
  const addBooking = useBookings((s) => s.addBooking);
  const [venue, setVenue] = useState<Venue | null>(null);

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [holderName, setHolderName] = useState('');
  const [error, setError] = useState(false);
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

  if (!draft.venueId || !draft.dateISO || !draft.menuTierId || !draft.termsAccepted) {
    return <Redirect href="/(tabs)" />;
  }

  const estimate = venue ? estimateTotalMkd(venue, draft.menuTierId, draft.guestCount) : 0;
  const kapar = venue ? kaparAmountMkd(venue.kaparPolicy, estimate) : 0;

  const formatCardNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    setCardNumber(digits.replace(/(\d{4})(?=\d)/g, '$1 '));
  };

  const formatExpiry = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
  };

  const pay = () => {
    if (!venue) return;
    const digits = cardNumber.replace(/\D/g, '');
    const valid =
      isValidCardNumber(digits) && isValidExpiry(expiry) && cvc.length >= 3 && holderName.trim().length >= 2;
    if (!valid) {
      setError(true);
      haptic.error();
      return;
    }
    setError(false);
    setProcessing(true);

    // PLACEHOLDER PAYMENT GATEWAY — replace with CaSys cPay / Stripe call.
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
        balanceDueMkd: Math.max(0, estimate - kapar),
        status: 'reserved',
        createdAtISO: now,
        timeline: [
          { status: 'pending_kapar', at: now },
          { status: 'reserved', at: now },
        ],
      };
      addBooking(booking);
      haptic.success();
      router.replace({ pathname: '/booking/confirmed', params: { bookingId: booking.id } });
    }, 1400);
  };

  const inputStyle = {
    ...typeScale.body,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing(4),
    height: 52,
    backgroundColor: mode === 'dark' ? colors.surfaceElevated : colors.surface,
  } as const;

  // Plain render helper, NOT a component: defining a component inside render
  // would remount the TextInput (and drop keyboard focus) on every keystroke.
  const renderField = ({
    label,
    value,
    onChange,
    placeholder,
    keyboardType,
    secure,
    maxLength,
    flex,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    keyboardType?: KeyboardTypeOptions;
    secure?: boolean;
    maxLength?: number;
    flex?: number;
  }) => (
    <View style={{ gap: spacing(1.5), flex }}>
      <AppText variant="label" color="secondary">
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        maxLength={maxLength}
        autoCapitalize="none"
        accessibilityLabel={label}
        style={inputStyle}
      />
    </View>
  );

  return (
    <Screen>
      <FlowHeader title={t('booking.step3Title')} step={3} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing(5), gap: spacing(4), paddingBottom: spacing(30) }}
      >
        {/* The kapar amount — the only number on this screen */}
        <View style={{ alignItems: 'center', gap: spacing(1), paddingVertical: spacing(4) }}>
          <AppText variant="caption" color="tertiary">
            {t('payment.amountLabel').toUpperCase()}
          </AppText>
          <AppText variant="priceHero" color="brand">
            {formatMkd(kapar, locale)}
          </AppText>
        </View>

        {/* Method */}
        <View style={{ flexDirection: 'row', gap: spacing(3) }}>
          <Card padding={3.5} style={{ flex: 1, borderColor: colors.primary, borderWidth: 1.5, gap: spacing(1) }}>
            <Ionicons name="card" size={20} color={colors.primary} />
            <AppText variant="label">{t('payment.methodCard')}</AppText>
          </Card>
          <Card padding={3.5} style={{ flex: 1, opacity: 0.55, gap: spacing(1) }}>
            <Ionicons name="phone-portrait-outline" size={20} color={colors.textSecondary} />
            <AppText variant="label" color="secondary" numberOfLines={1}>
              {t('payment.methodWallet')}
            </AppText>
            <Badge label={t('payment.walletSoon')} tone="neutral" />
          </Card>
        </View>

        {/* Card form */}
        <View style={{ gap: spacing(3) }}>
          {renderField({
            label: t('payment.cardNumber'),
            value: cardNumber,
            onChange: formatCardNumber,
            placeholder: '1234 5678 9012 3456',
            keyboardType: 'number-pad',
            maxLength: 19,
          })}
          <View style={{ flexDirection: 'row', gap: spacing(3) }}>
            {renderField({
              label: t('payment.expiry'),
              value: expiry,
              onChange: formatExpiry,
              placeholder: '09/27',
              keyboardType: 'number-pad',
              maxLength: 5,
              flex: 1,
            })}
            {renderField({
              label: t('payment.cvc'),
              value: cvc,
              onChange: (v) => setCvc(v.replace(/\D/g, '').slice(0, 4)),
              placeholder: '123',
              keyboardType: 'number-pad',
              secure: true,
              maxLength: 4,
              flex: 1,
            })}
          </View>
          {renderField({
            label: t('payment.cardName'),
            value: holderName,
            onChange: setHolderName,
            placeholder: 'ANA STOJANOVSKA',
          })}
        </View>

        {error ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
            <Ionicons name="alert-circle" size={17} color={colors.danger} />
            <AppText variant="bodySm" color="danger">
              {t('payment.invalidCard')}
            </AppText>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(2) }}>
          <Ionicons name="lock-closed" size={15} color={colors.textTertiary} style={{ marginTop: 2 }} />
          <AppText variant="bodySm" color="tertiary" style={{ flex: 1 }}>
            {t('payment.secureNote')}
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
          title={processing ? t('payment.processing') : t('payment.payCta', { amount: formatMkd(kapar, locale) })}
          onPress={pay}
          loading={processing}
          fullWidth
        />
      </View>
    </Screen>
  );
}
