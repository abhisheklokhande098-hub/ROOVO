import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { requestCancel, submitReview } from '@/app/actions2';
export default async function MyBookings() {
  const { sb, user } = await requireUser();
  const { data: bookings } = await sb.from('bookings').select('*, vehicles(title), provider_profiles(business_name,contact_phone)').eq('customer_id', user.id).order('created_at', { ascending: false });
  const ids = bookings?.map((b: any) => b.id) ?? [];
  const { data: revs } = ids.length ? await sb.from('reviews').select('booking_id').in('booking_id', ids) : { data: [] as any[] };
  const reviewed = new Set((revs ?? []).map((r: any) => r.booking_id));
  const label: Record<string, string> = { requested: 'Waiting for provider', rejected: 'Rejected', accepted_awaiting_payment: 'Accepted: payment needed', confirmed: 'Confirmed', handed_over: 'In progress', completed: 'Completed', cancelled: 'Cancelled', expired: 'Expired' };
  return (<div className="space-y-6"><h1 className="font-display text-3xl font-extrabold">My bookings</h1>
    {bookings?.length === 0 && <p className="text-subtle">No bookings yet. <Link href="/vehicles" className="text-brand-600 underline">Browse vehicles</Link></p>}
    {bookings?.map((b: any) => (<div key={b.id} className="card space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{b.vehicles?.title}</p><p className="text-xs text-subtle">{new Date(b.start_at).toLocaleString('en-IN')} → {new Date(b.end_at).toLocaleString('en-IN')}</p>
        <p className="text-sm"><span className={`badge ${['confirmed', 'completed'].includes(b.status) ? 'badge-ok' : ['rejected', 'cancelled', 'expired'].includes(b.status) ? 'badge-bad' : 'badge-warn'}`}>{label[b.status]}</span>{b.cancel_requested && ' · cancellation under review'} · Estimated total ₹{(Number(b.rental_amount) + Number(b.deposit_amount)).toLocaleString('en-IN')}</p></div>
        {['confirmed', 'handed_over'].includes(b.status) && <p className="rounded-lg bg-emerald-500/10 p-2 text-sm text-emerald-300">Pay {b.provider_profiles?.business_name} directly.{b.provider_profiles?.contact_phone && <> Call {b.provider_profiles.contact_phone} to arrange pickup.</>}</p>}</div>
      {['requested', 'accepted_awaiting_payment', 'confirmed'].includes(b.status) && !b.cancel_requested && (<details><summary className="btn-ghost cursor-pointer">Cancel booking</summary>
        <form action={requestCancel} className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="id" value={b.id} /><input name="reason" placeholder="Reason (optional)" className="input w-auto flex-1" maxLength={300} /><button className="btn">Confirm cancel</button></form>
        {b.status === 'confirmed' && <p className="mt-1 text-xs text-subtle">Cancelling notifies the provider. Any deposit or advance you already paid them is settled between you and the provider.</p>}</details>)}
      {b.status === 'completed' && !reviewed.has(b.id) && (<form action={submitReview} className="flex flex-wrap gap-2"><input type="hidden" name="bookingId" value={b.id} />
        <select name="rating" className="input w-auto">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}</select><input name="comment" placeholder="Your review" maxLength={1000} className="input w-auto flex-1" /><button className="btn">Submit review</button></form>)}
    </div>))}</div>);
}
