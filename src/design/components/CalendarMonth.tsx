import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { WEEKDAYS_SHORT, mondayIndex, toISODate } from '@/lib/dates';
import type { Locale } from '@/i18n';

export interface CalendarMonthProps {
  /** Any date inside the month to render. */
  month: Date;
  locale: Locale;
  selectedISO: string | null;
  /** Dates strictly before this are not selectable. */
  minISO: string;
  isBlocked: (iso: string) => boolean;
  onSelect: (iso: string) => void;
}

/**
 * Date-first is the core interaction of the whole product ("is my date free?"),
 * so the calendar is custom-built rather than a generic dependency:
 * Monday-first weeks, blocked dates struck through (Airbnb pattern — reads as
 * "taken", not "disabled"), and a gold dot marking Saturdays — the wedding day.
 */
export function CalendarMonth({ month, locale, selectedISO, minISO, isBlocked, onSelect }: CalendarMonthProps) {
  const { colors } = useTheme();

  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingBlanks = mondayIndex(firstOfMonth);

  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ iso: toISODate(new Date(month.getFullYear(), month.getMonth(), day)), day });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Array<typeof cells> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: spacing(2) }}>
        {WEEKDAYS_SHORT[locale].map((label, i) => (
          <View key={`${label}-${i}`} style={{ flex: 1, alignItems: 'center' }}>
            <AppText variant="caption" color="tertiary">
              {label}
            </AppText>
          </View>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={{ flexDirection: 'row' }}>
          {week.map((cell, cellIndex) => {
            if (!cell) return <View key={cellIndex} style={{ flex: 1, aspectRatio: 1 }} />;

            const isPast = cell.iso < minISO;
            const blocked = isBlocked(cell.iso);
            const selectable = !isPast && !blocked;
            const selected = cell.iso === selectedISO;
            const saturday = new Date(month.getFullYear(), month.getMonth(), cell.day).getDay() === 6;

            return (
              <Pressable
                key={cell.iso}
                disabled={!selectable}
                onPress={() => {
                  haptic.select();
                  onSelect(cell.iso);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: !selectable }}
                accessibilityLabel={cell.iso}
                style={{ flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? colors.primary : 'transparent',
                  }}
                >
                  <AppText
                    variant={selected ? 'bodyStrong' : 'body'}
                    style={{
                      color: selected
                        ? colors.onPrimary
                        : isPast
                          ? colors.textTertiary
                          : blocked
                            ? colors.textTertiary
                            : colors.text,
                      textDecorationLine: blocked && !isPast ? 'line-through' : 'none',
                      opacity: isPast ? 0.4 : 1,
                    }}
                  >
                    {cell.day}
                  </AppText>
                  {saturday && selectable && !selected ? (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: colors.accent,
                      }}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
