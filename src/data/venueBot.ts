import { kaparPayByISO } from '@/domain/kapar';
import { API_MODE } from '@/data/api';
import { formatMediumDate } from '@/lib/dates';
import { useBookings } from '@/stores/bookings';
import { useMessages } from '@/stores/messages';

/**
 * MOCK — simulates the venue side until the backend exists, on a compressed
 * demo timescale (in reality days pass between these steps):
 *   6s  welcome message ("checking the calendar")
 *  22s  pending_kapar → reserved: the venue confirms the hold and names the
 *       kapar deadline (payByISO)
 *  75s  reserved → confirmed: the venue marks the kapar as received in person
 *       (kaparPaidAtISO) — stands in for the real venue visit
 * Timers do not survive an app restart; the lifecycle sweep in the bookings
 * store catches stuck requests. Replaced by real venue actions + push in v0.2.
 * Messages are hardcoded Macedonian regardless of locale (known gap).
 */
export function simulateVenueSide(bookingId: string, venueName: string, eventDateISO: string): void {
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
    const now = new Date().toISOString();
    const payBy = kaparPayByISO(now, eventDateISO);
    // API mode: the SERVER's demo bot owns the transition (restart-safe);
    // this bot only narrates it in chat. Mock mode: transition locally.
    if (!API_MODE) useBookings.getState().transition(bookingId, 'reserved', now, { payByISO: payBy });
    useMessages.getState().send({
      id: `m_${Date.now().toString(36)}r`,
      bookingId,
      from: 'venue',
      text: `Датумот е слободен и го задржавме за вас! 📅 Дојдете на посета и оставете го капарот до ${formatMediumDate(payBy, 'mk')} за да го потврдиме дефинитивно. Кога ви одговара?`,
      atISO: now,
    });
  }, 22_000);

  setTimeout(() => {
    const now = new Date().toISOString();
    if (!API_MODE) useBookings.getState().transition(bookingId, 'confirmed', now, { kaparPaidAtISO: now });
    useMessages.getState().send({
      id: `m_${Date.now().toString(36)}c`,
      bookingId,
      from: 'venue',
      text: `Капарот е примен — датумот е официјално ваш! 🎉 Честитки! Се гледаме на пробата на менито. — ${venueName}`,
      atISO: now,
    });
  }, 75_000);
}
