import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { Skeleton } from '@/design/components/Skeleton';
import { FlowHeader } from '@/components/FlowHeader';
import { KaparBreakdown } from '@/components/KaparBreakdown';
import { RefundTimeline } from '@/components/RefundTimeline';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { formatLongDate } from '@/lib/dates';
import { estimateTotalMkd, findTier, kaparAmountMkd } from '@/domain/kapar';
import type { Venue } from '@/domain/types';
import { venueApi } from '@/data/api';
import { useBookingDraft } from '@/stores/bookingDraft';
import { useI18n } from '@/i18n';

/**
 * Checkout step 2 — the trust screen. Everything the couple is agreeing to,
 * on one screen, before any card is touched: what they pay now (kapar, gold),
 * what they pay at the venue, the exact refund calendar for THEIR date, and
 * an explicit terms acknowledgement. Hyatt hides deposit terms in fine print
 * at this step; we make them the entire screen.
 */
export default function BookingReviewScreen() {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const draft = useBookingDraft();
  const [venue, setVenue] = useState<Venue | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!draft.venueId) return;
    (async () => {
      const result = await venueApi.getVenue(draft.venueId as string);
      if (!cancelled && result) setVenue(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [draft.venueId]);

  if (!draft.venueId || !draft.dateISO || !draft.menuTierId) return <Redirect href="/(tabs)" />;

  const estimate = venue ? estimateTotalMkd(venue, draft.menuTierId, draft.guestCount) : 0;
  const kapar = venue ? kaparAmountMkd(venue.kaparPolicy, estimate) : 0;
  const tier = venue ? findTier(venue, draft.menuTierId) : undefined;

  return (
    <Screen>
      <FlowHeader title={t('booking.step2Title')} step={2} />
      {venue === null ? (
        <View style={{ padding: spacing(5), gap: spacing(4) }}>
          <Skeleton height={90} radius={radius.lg} />
          <Skeleton height={200} radius={radius.lg} />
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: spacing(5), gap: spacing(4), paddingBottom: spacing(30) }}
          >
            {/* What you're reserving */}
            <Card padding={3.5} style={{ flexDirection: 'row', gap: spacing(3), alignItems: 'center' }}>
              <Image
                source={{ uri: venue.photos[0] }}
                style={{ width: 68, height: 68, borderRadius: radius.md }}
                contentFit="cover"
                accessibilityIgnoresInvertColors
              />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="subheading" numberOfLines={1}>
                  {venue.name}
                </AppText>
                <AppText variant="bodySm" color="secondary">
                  {formatLongDate(draft.dateISO, locale)}
                </AppText>
                <AppText variant="bodySm" color="secondary">
                  {t('bookings.guestCount', { count: draft.guestCount })}
                  {tier ? ` · ${tier.name[locale]}` : ''}
                </AppText>
              </View>
            </Card>

            {/* Money — where every denar goes */}
            <Card padding={4}>
              <KaparBreakdown estimateMkd={estimate} kaparMkd={kapar} />
            </Card>

            {/* Refund ladder with real dates */}
            <View style={{ gap: spacing(3) }}>
              <AppText variant="heading">{t('venue.refundTitle')}</AppText>
              <Card padding={4}>
                <RefundTimeline policy={venue.kaparPolicy} eventDateISO={draft.dateISO} />
              </Card>
            </View>

            {/* Kapar Protection */}
            <Card padding={4} style={{ gap: spacing(3), backgroundColor: colors.successSoft, borderColor: colors.success }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                <Ionicons name="shield-checkmark" size={18} color={colors.onSuccessSoft} />
                <AppText variant="subheading" style={{ color: colors.onSuccessSoft }}>
                  {t('venue.protectionTitle')}
                </AppText>
              </View>
              {([1, 2, 3] as const).map((n) => (
                <AppText key={n} variant="bodySm" style={{ color: colors.onSuccessSoft }}>
                  · {t(`venue.protect${n}`)}
                </AppText>
              ))}
            </Card>

            {/* Explicit consent */}
            <PressableScale
              onPress={() => draft.setTermsAccepted(!draft.termsAccepted)}
              hapticFeedback="select"
              scaleTo={0.99}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: draft.termsAccepted }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  borderWidth: 2,
                  borderColor: draft.termsAccepted ? colors.primary : colors.borderStrong,
                  backgroundColor: draft.termsAccepted ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {draft.termsAccepted ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : null}
              </View>
              <AppText variant="body" style={{ flex: 1 }}>
                {t('booking.acceptTerms')}
              </AppText>
            </PressableScale>
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
              title={t('booking.toPayment')}
              onPress={() => router.push('/booking/pay')}
              disabled={!draft.termsAccepted}
              fullWidth
            />
          </View>
        </>
      )}
    </Screen>
  );
}
