export type Breakdown = { hours: number; billedDays: number; rental: number; deposit: number; totalDueNow: number; refundableDeposit: number };
/** Billed per started 24h block; hourly rate used only for rentals under 24h (capped at the day rate). */
export function computePricing(o: { start: Date; end: Date; perDay: number; perHour?: number | null; deposit: number }): Breakdown {
  const ms = o.end.getTime() - o.start.getTime();
  if (!(ms > 0)) throw new Error('End must be after start');
  const hours = Math.ceil(ms / 36e5);
  const billedDays = Math.ceil(hours / 24);
  const rental = o.perHour && hours < 24 ? Math.min(hours * o.perHour, o.perDay) : billedDays * o.perDay;
  return { hours, billedDays, rental, deposit: o.deposit, totalDueNow: rental + o.deposit, refundableDeposit: o.deposit };
}
