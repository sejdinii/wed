import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { WEEKDAYS_SHORT, mondayIndex, toISODate } from '@/lib/dates';
import type { Locale } from '@/i18n';

export type DayState = 'available' | 'limited' | 'booked';

export interface CalendarMonthProps {
  /** Any date inside the month to render. */
  month: Date;
  locale: Locale;
  selectedISO: string | null;
  /** Dates strictly before this are not selectable. */
  minISO: string;
  /**
   * Per-day availability driving the colored dot:
   * green = available, amber = limited, red = booked (not selectable).
   */
  stateFor: (iso: string) => DayState;
  onSelect: (iso: string) => void;
}

/**
 * Availability calendar with per-day state dots (green/amber/red) and a
 * solid violet circle for the selected day, per the v3 design.
 * Monday-first weeks; past days render muted with no dot.
 */
export function CalendarMonth({ month, locale, selectedISO, minISO, stateFor, onSelect }: CalendarMonthProps) {
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

  const dotColor: Record<DayState, string> = {
    available: colors.success,
    limited: colors.amber,
    booked: colors.danger,
  };

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
            const state = stateFor(cell.iso);
            const selectable = !isPast && state !== 'booked';
            const selected = cell.iso === selectedISO;

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
                      color: selected ? colors.onPrimary : isPast ? colors.textTertiary : colors.text,
                      opacity: isPast ? 0.4 : 1,
                    }}
                  >
                    {cell.day}
                  </AppText>
                  {!isPast ? (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 3,
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: selected ? colors.onPrimary : dotColor[state],
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
