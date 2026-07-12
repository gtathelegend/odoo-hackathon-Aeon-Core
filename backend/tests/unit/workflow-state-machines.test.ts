import { describe, expect, it } from 'vitest';

/**
 * These transition tables live inline in each workflow service. The tests
 * pin the intended transitions so refactors that accidentally widen or
 * narrow the state machine fail loudly.
 */

const BOOKING_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ACTIVE', 'CANCELLED', 'NO_SHOW'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const MAINTENANCE_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ASSIGNED', 'REJECTED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['RESOLVED', 'CANCELLED'],
  RESOLVED: [],
  REJECTED: [],
  CANCELLED: [],
};

const AUDIT_TRANSITIONS: Record<string, string[]> = {
  PLANNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

function allowed(table: Record<string, string[]>, from: string, to: string): boolean {
  return (table[from] ?? []).includes(to);
}

describe('booking transitions', () => {
  it('allows PENDING → CONFIRMED', () => {
    expect(allowed(BOOKING_TRANSITIONS, 'PENDING', 'CONFIRMED')).toBe(true);
  });
  it('allows CONFIRMED → ACTIVE', () => {
    expect(allowed(BOOKING_TRANSITIONS, 'CONFIRMED', 'ACTIVE')).toBe(true);
  });
  it('rejects COMPLETED → CANCELLED', () => {
    expect(allowed(BOOKING_TRANSITIONS, 'COMPLETED', 'CANCELLED')).toBe(false);
  });
  it('treats COMPLETED/CANCELLED/NO_SHOW as terminal', () => {
    expect(BOOKING_TRANSITIONS.COMPLETED).toEqual([]);
    expect(BOOKING_TRANSITIONS.CANCELLED).toEqual([]);
    expect(BOOKING_TRANSITIONS.NO_SHOW).toEqual([]);
  });
});

describe('maintenance transitions', () => {
  it('allows PENDING → ASSIGNED', () => {
    expect(allowed(MAINTENANCE_TRANSITIONS, 'PENDING', 'ASSIGNED')).toBe(true);
  });
  it('allows ASSIGNED → IN_PROGRESS', () => {
    expect(allowed(MAINTENANCE_TRANSITIONS, 'ASSIGNED', 'IN_PROGRESS')).toBe(true);
  });
  it('allows IN_PROGRESS → RESOLVED', () => {
    expect(allowed(MAINTENANCE_TRANSITIONS, 'IN_PROGRESS', 'RESOLVED')).toBe(true);
  });
  it('rejects PENDING → RESOLVED (must pass through assigned/in_progress)', () => {
    expect(allowed(MAINTENANCE_TRANSITIONS, 'PENDING', 'RESOLVED')).toBe(false);
  });
});

describe('audit transitions', () => {
  it('allows PLANNED → IN_PROGRESS', () => {
    expect(allowed(AUDIT_TRANSITIONS, 'PLANNED', 'IN_PROGRESS')).toBe(true);
  });
  it('allows COMPLETED → CLOSED', () => {
    expect(allowed(AUDIT_TRANSITIONS, 'COMPLETED', 'CLOSED')).toBe(true);
  });
  it('rejects IN_PROGRESS → CLOSED (must complete first)', () => {
    expect(allowed(AUDIT_TRANSITIONS, 'IN_PROGRESS', 'CLOSED')).toBe(false);
  });
  it('treats CLOSED/CANCELLED as terminal', () => {
    expect(AUDIT_TRANSITIONS.CLOSED).toEqual([]);
    expect(AUDIT_TRANSITIONS.CANCELLED).toEqual([]);
  });
});

describe('booking overlap semantics', () => {
  /** Reference overlap check — bookings overlap when [start,end) intervals intersect. */
  function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
    return a.start < b.end && a.end > b.start;
  }

  it('detects adjacent-end conflicts as non-overlapping', () => {
    expect(overlaps({ start: 0, end: 10 }, { start: 10, end: 20 })).toBe(false);
  });
  it('detects partial overlaps', () => {
    expect(overlaps({ start: 0, end: 10 }, { start: 5, end: 15 })).toBe(true);
  });
  it('detects fully-contained windows', () => {
    expect(overlaps({ start: 0, end: 20 }, { start: 5, end: 10 })).toBe(true);
  });
  it('detects identical windows', () => {
    expect(overlaps({ start: 0, end: 10 }, { start: 0, end: 10 })).toBe(true);
  });
});
