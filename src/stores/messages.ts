import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ChatMessage } from '@/domain/types';

/**
 * Couple ↔ venue messaging, threaded per booking. Chat opens only after the
 * kapar is paid (a booking exists) — keeping negotiation on-platform and
 * documented. Backend later replaces this with a real-time channel; the
 * shape (bookingId-keyed threads) stays.
 */
interface MessagesState {
  messages: ChatMessage[];
  send: (message: ChatMessage) => void;
  threadFor: (bookingId: string) => ChatMessage[];
}

export const useMessages = create<MessagesState>()(
  persist(
    (set, get) => ({
      messages: [],
      send: (message) => set((state) => ({ messages: [...state.messages, message] })),
      threadFor: (bookingId) => get().messages.filter((m) => m.bookingId === bookingId),
    }),
    {
      name: 'kapar.messages.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
