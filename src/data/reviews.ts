import type { Review } from '@/domain/types';
import { VENUES } from './venues';

/**
 * Seeded guest reviews (display-only in MVP, per spec). Reviews stay in the
 * language they were written in — real review systems don't translate user
 * content. Generated deterministically per venue so every venue has a
 * believable, stable set until real post-event reviews arrive in v0.5.
 */

const AUTHORS = ['Марија и Дарко', 'Елена С.', 'Arben & Vlera', 'Стефан П.', 'Ана и Горан', 'Fjolla K.', 'Билјана М.', 'Дени и Симона'];

const POSITIVES = [
  'Персоналот беше неверојатен — сè беше готово пред да побараме. Гостите уште зборуваат за храната.',
  'Организацијата беше беспрекорна, ниту еден детаљ не фалеше. Менаџерот беше со нас цела вечер.',
  'Ushqimi ishte fantastik dhe salla dukej mrekullisht. Të gjithë mysafirët ishin të kënaqur.',
  'Прекрасен простор за фотографии, а вечерта помина без ниту еден проблем. Препорачуваме од срце!',
  'The venue was stunning and the team handled our 300 guests effortlessly. Worth every denar.',
  'Салата е уште поубава во живо. Капарот преку апликацијата ни даде сигурност дека датумот е наш.',
];

const NEGATIVES = [
  'Паркингот се наполни доцна навечер.',
  'Музиката мораше да заврши во еден.',
  undefined,
  'Kishte pak vonesë me ëmbëlsirën.',
  undefined,
  undefined,
];

function buildReviews(): Review[] {
  const result: Review[] = [];
  VENUES.forEach((venue, vi) => {
    const count = 3 + (vi % 2);
    for (let i = 0; i < count; i++) {
      const salt = vi * 7 + i * 3;
      const score = Math.max(6, Math.min(10, Math.round((venue.rating * 2 + ((salt % 5) - 2) * 0.2) * 10) / 10));
      const month = ((salt % 5) + 5).toString().padStart(2, '0');
      result.push({
        id: `rv_${venue.id}_${i}`,
        venueId: venue.id,
        author: AUTHORS[salt % AUTHORS.length] ?? 'Гостин',
        score,
        eventDateISO: `2025-${month}-${((salt % 3) * 7 + 6).toString().padStart(2, '0')}`,
        guestCount: venue.capacityMin + (salt % 4) * 30,
        positive: POSITIVES[salt % POSITIVES.length] ?? '',
        negative: NEGATIVES[salt % NEGATIVES.length],
      });
    }
  });
  return result;
}

export const REVIEWS: Review[] = buildReviews();
