import type { CityKey, RegionKey } from '@/domain/types';

/** All served cities in display order, with their statistical region. */
export const CITIES: ReadonlyArray<{ key: CityKey; region: RegionKey }> = [
  { key: 'skopje', region: 'skopski' },
  { key: 'ohrid', region: 'jugozapaden' },
  { key: 'bitola', region: 'pelagoniski' },
  { key: 'tetovo', region: 'poloski' },
  { key: 'gostivar', region: 'poloski' },
  { key: 'struga', region: 'jugozapaden' },
  { key: 'kumanovo', region: 'severoistocen' },
  { key: 'prilep', region: 'pelagoniski' },
  { key: 'veles', region: 'vardarski' },
  { key: 'stip', region: 'istocen' },
  { key: 'strumica', region: 'jugoistocen' },
  { key: 'kavadarci', region: 'vardarski' },
  { key: 'gevgelija', region: 'jugoistocen' },
];

/** Cities featured as numbered "trending" cards on Home. */
export const TRENDING_CITIES: CityKey[] = ['skopje', 'ohrid', 'bitola', 'tetovo', 'strumica'];
