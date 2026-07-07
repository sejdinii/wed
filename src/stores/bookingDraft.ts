import { create } from 'zustand';

/**
 * In-flight booking draft — deliberately NOT persisted. A half-finished
 * checkout should die with the session, never resurrect days later with a
 * stale date and surprise the user at payment.
 */
interface BookingDraftState {
  venueId: string | null;
  dateISO: string | null;
  guestCount: number;
  menuTierId: string | null;
  termsAccepted: boolean;
  start: (venueId: string, defaults: { guestCount: number; menuTierId: string; dateISO?: string }) => void;
  setDate: (dateISO: string) => void;
  setGuestCount: (count: number) => void;
  setMenuTier: (tierId: string) => void;
  setTermsAccepted: (accepted: boolean) => void;
  reset: () => void;
}

const initial = {
  venueId: null,
  dateISO: null,
  guestCount: 0,
  menuTierId: null,
  termsAccepted: false,
};

export const useBookingDraft = create<BookingDraftState>()((set) => ({
  ...initial,
  start: (venueId, defaults) =>
    set({
      ...initial,
      venueId,
      guestCount: defaults.guestCount,
      menuTierId: defaults.menuTierId,
      dateISO: defaults.dateISO ?? null,
    }),
  setDate: (dateISO) => set({ dateISO }),
  setGuestCount: (guestCount) => set({ guestCount }),
  setMenuTier: (menuTierId) => set({ menuTierId }),
  setTermsAccepted: (termsAccepted) => set({ termsAccepted }),
  reset: () => set(initial),
}));
