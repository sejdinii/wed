import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Booking, BookingStatus } from '@/domain/types';
import { canTransition, kaparPayByISO, lifecycleTransitionFor } from '@/domain/kapar';

/**
 * Local booking ledger. Until accounts + backend land, bookings live on-device;
 * the store already enforces the domain state machine so the later migration
 * to server-driven state is a transport change, not a logic change.
 */
interface BookingsState {
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  /** `patch` carries transition side-data: payByISO, kaparPaidAtISO, refund. */
  transition: (bookingId: string, to: BookingStatus, atISO: string, patch?: Partial<Booking>) => void;
  /** Applies time-based lifecycle rules (expiry, completion). Run on app start. */
  sweep: (nowISO: string) => void;
}

export const useBookings = create<BookingsState>()(
  persist(
    (set) => ({
      bookings: [],
      addBooking: (booking) => set((state) => ({ bookings: [booking, ...state.bookings] })),
      transition: (bookingId, to, atISO, patch) =>
        set((state) => ({
          bookings: state.bookings.map((b) => {
            if (b.id !== bookingId || !canTransition(b.status, to)) return b;
            return { ...b, ...patch, status: to, timeline: [...b.timeline, { status: to, at: atISO }] };
          }),
        })),
      sweep: (nowISO) =>
        set((state) => {
          let changed = false;
          const bookings = state.bookings.map((b) => {
            const to = lifecycleTransitionFor(b, nowISO);
            if (!to || !canTransition(b.status, to)) return b;
            changed = true;
            return { ...b, status: to, timeline: [...b.timeline, { status: to, at: nowISO }] };
          });
          return changed ? { bookings } : state;
        }),
    }),
    {
      name: 'kapar.bookings.v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Pick<BookingsState, 'bookings'>;
        if (version < 2 && state?.bookings) {
          // v1 bookings came from the online-payment prototype where the kapar
          // was "paid" at checkout. Stamp the fields the pay-at-visit model needs.
          state.bookings = state.bookings.map((b) => ({
            ...b,
            kaparPaidAtISO:
              b.kaparPaidAtISO ?? (b.status === 'confirmed' || b.status === 'completed' ? b.createdAtISO : undefined),
            payByISO: b.payByISO ?? (b.status === 'reserved' ? kaparPayByISO(b.createdAtISO, b.eventDateISO) : undefined),
          }));
        }
        return state;
      },
      // Lifecycle sweep on every cold start, after the ledger has rehydrated:
      // expire unanswered requests / unpaid holds, complete past events.
      // Client-side stand-in for the future server cron.
      onRehydrateStorage: () => () => {
        useBookings.getState().sweep(new Date().toISOString());
      },
    },
  ),
);
