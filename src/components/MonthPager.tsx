import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/design/components/AppText';
import { CalendarMonth, type DayState } from '@/design/components/CalendarMonth';
import { PressableScale } from '@/design/components/PressableScale';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { addMonths, formatMonthTitle, parseISODate } from '@/lib/dates';
import type { Locale } from '@/i18n';

export interface MonthPagerProps {
  locale: Locale;
  selectedISO: string | null;
  minISO: string;
  stateFor: (iso: string) => DayState;
  onSelect: (iso: string) => void;
}

/** Calendar with month navigation. Owns the visible-month state. */
export function MonthPager({ locale, selectedISO, minISO, stateFor, onSelect }: MonthPagerProps) {
  const { colors } = useTheme();
  const [month, setMonth] = useState<Date>(() => {
    const base = selectedISO ? parseISODate(selectedISO) : parseISODate(minISO);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const minMonth = parseISODate(minISO);
  const canGoBack = month.getFullYear() > minMonth.getFullYear() || month.getMonth() > minMonth.getMonth();

  const NavButton = ({ dir }: { dir: -1 | 1 }) => {
    const enabled = dir === 1 || canGoBack;
    return (
      <PressableScale
        onPress={() => setMonth((m) => addMonths(m, dir))}
        disabled={!enabled}
        hapticFeedback="select"
        scaleTo={0.85}
        accessibilityRole="button"
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: enabled ? 1 : 0.3,
        }}
      >
        <Ionicons name={dir === 1 ? 'chevron-forward' : 'chevron-back'} size={18} color={colors.text} />
      </PressableScale>
    );
  };

  return (
    <View style={{ gap: spacing(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <NavButton dir={-1} />
        <AppText variant="subheading">{formatMonthTitle(month, locale)}</AppText>
        <NavButton dir={1} />
      </View>
      <CalendarMonth
        month={month}
        locale={locale}
        selectedISO={selectedISO}
        minISO={minISO}
        stateFor={stateFor}
        onSelect={onSelect}
      />
    </View>
  );
}
