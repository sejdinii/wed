import React from 'react';
import { Redirect, Stack } from 'expo-router';

import { usePreferences } from '@/stores/preferences';

/**
 * Business mode — the vendor-facing route group (Wave 2 scaffold). Gated on
 * the vendor role; couples never see these routes. IA decision (founder
 * research, accepted 2026-07-12): the home surface is a Pulse-style "today"
 * action feed, not a stats page — Waves 3–4 fill it in.
 */
export default function BusinessLayout() {
  const authUser = usePreferences((s) => s.authUser);
  const isVendor = authUser?.role === 'vendor' || authUser?.role === 'both';

  if (!isVendor) return <Redirect href="/(tabs)/profile" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="today" />
      <Stack.Screen name="create-venue" />
      <Stack.Screen name="calendar" />
      {/* Wave 4: vendor bookings dashboard. Named venue-bookings because a bare
          "bookings" here SHADOWS the couple tab's /bookings URL (both groups
          collapse out of the path) — deep links landed couples on the vendor
          gate. Run-verified during the Wave 4 integration e2e. */}
      <Stack.Screen name="venue-bookings" />
    </Stack>
  );
}
