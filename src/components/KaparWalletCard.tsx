import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppText } from '@/design/components/AppText';
import { Badge } from '@/design/components/Badge';
import { brand, radius, shadow, spacing } from '@/design/tokens';
import { formatMkd } from '@/lib/money';
import { formatMediumDate } from '@/lib/dates';
import type { Booking } from '@/domain/types';
import { useI18n } from '@/i18n';

/**
 * The digital kapar receipt, styled as a wallet pass (Apple Wallet inspiration).
 * In a market where kapar is traditionally cash and a handshake, this card IS
 * the product's trust artifact — it must feel like a document, not a dialog.
 * Colors are intentionally fixed (not themed): a pass looks the same everywhere.
 */
export function KaparWalletCard({ booking }: { booking: Booking }) {
  const { locale, t } = useI18n();

  const ink = '#F7F3EA';
  const inkMuted = 'rgba(247, 243, 234, 0.6)';

  const Field = ({ label, value }: { label: string; value: string }) => (
    <View style={{ flex: 1, gap: spacing(0.5) }}>
      <AppText variant="caption" style={{ color: inkMuted }}>
        {label.toUpperCase()}
      </AppText>
      <AppText variant="bodyStrong" style={{ color: ink }} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );

  return (
    <LinearGradient
      colors={[brand.green800, brand.green700]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radius.xl, padding: spacing(5), gap: spacing(4) }, shadow.raised]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="label" style={{ color: brand.gold300, letterSpacing: 3 }}>
          KAPAR
        </AppText>
        <Badge label={t('kaparCard.event')} tone="accent" />
      </View>

      <AppText variant="title" style={{ color: ink }} numberOfLines={2}>
        {booking.venueName}
      </AppText>

      <View style={{ height: 1, backgroundColor: 'rgba(247,243,234,0.15)' }} />

      <View style={{ flexDirection: 'row', gap: spacing(3) }}>
        <Field label={t('kaparCard.date')} value={formatMediumDate(booking.eventDateISO, locale)} />
        <Field label={t('kaparCard.guests')} value={`${booking.guestCount}`} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing(3) }}>
        <Field label={t('kaparCard.kapar')} value={formatMkd(booking.kaparMkd, locale)} />
        <Field label={t('kaparCard.code')} value={booking.confirmationCode} />
      </View>
    </LinearGradient>
  );
}
