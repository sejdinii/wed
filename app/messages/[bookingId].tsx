import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/design/components/AppText';
import { EmptyState } from '@/design/components/EmptyState';
import { ErrorState } from '@/design/components/ErrorState';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { Skeleton } from '@/design/components/Skeleton';
import { useTheme } from '@/design/theme';
import { radius, spacing, typeScale } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import type { Booking } from '@/domain/types';
import { bookingApi } from '@/data/bookingApi';
import { messageApi, type ChatMessage } from '@/data/messageApi';
import { useI18n } from '@/i18n';

const POLL_MS = 5000;

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Real couple <-> vendor chat (Wave 5), replacing the scripted venueBot
 * fiction with server-backed threads (mock mode still wraps the offline
 * store — see src/data/messageApi.ts). Deliberately WhatsApp-simple: bubbles
 * and an input. `?as=vendor` renders the vendor's side of the SAME thread —
 * the business app opens this exact route with that query param.
 */
export default function MessagesScreen() {
  const { bookingId, as } = useLocalSearchParams<{ bookingId: string; as?: string }>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mySide: 'couple' | 'vendor' = as === 'vendor' ? 'vendor' : 'couple';

  const [booking, setBooking] = useState<Booking | undefined>(undefined);
  const [bookingState, setBookingState] = useState<LoadState>('loading');

  const [thread, setThread] = useState<ChatMessage[]>([]);
  const [threadState, setThreadState] = useState<LoadState>('loading');

  const [text, setText] = useState('');
  const [sendError, setSendError] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  // Optimistic messages not yet confirmed by the server — merged back in if a
  // poll response (fetched concurrently with an in-flight send) would
  // otherwise make them flicker away before the send's own response lands.
  const pendingRef = useRef<ChatMessage[]>([]);

  const loadBooking = useCallback(() => {
    if (!bookingId) return;
    setBookingState('loading');
    bookingApi
      .get(bookingId)
      .then((b) => {
        setBooking(b);
        setBookingState('ready');
      })
      .catch(() => setBookingState('error'));
  }, [bookingId]);

  const loadThread = useCallback(
    (isFirst: boolean) => {
      if (!bookingId) return;
      if (isFirst) setThreadState('loading');
      messageApi
        .list(bookingId)
        .then((list) => {
          const serverIds = new Set(list.map((m) => m.id));
          const stillPending = pendingRef.current.filter((m) => !serverIds.has(m.id));
          setThread([...list, ...stillPending]);
          setThreadState('ready');
        })
        .catch(() => {
          // Subsequent poll failures stay quiet — the last known-good thread
          // stays on screen; only the FIRST load surfaces the error state.
          if (isFirst) setThreadState('error');
        });
    },
    [bookingId],
  );

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  useEffect(() => {
    loadThread(true);
    const handle = setInterval(() => loadThread(false), POLL_MS);
    return () => clearInterval(handle);
  }, [loadThread]);

  useEffect(() => {
    if (threadState === 'ready') {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 30);
    }
  }, [thread.length, threadState]);

  if (!bookingId) return null;

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    haptic.light();
    setSendError(false);

    const optimistic: ChatMessage = {
      id: `pending_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      senderRole: mySide,
      body: trimmed,
      createdAtISO: new Date().toISOString(),
    };
    pendingRef.current = [...pendingRef.current, optimistic];
    setThread((prev) => [...prev, optimistic]);
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);

    messageApi
      .send(bookingId, trimmed)
      .then((saved) => {
        pendingRef.current = pendingRef.current.filter((m) => m.id !== optimistic.id);
        setThread((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
      })
      .catch(() => {
        pendingRef.current = pendingRef.current.filter((m) => m.id !== optimistic.id);
        setThread((prev) => prev.filter((m) => m.id !== optimistic.id));
        setText(trimmed);
        setSendError(true);
      });
  };

  const headerTitle = booking ? (mySide === 'vendor' ? booking.contactName || booking.venueName : booking.venueName) : '';

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
          {bookingState === 'loading' ? (
            <Skeleton width={140} height={18} />
          ) : (
            <AppText variant="subheading" numberOfLines={1}>
              {headerTitle}
            </AppText>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
            <AppText variant="caption" color="secondary">
              {t('messages.online')}
            </AppText>
          </View>
        </View>
      </View>

      {bookingState === 'error' ? (
        <ErrorState onRetry={loadBooking} secondaryLabel={t('common.back')} onSecondary={() => router.back()} />
      ) : bookingState === 'ready' && !booking ? (
        <EmptyState
          icon="chatbubble-outline"
          title={t('messages.emptyTitle')}
          body={t('messages.emptyBody')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {threadState === 'loading' ? (
            <View style={{ padding: spacing(4), gap: spacing(2), flex: 1 }}>
              <Skeleton width="62%" height={40} radius={radius.lg} style={{ alignSelf: 'flex-start' }} />
              <Skeleton width="48%" height={32} radius={radius.lg} style={{ alignSelf: 'flex-end' }} />
              <Skeleton width="70%" height={44} radius={radius.lg} style={{ alignSelf: 'flex-start' }} />
            </View>
          ) : threadState === 'error' ? (
            <ErrorState onRetry={() => loadThread(true)} />
          ) : (
            <FlatList
              ref={listRef}
              data={thread}
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: spacing(4), gap: spacing(2), flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <EmptyState
                  icon="chatbubble-ellipses-outline"
                  title={t('messages.threadEmptyTitle')}
                  body={t('messages.threadEmptyBody', { name: mySide === 'vendor' ? booking?.contactName || '' : booking?.venueName || '' })}
                />
              }
              renderItem={({ item }) => {
                const mine = item.senderRole === mySide;
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
                      {item.body}
                    </AppText>
                  </View>
                );
              }}
            />
          )}

          {/* Input bar */}
          <View
            style={{
              paddingHorizontal: spacing(3),
              paddingTop: spacing(2),
              paddingBottom: insets.bottom + spacing(2),
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            {sendError ? (
              <AppText variant="caption" color="danger" style={{ paddingHorizontal: spacing(1), paddingBottom: spacing(1) }}>
                {t('error.body')}
              </AppText>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2.5) }}>
              <TextInput
                value={text}
                onChangeText={(v) => {
                  setText(v);
                  if (sendError) setSendError(false);
                }}
                placeholder={t('messages.inputPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                multiline
                accessibilityLabel={t('messages.inputPlaceholder')}
                style={{
                  flex: 1,
                  ...typeScale.body,
                  color: colors.text,
                  borderWidth: 1.5,
                  borderColor: sendError ? colors.danger : colors.border,
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
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
