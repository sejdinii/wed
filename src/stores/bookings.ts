import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Booking, BookingStatus } from '@/domain/types';
import { canTransition } from '@/domain/kapar';

/**
 * Local booking ledger. Until accounts + backend land, bookings live on-device;
 * the store already enforces the domain state machine so the later migration
 * to server-driven state is a transport change, not a logic change.
 */
interface BookingsState {
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  transition: (bookingId: string, to: BookingStatus, atISO: string) => void;
}

export const useBookings = create<BookingsState>()(
  persist(
    (set) => ({
      bookings: [],
      addBooking: (booking) => set((state) => ({ bookings: [booking, ...state.bookings] })),
      transition: (bookingId, to, atISO) =>
        set((state) => ({
          bookings: state.bookings.map((b) => {
            if (b.id !== bookingId || !canTransition(b.status, to)) return b;
            return { ...b, status: to, timeline: [...b.timeline, { status: to, at: atISO }] };
          }),
        })),
    }),
    {
      name: 'kapar.bookings.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
