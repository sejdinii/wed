import { create } from 'zustand';

/**
 * In-flight booking draft — deliberately NOT persisted. A half-finished
 * checkout should die with the session, never resurrect days later with a
 * stale date and surprise the user at payment.
 */
interface BookingDraftState {
  venueId: string | null;
  hallId: string | null;
  dateISO: string | null;
  guestCount: number;
  menuTierId: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  specialRequests: string;
  start: (venueId: string, defaults: { guestCount: number; menuTierId: string; hallId?: string; dateISO?: string }) => void;
  setDate: (dateISO: string) => void;
  setGuestCount: (count: number) => void;
  setMenuTier: (tierId: string) => void;
  setContact: (patch: Partial<Pick<BookingDraftState, 'firstName' | 'lastName' | 'phone' | 'specialRequests'>>) => void;
  reset: () => void;
}

const initial = {
  venueId: null,
  hallId: null,
  dateISO: null,
  guestCount: 0,
  menuTierId: null,
  firstName: '',
  lastName: '',
  phone: '',
  specialRequests: '',
};

export const useBookingDraft = create<BookingDraftState>()((set) => ({
  ...initial,
  start: (venueId, defaults) =>
    set({
      ...initial,
      venueId,
      guestCount: defaults.guestCount,
      menuTierId: defaults.menuTierId,
      hallId: defaults.hallId ?? null,
      dateISO: defaults.dateISO ?? null,
    }),
  setDate: (dateISO) => set({ dateISO }),
  setGuestCount: (guestCount) => set({ guestCount }),
  setMenuTier: (menuTierId) => set({ menuTierId }),
  setContact: (patch) => set(patch),
  reset: () => set(initial),
}));
