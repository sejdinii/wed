import React from 'react';
import { FlatList, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { BrandedImage } from '@/components/BrandedImage';
import { AppText } from '@/design/components/AppText';
import { EmptyState } from '@/design/components/EmptyState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { useTheme } from '@/design/theme';
import { radius, shadow, spacing } from '@/design/tokens';
import { useBookings } from '@/stores/bookings';
import { useMessages } from '@/stores/messages';
import { useI18n } from '@/i18n';

/**
 * Messages inbox — one thread per booking (chat opens once the kapar is
 * paid). Threads sorted by latest activity; each row shows the last message.
 */
export default function MessagesInboxScreen() {
  const { colors, mode } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const bookings = useBookings((s) => s.bookings);
  const messages = useMessages((s) => s.messages);

  const threads = bookings
    .map((booking) => {
      const thread = messages.filter((m) => m.bookingId === booking.id);
      const last = thread[thread.length - 1];
      return { booking, last, lastAt: last?.atISO ?? booking.createdAtISO };
    })
    .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));

  return (
    <Screen>
      <View style={{ paddingHorizontal: spacing(4), paddingTop: spacing(3), paddingBottom: spacing(3) }}>
        <AppText variant="display">{t('messages.title')}</AppText>
      </View>
      <FlatList
        data={threads}
        keyExtractor={(item) => item.booking.id}
        contentContainerStyle={{ paddingHorizontal: spacing(4), gap: spacing(2.5), paddingBottom: spacing(8) }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PressableScale
            onPress={() => router.push(`/messages/${item.booking.id}`)}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={item.booking.venueName}
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(3),
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing(3),
              },
              mode === 'light' ? shadow.card : null,
            ]}
          >
            <BrandedImage uri={item.booking.venuePhoto}
              style={{ width: 52, height: 52, borderRadius: 26 }}
              contentFit="cover"
              transition={200}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="subheading" numberOfLines={1}>
                {item.booking.venueName}
              </AppText>
              <AppText variant="bodySm" color="secondary" numberOfLines={1}>
                {item.last ? item.last.text : item.booking.confirmationCode}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </PressableScale>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubble-ellipses-outline"
            title={t('messages.emptyTitle')}
            body={t('messages.emptyBody')}
            actionLabel={t('bookings.emptyCta')}
            onAction={() => router.push('/(tabs)')}
          />
        }
      />
    </Screen>
  );
}
