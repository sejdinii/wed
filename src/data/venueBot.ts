import { useBookings } from '@/stores/bookings';
import { useMessages } from '@/stores/messages';

/**
 * MOCK — simulates the venue side until the backend exists:
 * a welcome message shortly after the kapar is paid, then the venue
 * confirming the reservation (reserved → confirmed) with a chat message.
 * Timers do not survive an app restart; acceptable for the demo, replaced
 * by real venue actions + push notifications in v0.2.
 */
export function simulateVenueSide(bookingId: string, venueName: string): void {
  setTimeout(() => {
    useMessages.getState().send({
      id: `m_${Date.now().toString(36)}`,
      bookingId,
      from: 'venue',
      text: 'Ви благодариме за барањето! Го проверуваме календарот и потврдуваме наскоро. 🌿',
      atISO: new Date().toISOString(),
    });
  }, 6_000);

  setTimeout(() => {
    useBookings.getState().transition(bookingId, 'confirmed', new Date().toISOString());
    useMessages.getState().send({
      id: `m_${Date.now().toString(36)}c`,
      bookingId,
      from: 'venue',
      text: `Честитки! 🎉 Датумот е потврден. Кога сакате да дојдете на посета и проба на менито? — ${venueName}`,
      atISO: new Date().toISOString(),
    });
  }, 22_000);
}
