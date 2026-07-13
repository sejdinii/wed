import React, { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { EmptyState } from '@/design/components/EmptyState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { useTheme } from '@/design/theme';
import { radius, spacing, typeScale } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import type { ChatMessage } from '@/domain/types';
import { useBookings } from '@/stores/bookings';
import { useMessages } from '@/stores/messages';
import { useIsAuthenticated } from '@/stores/preferences';
import { useI18n } from '@/i18n';

/**
 * Couple ↔ venue chat, threaded per booking. Opens only after the kapar is
 * paid — negotiation stays on-platform and documented (contracts, menu
 * tastings, visits). Deliberately WhatsApp-simple: bubbles and an input.
 */
export default function MessagesScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const booking = useBookings((s) => s.bookings.find((b) => b.id === bookingId));
  const authed = useIsAuthenticated();
  const thread = useMessages((s) => s.messages.filter((m) => m.bookingId === bookingId));
  const send = useMessages((s) => s.send);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  if (!authed) return <Redirect href="/welcome" />;
  if (!booking) {
    return (
      <Screen>
        <EmptyState
          icon="chatbubble-outline"
          title={t('messages.emptyTitle')}
          body={t('messages.emptyBody')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    haptic.light();
    send({
      id: `m_${Date.now().toString(36)}`,
      bookingId: booking.id,
      from: 'couple',
      text: trimmed,
      atISO: new Date().toISOString(),
    });
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  };

  return (
    <Screen edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(3),
          paddingHorizontal: spacing(4),
          paddingVertical: spacing(3),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <PressableScale onPress={() => router.back()} hapticFeedback="select" accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <AppText variant="subheading" numberOfLines={1}>
            {booking.venueName}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
            <AppText variant="caption" color="secondary">
              {t('messages.online')}
            </AppText>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={thread}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing(4), gap: spacing(2) }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const mine = item.from === 'couple';
            return (
              <View
                style={{
                  maxWidth: '78%',
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  backgroundColor: mine ? colors.primary : colors.surfaceElevated,
                  borderRadius: radius.lg,
                  borderBottomRightRadius: mine ? radius.xs : radius.lg,
                  borderBottomLeftRadius: mine ? radius.lg : radius.xs,
                  paddingHorizontal: spacing(3),
                  paddingVertical: spacing(2.5),
                }}
              >
                <AppText variant="bodySm" style={{ color: mine ? colors.onPrimary : colors.text }}>
                  {item.text}
                </AppText>
              </View>
            );
          }}
        />

        {/* Input bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing(2.5),
            paddingHorizontal: spacing(3),
            paddingTop: spacing(2),
            paddingBottom: insets.bottom + spacing(2),
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('messages.inputPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            multiline
            accessibilityLabel={t('messages.inputPlaceholder')}
            style={{
              flex: 1,
              ...typeScale.body,
              color: colors.text,
              borderWidth: 1.5,
              borderColor: colors.border,
              borderRadius: radius.xl,
              paddingHorizontal: spacing(3.5),
              paddingVertical: spacing(2.5),
              maxHeight: 110,
            }}
          />
          <PressableScale
            onPress={submit}
            scaleTo={0.85}
            hapticFeedback={null}
            accessibilityRole="button"
            accessibilityLabel="➤"
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-up" size={19} color={colors.onPrimary} />
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
