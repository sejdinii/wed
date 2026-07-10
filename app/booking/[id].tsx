import React from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Badge, type BadgeTone } from '@/design/components/Badge';
import { Button } from '@/design/components/Button';
import { Divider } from '@/design/components/Divider';
import { EmptyState } from '@/design/components/EmptyState';
import { ExpandableSection } from '@/design/components/ExpandableSection';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { RefundTimeline } from '@/components/RefundTimeline';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { formatMkd, formatMkdBare } from '@/lib/money';
import { formatLongDate, formatMediumDate } from '@/lib/dates';
import type { BookingStatus } from '@/domain/types';
import { VENUES } from '@/data/venues';
import { useBookings } from '@/stores/bookings';
import { useI18n } from '@/i18n';

const STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  pending_kapar: 'warning',
  reserved: 'warning',
  confirmed: 'success',
  completed: 'neutral',
  cancelled_by_couple: 'danger',
  cancelled_by_venue: 'danger',
  expired: 'neutral',
};

/**
 * Booking details — section rows, a dark "message the venue" pill, and a
 * payment block that always tells the whole truth: estimate / kapar paid /
 * balance due at the venue.
 */
export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const router = useRouter();

  const booking = useBookings((s) => s.bookings.find((b) => b.id === id));
  const venue = booking ? VENUES.find((v) => v.id === booking.venueId) : undefined;

  if (!booking) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title={t('details.notFound')} body="" actionLabel={t('common.back')} onAction={() => router.back()} />
      </Screen>
    );
  }

  const tier = venue?.menuTiers.find((m) => m.id === booking.menuTierId);

  const SectionRow = ({
    icon,
    title,
    subtitle,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    subtitle: string;
  }) => (
    <View style={{ flexDirection: 'row', gap: spacing(3), paddingVertical: spacing(3.5), alignItems: 'flex-start' }}>
      <Ionicons name={icon} size={19} color={colors.text} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="bodySm" color="secondary">
          {subtitle}
        </AppText>
      </View>
    </View>
  );

  const PayRow = ({ label, value, gold }: { label: string; value: string; gold?: boolean }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing(1.5) }}>
      <AppText variant="bodySm" color="secondary" style={{ flexShrink: 1 }}>
        {label}
      </AppText>
      <AppText variant="bodySmStrong" color={gold ? 'gold' : 'primary'}>
        {value}
      </AppText>
    </View>
  );

  return (
    <Screen>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing(4),
          paddingVertical: spacing(3),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <PressableScale onPress={() => router.back()} hapticFeedback="select" accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <AppText variant="heading" style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>
          {t('details.title', { code: booking.confirmationCode })}
        </AppText>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing(4), gap: spacing(3), paddingBottom: spacing(10) }}>
        <Badge label={t(`bookingStatus.${booking.status}`)} tone={STATUS_TONE[booking.status]} dot />

        {/* Action-required banner while the hold waits for the kapar */}
        {booking.status === 'reserved' && booking.payByISO ? (
          <View
            style={{
              flexDirection: 'row',
              gap: spacing(2.5),
              backgroundColor: colors.amberSoft,
              borderRadius: radius.md,
              padding: spacing(3),
              alignItems: 'flex-start',
            }}
          >
            <Ionicons name="wallet-outline" size={17} color={colors.amber} style={{ marginTop: 1 }} />
            <AppText variant="bodySm" style={{ flex: 1, color: colors.text }}>
              {t('details.payBanner', { venue: booking.venueName, date: formatMediumDate(booking.payByISO, locale) })}
            </AppText>
          </View>
        ) : null}

        <View>
          <SectionRow
            icon="heart-outline"
            title={t('details.yourWedding')}
            subtitle={`${booking.venueName} · ${formatLongDate(booking.eventDateISO, locale)} · ${t('bookings.guestCount', { count: booking.guestCount })}`}
          />
          <Divider />
          <SectionRow
            icon="restaurant-outline"
            title={t('details.whatsIncluded')}
            subtitle={tier ? `${tier.name[locale]} · ${tier.description[locale]}` : '—'}
          />
          <Divider />
          {venue ? (
            <>
              <ExpandableSection title={t('details.cancellationTerms')}>
                <RefundTimeline policy={venue.kaparPolicy} eventDateISO={booking.eventDateISO} />
              </ExpandableSection>
              <Divider />
            </>
          ) : null}
        </View>

        <Button
          title={t('status.messageVenue')}
          onPress={() => router.push(`/messages/${booking.id}`)}
          variant="dark"
          iconLeft={<Ionicons name="chatbubble-outline" size={16} color={colors.onChip} />}
          fullWidth
        />

        <AppText variant="heading" style={{ marginTop: spacing(2) }}>
          {t('details.payment')}
        </AppText>
        <View style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: spacing(3.5) }}>
          <PayRow
            label={t('details.estimateLine', {
              guests: booking.guestCount,
              price: tier ? formatMkdBare(tier.pricePerGuestMkd, locale) : '—',
            })}
            value={formatMkd(booking.estimatedTotalMkd, locale)}
          />
          <PayRow
            label={
              booking.kaparPaidAtISO
                ? t('details.kaparPaidAtVenue')
                : booking.payByISO
                  ? t('details.kaparDueBy', { date: formatMediumDate(booking.payByISO, locale) })
                  : t('details.kaparDue')
            }
            value={`${booking.kaparPaidAtISO ? '− ' : ''}${formatMkd(booking.kaparMkd, locale)}`}
            gold
          />
          {booking.refund ? (
            <PayRow
              label={t('details.refundReturned', { percent: booking.refund.percent })}
              value={formatMkd(booking.refund.amountMkd, locale)}
            />
          ) : null}
          <Divider />
          <PayRow label={t('details.balanceVenue')} value={formatMkd(booking.balanceDueMkd, locale)} />
        </View>

        <PressableScale
          onPress={() => router.push(`/venue/${booking.venueId}`)}
          scaleTo={0.99}
          hapticFeedback="select"
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(3) }}
        >
          <Ionicons name="business-outline" size={19} color={colors.text} />
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            {booking.venueName}
          </AppText>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </PressableScale>
        <Divider />
        {/* PLACEHOLDER — opens the support flow once it exists. */}
        <PressableScale
          onPress={() => {}}
          scaleTo={0.99}
          hapticFeedback="select"
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(3) }}
        >
          <Ionicons name="help-buoy-outline" size={19} color={colors.text} />
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            {t('details.help')}
          </AppText>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </PressableScale>
        {booking.status === 'pending_kapar' || booking.status === 'reserved' || booking.status === 'confirmed' ? (
          <>
            <Divider />
            <PressableScale
              onPress={() => router.push({ pathname: '/booking/cancel', params: { bookingId: booking.id } })}
              scaleTo={0.99}
              hapticFeedback="select"
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(3) }}
            >
              <Ionicons name="close-circle-outline" size={19} color={colors.danger} />
              <AppText variant="bodyStrong" style={{ flex: 1, color: colors.danger }}>
                {t('details.cancelBooking')}
              </AppText>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </PressableScale>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
