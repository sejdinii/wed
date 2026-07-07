import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface FavoritesState {
  venueIds: string[];
  toggle: (venueId: string) => void;
  isFavorite: (venueId: string) => boolean;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      venueIds: [],
      toggle: (venueId) =>
        set((state) => ({
          venueIds: state.venueIds.includes(venueId)
            ? state.venueIds.filter((id) => id !== venueId)
            : [...state.venueIds, venueId],
        })),
      isFavorite: (venueId) => get().venueIds.includes(venueId),
    }),
    {
      name: 'kapar.favorites.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
