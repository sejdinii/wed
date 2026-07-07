import * as Haptics from 'expo-haptics';

/**
 * Centralised haptic vocabulary. Every meaningful interaction gets a consistent
 * physical response; failures are swallowed (simulators / devices without engines).
 *
 * Vocabulary:
 *  - select: chips, tabs, calendar dates, steppers
 *  - light:  card taps, favourites
 *  - medium: primary CTAs (continue, reserve)
 *  - success/warning/error: terminal outcomes (kapar paid, validation failed)
 */
export const haptic = {
  select(): void {
    Haptics.selectionAsync().catch(() => {});
  },
  light(): void {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium(): void {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  success(): void {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning(): void {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  error(): void {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
} as const;
