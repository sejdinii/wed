import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Booking, BookingStatus } from '@/domain/types';
import { canTransition, kaparPayByISO, lifecycleTransitionFor } from '@/domain/kapar';
import { API_MODE } from '@/data/api';

/**
 * Booking ledger. In API mode it is a render CACHE of server state (the
 * server owns the state machine — screens refresh it via bookingApi); in
 * mock mode it is the source of truth, enforcing the domain state machine
 * locally exactly as before.
 */
interface BookingsState {
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  /** Server-authoritative write: replace by id or prepend (API mode). */
  upsert: (booking: Booking) => void;
  /** Server-authoritative list refresh (API mode). */
  replaceAll: (bookings: Booking[]) => void;
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
      upsert: (booking) =>
        set((state) => ({
          bookings: state.bookings.some((b) => b.id === booking.id)
            ? state.bookings.map((b) => (b.id === booking.id ? booking : b))
            : [booking, ...state.bookings],
        })),
      replaceAll: (bookings) => set({ bookings }),
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
      // Mock mode only: lifecycle sweep on cold start after rehydration.
      // In API mode the server's lifecycle worker owns expiry/completion —
      // sweeping a server-backed cache would fork history.
      onRehydrateStorage: () => () => {
        if (!API_MODE) useBookings.getState().sweep(new Date().toISOString());
      },
    },
  ),
);
