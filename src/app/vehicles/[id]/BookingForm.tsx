'use client';
import { useActionState, useState } from 'react';
import { requestBooking } from '@/app/actions';
import { computePricing } from '@/lib/pricing';
export default function BookingForm(p: { vehicleId: string; start?: string; end?: string; perDay: number; perHour: number | null; deposit: number }) {
  const [state, action, pending] = useActionState(requestBooking, null as any);
  const [s, setS] = useState(p.start ?? ''); const [e, setE] = useState(p.end ?? '');
  let b: ReturnType<typeof computePricing> | null = null;
  try { if (s && e) b = computePricing({ start: new Date(s), end: new Date(e), perDay: p.perDay, perHour: p.perHour, deposit: p.deposit }); } catch {}
  const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
  return (<form action={action} className="space-y-3">
    <input type="hidden" name="vehicleId" value={p.vehicleId} />
    <div className="grid grid-cols-2 gap-2"><label><span className="label">Pickup</span><input type="datetime-local" name="start" value={s} onChange={(x: { target: { value: string } }) => setS(x.target.value)} required className="input" /></label>
      <label><span className="label">Return</span><input type="datetime-local" name="end" value={e} onChange={(x: { target: { value: string } }) => setE(x.target.value)} required className="input" /></label></div>
    <label><span className="label">Your mobile number</span><input name="phone" type="tel" required pattern="[0-9+() -]{8,18}" placeholder="Shared with the owner after they accept" className="input" /></label>
    <label><span className="label">Message to the owner (optional)</span><textarea name="notes" placeholder="Pickup area, licence type, anything useful" className="input min-h-20" maxLength={500} /></label>
    {b ? (<div className="space-y-1 rounded-2xl bg-brand-50 p-3 text-sm"><div className="flex justify-between"><span>Rental, {b.billedDays} day{b.billedDays > 1 ? 's' : ''}</span><b>{inr(b.rental)}</b></div>
      {b.deposit > 0 && <div className="flex justify-between"><span>Security deposit</span><b>{inr(b.deposit)}</b></div>}
      <div className="flex justify-between border-t border-brand-100 pt-1 font-display text-base font-extrabold"><span>Estimated total</span><span>{inr(b.totalDueNow)}</span></div>
      <p className="text-xs text-muted">You pay the owner directly. Nothing is charged now.</p></div>) : <p className="rounded-2xl bg-brand-50 p-3 text-sm text-muted">Pick your dates to see the price.</p>}
    {state?.error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-300">{state.error}</p>}
    <button className="btn w-full" disabled={pending}>{pending ? (<><span className="spinner" aria-hidden="true" />Sending…</>) : 'Send booking request'}</button>
    <p className="text-xs text-subtle">The owner reviews your request and replies. Final taxes, if any, are set by the owner.</p>
  </form>);
}
