import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/design/components/AppText';
import { Divider } from '@/design/components/Divider';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { formatMkd } from '@/lib/money';
import { useI18n } from '@/i18n';

export interface KaparBreakdownProps {
  estimateMkd: number;
  kaparMkd: number;
}

/**
 * The single most important piece of pricing UI in the product.
 * Three lines, no ambiguity about WHERE each amount is paid:
 *   total estimate → kapar (gold, paid NOW through the app) → balance (at the venue).
 * Modelled on Fresha's pay-now/pay-at-venue split — the honest version of
 * "pay part now, part later".
 */
export function KaparBreakdown({ estimateMkd, kaparMkd }: KaparBreakdownProps) {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const balance = Math.max(0, estimateMkd - kaparMkd);

  return (
    <View style={{ gap: spacing(3) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="body" color="secondary">
          {t('booking.estimatedTotal')}
        </AppText>
        <AppText variant="bodyStrong">{formatMkd(estimateMkd, locale)}</AppText>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: colors.accentSoft,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.accent,
          paddingHorizontal: spacing(3.5),
          paddingVertical: spacing(3),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), flexShrink: 1 }}>
          <Ionicons name="wallet" size={18} color={colors.onAccentSoft} />
          <AppText variant="bodyStrong" style={{ color: colors.onAccentSoft, flexShrink: 1 }}>
            {t('booking.payNow')}
          </AppText>
        </View>
        <AppText variant="heading" style={{ color: colors.onAccentSoft }}>
          {formatMkd(kaparMkd, locale)}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="body" color="secondary">
          {t('booking.payAtVenue')}
        </AppText>
        <AppText variant="bodyStrong">{formatMkd(balance, locale)}</AppText>
      </View>

      <Divider />
      <AppText variant="bodySm" color="tertiary">
        {t('booking.balanceNote')}
      </AppText>
    </View>
  );
}
