import { describe, expect, it } from 'vitest';

import {
  BOOKING_TRANSITIONS,
  canTransition,
  kaparAmountMkd,
  kaparPayByISO,
  lifecycleTransitionFor,
  PLATFORM_REFUND_TIERS,
  refundAmountFor,
  refundPercentFor,
  sortedRefundTiers,
} from '../src/kapar';
import type { KaparPolicy } from '../src/types';

const PLATFORM: KaparPolicy = {
  kind: 'fixed',
  fixedAmountMkd: 30_000,
  minAmountMkd: 30_000,
  refundTiers: [...PLATFORM_REFUND_TIERS],
};

describe('refundPercentFor — the platform ladder (100/50/0 at 90/30 days)', () => {
  const event = '2026-12-01';
  it('100% at exactly 90 days before', () => {
    expect(refundPercentFor(PLATFORM, event, '2026-09-02')).toBe(100);
  });
  it('50% at 89 days before (boundary falls to the middle tier)', () => {
    expect(refundPercentFor(PLATFORM, event, '2026-09-03')).toBe(50);
  });
  it('50% at exactly 30 days before', () => {
    expect(refundPercentFor(PLATFORM, event, '2026-11-01')).toBe(50);
  });
  it('0% at 29 days before', () => {
    expect(refundPercentFor(PLATFORM, event, '2026-11-02')).toBe(0);
  });
  it('0% on the event day', () => {
    expect(refundPercentFor(PLATFORM, event, event)).toBe(0);
  });
  it('tiers are unordered-input safe (sortedRefundTiers)', () => {
    const shuffled: KaparPolicy = { ...PLATFORM, refundTiers: [...PLATFORM.refundTiers].reverse() };
    expect(refundPercentFor(shuffled, event, '2026-09-02')).toBe(100);
    expect(sortedRefundTiers(shuffled)[0]?.minDaysBeforeEvent).toBe(90);
  });
});

describe('refundPercentFor — the 7-day grace window', () => {
  const event = '2026-12-01';
  it('grace lifts a 50% tier to 100% when kapar was paid 3 days ago and event is 30+ days away', () => {
    // cancel 40 days before the event → ladder alone says 50
    expect(refundPercentFor(PLATFORM, event, '2026-10-22', null)).toBe(50);
    expect(refundPercentFor(PLATFORM, event, '2026-10-22', '2026-10-19')).toBe(100);
  });
  it('grace expires on day 8 after payment', () => {
    expect(refundPercentFor(PLATFORM, event, '2026-10-22', '2026-10-14')).toBe(50);
  });
  it('grace at exactly 7 days after payment still applies', () => {
    expect(refundPercentFor(PLATFORM, event, '2026-10-22', '2026-10-15')).toBe(100);
  });
  it('grace does NOT apply when the event is under 30 days away', () => {
    // paid yesterday, event in 20 days → ladder says 0, grace refused
    expect(refundPercentFor(PLATFORM, '2026-11-21', '2026-11-01', '2026-10-31')).toBe(0);
  });
  it('accepts full ISO datetimes (timestamps are normalized to dates)', () => {
    expect(refundPercentFor(PLATFORM, event, '2026-10-22T14:30:00.000Z', '2026-10-19T09:00:00.000Z')).toBe(100);
  });
});

describe('refundAmountFor', () => {
  it('rounds to whole MKD from the percent', () => {
    const booking = { kaparMkd: 30_000, eventDateISO: '2026-12-01', kaparPaidAtISO: undefined };
    expect(refundAmountFor(booking, PLATFORM, '2026-09-02')).toBe(30_000);
    expect(refundAmountFor(booking, PLATFORM, '2026-10-22')).toBe(15_000);
    expect(refundAmountFor(booking, PLATFORM, '2026-11-25')).toBe(0);
  });
});

describe('kaparAmountMkd', () => {
  it('fixed policies return the fixed amount', () => {
    expect(kaparAmountMkd(PLATFORM, 1_000_000)).toBe(30_000);
  });
  it('percent policies round to the nearest 500 MKD with a floor', () => {
    const percent: KaparPolicy = { kind: 'percent', percentOfEstimate: 10, minAmountMkd: 20_000, refundTiers: [] };
    expect(kaparAmountMkd(percent, 234_170)).toBe(23_500); // 23417 → 23500
    expect(kaparAmountMkd(percent, 100_000)).toBe(20_000); // floor wins over 10000
  });
});

describe('kaparPayByISO — visit deadline', () => {
  it('is 7 days after the hold confirmation', () => {
    expect(kaparPayByISO('2026-07-10T18:00:00.000Z', '2026-12-01')).toBe('2026-07-17');
  });
  it('never lands past the event itself', () => {
    expect(kaparPayByISO('2026-11-28', '2026-12-01')).toBe('2026-12-01');
  });
});

describe('lifecycleTransitionFor — the sweep rules', () => {
  it('expires a request unanswered for 24h', () => {
    const booking = { status: 'pending_kapar' as const, createdAtISO: '2026-07-10T00:00:00.000Z', payByISO: undefined, eventDateISO: '2026-12-01' };
    expect(lifecycleTransitionFor(booking, '2026-07-11T00:00:00.000Z')).toBe('expired');
    expect(lifecycleTransitionFor(booking, '2026-07-10T23:00:00.000Z')).toBeNull();
  });
  it('expires a hold past its payBy date', () => {
    const booking = { status: 'reserved' as const, createdAtISO: '2026-07-01T00:00:00.000Z', payByISO: '2026-07-08', eventDateISO: '2026-12-01' };
    expect(lifecycleTransitionFor(booking, '2026-07-09T08:00:00.000Z')).toBe('expired');
    expect(lifecycleTransitionFor(booking, '2026-07-08T20:00:00.000Z')).toBeNull(); // payBy day itself still valid
  });
  it('completes a confirmed booking after the event', () => {
    const booking = { status: 'confirmed' as const, createdAtISO: '2026-01-01T00:00:00.000Z', payByISO: undefined, eventDateISO: '2026-07-11' };
    expect(lifecycleTransitionFor(booking, '2026-07-12T09:00:00.000Z')).toBe('completed');
    expect(lifecycleTransitionFor(booking, '2026-07-11T09:00:00.000Z')).toBeNull();
  });
});

describe('BOOKING_TRANSITIONS — the legal state machine', () => {
  it('free-cancellation states can cancel and expire', () => {
    expect(canTransition('pending_kapar', 'cancelled_by_couple')).toBe(true);
    expect(canTransition('reserved', 'expired')).toBe(true);
  });
  it('paid state can complete or cancel, never expire', () => {
    expect(canTransition('confirmed', 'completed')).toBe(true);
    expect(canTransition('confirmed', 'expired')).toBe(false);
  });
  it('terminal states are terminal', () => {
    for (const terminal of ['completed', 'cancelled_by_couple', 'cancelled_by_venue', 'expired'] as const) {
      expect(BOOKING_TRANSITIONS[terminal]).toHaveLength(0);
    }
  });
  it('no state can skip straight from request to confirmed', () => {
    expect(canTransition('pending_kapar', 'confirmed')).toBe(false);
  });
});
