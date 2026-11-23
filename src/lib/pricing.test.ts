import { describe, it, expect } from 'vitest';
import { computePricing } from './pricing';
describe('pricing', () => {
  const s = new Date('2026-11-01T10:00:00Z');
  it('bills started days', () => {
    const r = computePricing({ start: s, end: new Date('2026-11-02T11:00:00Z'), perDay: 2000, deposit: 5000 });
    expect(r.billedDays).toBe(2); expect(r.rental).toBe(4000); expect(r.totalDueNow).toBe(9000);
  });
  it('hourly under 24h, capped at day rate', () => {
    expect(computePricing({ start: s, end: new Date('2026-11-01T14:00:00Z'), perDay: 2000, perHour: 300, deposit: 0 }).rental).toBe(1200);
    expect(computePricing({ start: s, end: new Date('2026-11-01T20:00:00Z'), perDay: 2000, perHour: 300, deposit: 0 }).rental).toBe(2000);
  });
  it('rejects bad range', () => { expect(() => computePricing({ start: s, end: s, perDay: 1, deposit: 0 })).toThrow(); });
});
