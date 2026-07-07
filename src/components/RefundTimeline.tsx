import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/design/components/AppText';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { addDaysISO, formatMediumDate } from '@/lib/dates';
import { sortedRefundTiers } from '@/domain/kapar';
import type { KaparPolicy } from '@/domain/types';
import { useI18n } from '@/i18n';

export interface RefundTimelineProps {
  policy: KaparPolicy;
  /** With a concrete event date the ladder shows real calendar dates. */
  eventDateISO?: string | null;
}

/**
 * The cancellation ladder as a visual timeline (Navan's checkout pattern),
 * not legal prose. Green → amber → red dots make "when do I stop getting my
 * kapar back" legible in two seconds. Concrete dates appear once a date is
 * chosen — deadlines beat "90 days before" every time.
 */
export function RefundTimeline({ policy, eventDateISO }: RefundTimelineProps) {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const tiers = sortedRefundTiers(policy);

  const dotColor = (percent: number): string =>
    percent >= 100 ? colors.success : percent > 0 ? colors.amber : colors.danger;

  const rows = tiers.map((tier, i) => {
    const prev = tiers[i - 1];
    let periodLabel: string;
    if (tier.minDaysBeforeEvent > 0) {
      periodLabel = eventDateISO
        ? t('refund.untilDate', { date: formatMediumDate(addDaysISO(eventDateISO, -tier.minDaysBeforeEvent), locale) })
        : t('refund.moreThanDays', { days: tier.minDaysBeforeEvent });
    } else {
      const boundary = prev?.minDaysBeforeEvent ?? 0;
      periodLabel = eventDateISO
        ? t('refund.afterDate', { date: formatMediumDate(addDaysISO(eventDateISO, -boundary), locale) })
        : t('refund.lastDays', { days: boundary });
    }
    const refundLabel =
      tier.refundPercent >= 100
        ? t('refund.fullRefund')
        : tier.refundPercent > 0
          ? t('refund.partialRefund', { percent: tier.refundPercent })
          : t('refund.noRefund');
    return { key: `${tier.minDaysBeforeEvent}`, periodLabel, refundLabel, color: dotColor(tier.refundPercent) };
  });

  return (
    <View>
      {rows.map((row, i) => (
        <View key={row.key} style={{ flexDirection: 'row', gap: spacing(3) }}>
          <View style={{ alignItems: 'center', width: 12 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: row.color, marginTop: 5 }} />
            {i < rows.length - 1 ? (
              <View style={{ width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2 }} />
            ) : null}
          </View>
          <View style={{ flex: 1, paddingBottom: i < rows.length - 1 ? spacing(4) : 0 }}>
            <AppText variant="bodyStrong">{row.refundLabel}</AppText>
            <AppText variant="bodySm" color="secondary">
              {row.periodLabel}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}
