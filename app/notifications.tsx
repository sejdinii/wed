import React, { useEffect, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { EmptyState } from '@/design/components/EmptyState';
import { ErrorState } from '@/design/components/ErrorState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { Skeleton } from '@/design/components/Skeleton';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { relativeTimeParts } from '@/lib/dates';
import { isNotificationVisible, notificationApi, type NotificationItem } from '@/data/notificationApi';
import { vendorApi } from '@/data/vendorApi';
import { useIsAuthenticated, usePreferences } from '@/stores/preferences';
import { useI18n, type Translate } from '@/i18n';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ICON_BY_KIND: Record<string, IconName> = {
  booking_request: 'person-add',
  booking_reserved: 'time',
  booking_confirmed: 'checkmark-circle',
  booking_cancelled_by_venue: 'close-circle',
  booking_cancelled_by_couple: 'close-circle',
  booking_expired: 'hourglass',
  booking_completed: 'flag',
  message: 'chatbubble',
};

function bodyFor(item: NotificationItem, t: Translate): string {
  const venue = item.booking?.venueName ?? '';
  const name = item.booking?.contactName ?? '';
  switch (item.kind) {
    case 'booking_request':
      return t('notif.bookingRequestBody', { name });
    case 'booking_reserved':
      return t('notif.reservedBody', { venue });
    case 'booking_confirmed':
      return t('notif.confirmedBody', { venue });
    case 'booking_cancelled_by_venue':
      return t('notif.cancelledByVenueBody', { venue });
    case 'booking_cancelled_by_couple':
      return t('notif.cancelledByCoupleBody', { name });
    case 'booking_expired':
      return t('notif.expiredBody');
    case 'booking_completed':
      return t('notif.completedBody', { venue });
    case 'message':
      return t('notif.messageBody');
    default:
      return '';
  }
}

function relativeLabel(iso: string, nowMs: number, t: Translate): string {
  const { unit, count } = relativeTimeParts(iso, nowMs);
  if (unit === 'now') return t('notif.justNow');
  if (unit === 'minutes') return t('notif.minutesAgo', { count });
  if (unit === 'hours') return t('notif.hoursAgo', { count });
  return t('notif.daysAgo', { count });
}

/**
 * The notification center (Wave 5) — server-backed, honest-badge inbox. Rows
 * are pure display: copy is composed client-side from kind + the joined
 * booking fields (never the raw `kind` string), and the settings toggles
 * (notifConfirm/notifMessages/notifRefund) actually hide/show rows here —
 * this screen is what makes those switches real.
 */
export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const authed = useIsAuthenticated();
  const authUser = usePreferences((s) => s.authUser);
  const notifConfirm = usePreferences((s) => s.notifConfirm);
  const notifMessages = usePreferences((s) => s.notifMessages);
  const notifRefund = usePreferences((s) => s.notifRefund);

  const [data, setData] = useState<{ unreadCount: number; items: NotificationItem[] } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((n) => n + 1);

  // Is the viewer the vendor who owns the booking these rows are about?
  // Resolved ONCE (not per-row): booking_request and a 'message' row a vendor
  // receives are, by construction of the server fan-out, always about their
  // own venue — there is no other way a vendor account would get one.
  const [isVendorViewer, setIsVendorViewer] = useState(false);

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const handle = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(handle);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    (async () => {
      try {
        const result = await notificationApi.list();
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    let cancelled = false;
    if (authUser?.role === 'vendor' || authUser?.role === 'both') {
      vendorApi
        .myVenue()
        .then((v) => {
          if (!cancelled) setIsVendorViewer(!!v);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [authUser?.role]);

  // Mark-all-read fires once, after the list has rendered.
  const markedRef = useRef(false);
  useEffect(() => {
    if (!data || markedRef.current) return;
    markedRef.current = true;
    notificationApi
      .markRead()
      .then(() => {
        const nowISO = new Date().toISOString();
        setData((d) => (d ? { unreadCount: 0, items: d.items.map((i) => (i.readAtISO ? i : { ...i, readAtISO: nowISO })) } : d));
      })
      .catch(() => {
        // Best-effort — the badge simply stays honest (unread) until the next visit.
      });
  }, [data]);

  if (!authed) return <Redirect href="/welcome" />;

  const prefs = { notifConfirm, notifMessages, notifRefund };
  const visibleItems = (data?.items ?? []).filter((i) => isNotificationVisible(i.kind, prefs));

  const onPressItem = (item: NotificationItem) => {
    if (!item.bookingId) return;
    if (item.kind === 'booking_request') {
      router.push('/today');
      return;
    }
    if (item.kind === 'message') {
      router.push(isVendorViewer ? '/today' : `/messages/${item.bookingId}`);
      return;
    }
    router.push(`/booking/${item.bookingId}`);
  };

  return (
    <Screen>
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
        <AppText variant="heading" style={{ flex: 1, textAlign: 'center' }}>
          {t('notif.title')}
        </AppText>
        <View style={{ width: 22 }} />
      </View>

      {loadFailed ? (
        <ErrorState onRetry={retry} secondaryLabel={t('common.back')} onSecondary={() => router.back()} />
      ) : data === null ? (
        <View style={{ padding: spacing(4), gap: spacing(3) }}>
          <Skeleton height={72} radius={radius.md} />
          <Skeleton height={72} radius={radius.md} />
          <Skeleton height={72} radius={radius.md} />
        </View>
      ) : visibleItems.length === 0 ? (
        <EmptyState icon="notifications-outline" title={t('notif.emptyTitle')} body={t('notif.emptyBody')} />
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing(4), gap: spacing(2.5), paddingBottom: spacing(8) }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const unread = !item.readAtISO;
            return (
              <PressableScale
                onPress={() => onPressItem(item)}
                scaleTo={0.98}
                hapticFeedback="select"
                accessibilityRole="button"
                accessibilityLabel={bodyFor(item, t)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: spacing(3),
                  backgroundColor: unread ? colors.surfaceElevated : colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing(3.5),
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: colors.mint,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={ICON_BY_KIND[item.kind] ?? 'notifications'} size={18} color={colors.onMint} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant={unread ? 'bodyStrong' : 'body'}>{bodyFor(item, t)}</AppText>
                  <AppText variant="caption" color="secondary">
                    {relativeLabel(item.createdAtISO, nowMs, t)}
                  </AppText>
                </View>
                {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: spacing(1.5) }} /> : null}
              </PressableScale>
            );
          }}
        />
      )}
    </Screen>
  );
}
