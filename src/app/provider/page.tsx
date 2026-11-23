import Link from 'next/link';
import { requireProvider } from '@/lib/auth';
import { getPlan } from '@/lib/plan';
import { registerProvider, uploadProviderDoc, respondBooking, setBookingProgress } from '@/app/actions';
import SubmitButton from '@/components/SubmitButton';
import FileDrop from '@/components/FileDrop';
import { paidPlansOpen } from '@/lib/flags';

const EMOJI = '🚗';
const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');
const tone = (s: string) => (['verified', 'confirmed', 'completed'].includes(s) ? 'badge-ok' : ['rejected', 'suspended', 'cancelled'].includes(s) ? 'badge-bad' : ['draft', 'expired'].includes(s) ? 'badge-muted' : 'badge-warn');
const Stat = ({ k, v, hot }: { k: string; v: string | number; hot?: boolean }) => (<div className={`rounded-2xl border bg-surface p-4 ${hot ? 'border-2 border-brand-600 bg-amber-500/10' : 'border-line'}`}><b className="font-display text-3xl font-extrabold leading-none">{v}</b><p className="mt-1 text-xs font-semibold text-subtle">{k}</p></div>);

export default async function Provider() {
  const { sb, provider } = await requireProvider();
  if (!provider) { const { data: plans } = await sb.from('membership_plans').select('id,name,price_inr_monthly,max_vehicles').eq('is_active', true).order('price_inr_monthly'); return (<form action={registerProvider} className="card mx-auto max-w-lg space-y-3"><h1 className="font-display text-2xl font-extrabold">Register your rental business</h1>
    <p className="text-sm text-muted">Tell us about your business. Our team reviews your documents before you can list vehicles.</p>
    <label><span className="label">Business name</span><input name="business_name" required className="input" /></label>
    <label><span className="label">Business address in Pune</span><input name="address" required className="input" /></label>
    <label><span className="label">Contact phone</span><input name="contact_phone" type="tel" required className="input" /></label>
    <label><span className="label">GSTIN (optional)</span><input name="gstin" className="input" /></label>
    <fieldset className="space-y-2"><legend className="label">Choose your plan</legend>{plans?.map((p: any, i: number) => (<label key={p.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 border-line p-3 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"><span><input type="radio" name="plan_id" value={p.id} defaultChecked={i === 0} disabled={Number(p.price_inr_monthly) > 0 && !paidPlansOpen()} className="mr-2 accent-brand-600" /><b>{p.name}</b>, up to {p.max_vehicles} vehicles</span><b>{Number(p.price_inr_monthly) === 0 ? 'Free' : `₹${Number(p.price_inr_monthly).toLocaleString('en-IN')} / 30 days`}</b></label>))}
      <p className="text-xs text-subtle">{paidPlansOpen() ? 'For a paid plan, WhatsApp opens after you submit so you can request your payment QR. You can change plan later.' : 'Paid plans open soon. New verified providers get the Professional features free for a trial period.'}</p></fieldset>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="provider_terms" required className="mt-1 h-4 w-4 accent-brand-600" /><span>I confirm that I hold every licence, permit, registration and insurance needed to rent out my vehicles, that the information I give is accurate, and I accept the <a href="/terms#providers" target="_blank" className="font-bold text-brand-700 underline">Provider terms</a> and <a href="/terms#memberships" target="_blank" className="font-bold text-brand-700 underline">membership terms</a>.</span></label>
    <SubmitButton pendingText="Submitting…" className="btn w-full">Submit for verification</SubmitButton></form>); }

  const plan = await getPlan(provider.id);
  const features = plan?.membership_plans?.features ?? {};
  const maxVehicles = plan?.membership_plans?.max_vehicles ?? 3;
  const [{ data: vehicles }, { data: docs }, { data: bookings }] = await Promise.all([
    sb.from('vehicles').select('id,title,status,price_per_day, vehicle_images(storage_path,sort_order)').eq('provider_id', provider.id).order('created_at', { ascending: false }),
    sb.from('provider_documents').select('*').eq('provider_id', provider.id),
    sb.from('bookings').select('*, vehicles(title)').eq('provider_id', provider.id).order('created_at', { ascending: false })]);
  const verified = provider.status === 'verified';
  const all = (bookings ?? []) as any[];
  const booked = all.filter((b) => ['confirmed', 'handed_over', 'completed'].includes(b.status));
  const needsReply = all.filter((b) => b.status === 'requested').length;
  const month = new Date().toISOString().slice(0, 7);
  const monthValue = booked.filter((b) => String(b.start_at).slice(0, 7) === month).reduce((a, b) => a + Number(b.rental_amount), 0);
  const totalValue = booked.reduce((a, b) => a + Number(b.rental_amount), 0);
  const cover = (v: any) => { const p = [...(v.vehicle_images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.storage_path; return p ? sb.storage.from('vehicle-images').getPublicUrl(p).data.publicUrl : null; };
  const canAdd = verified && (vehicles?.length ?? 0) < maxVehicles;

  const docsSection = (
    <section className="card space-y-3"><h2 className="font-display text-lg font-bold">Business documents</h2>
      {docs?.length ? <div className="flex flex-wrap gap-2">{docs.map((d: any) => <span key={d.id} className={`badge ${tone(d.status)}`}>{d.doc_type.replaceAll('_', ' ')}: {d.status.replace('_', ' ')}</span>)}</div> : <p className="text-sm text-subtle">No documents yet. Upload your business registration, PAN, GST and rental licence.</p>}
      <form action={uploadProviderDoc} className="space-y-3"><label><span className="label">Document type</span><select name="doc_type" className="input"><option value="business_registration">Business registration</option><option value="pan">PAN</option><option value="gst">GST certificate</option><option value="rto_permit">Rental licence / permit</option><option value="insurance">Insurance</option></select></label>
        <FileDrop name="file" accept=".pdf,.jpg,.jpeg,.png" required hint="PDF, JPG or PNG · up to 4 MB" />
        <SubmitButton pendingText="Uploading…" className="btn w-full sm:w-auto">Upload document</SubmitButton></form>
      <p className="text-xs text-subtle">Uploading documents does not make you verified. Our team reviews them first.</p></section>);

  return (<div className="space-y-7">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h1 className="font-display text-3xl font-extrabold">{provider.business_name}</h1>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm"><span className={`badge ${tone(provider.status)}`}>{provider.status.replace('_', ' ')}</span>
        <Link href="/provider/membership" className="font-bold text-brand-700 underline">{plan?.membership_plans?.name ?? 'Basic'}{plan?.is_trial ? ' trial' : ''} plan{plan ? `, valid until ${new Date(plan.current_period_end).toLocaleDateString('en-IN')}` : ''}</Link></p></div></div>
    {!verified && <div className="rounded-2xl border-2 border-brand-600 bg-amber-500/10 p-4 text-sm text-amber-200">Your business is <b>{provider.status.replace('_', ' ')}</b>. Upload your documents below. Once our team verifies them, you can list vehicles.</div>}
    {!verified && docsSection}

    <section className="space-y-3"><div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat k="Requests waiting for your reply" v={needsReply} hot={needsReply > 0} />
      {features.analytics ? (<><Stat k="Confirmed bookings" v={booked.length} /><Stat k="Booked this month" v={inr(monthValue)} /><Stat k="Total booked value" v={inr(totalValue)} /></>)
        : <div className="col-span-1 rounded-2xl border border-line bg-surface p-4 text-sm md:col-span-3">Unlock earnings analytics with the Professional plan. <Link href="/provider/membership" className="font-bold text-brand-700 underline">View plans</Link></div>}</div>
      {features.analytics && <Link href="/provider/analytics" className="inline-block text-sm font-bold text-brand-700 underline">See full analytics</Link>}</section>

    <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-2xl font-extrabold">My vehicles <span className="text-base font-semibold text-subtle">{vehicles?.length ?? 0} of {maxVehicles}</span></h2>
      {canAdd ? <Link href="/provider/vehicles/new" className="btn">Add a vehicle</Link> : verified ? <Link href="/provider/membership" className="text-sm font-bold text-brand-700 underline">Listing limit reached. Upgrade your plan</Link> : null}</div>
      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{vehicles?.map((v: any) => (<div key={v.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="relative aspect-[4/3] bg-brand-50">{cover(v) ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={cover(v)!} alt={v.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-6xl" aria-hidden="true">{EMOJI}</div>}
          <span className="plate absolute bottom-3 left-3">{inr(v.price_per_day)}<small>/day</small></span></div>
        <div className="space-y-2 p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-display text-lg font-bold leading-tight">{v.title}</h3><span className={`badge shrink-0 ${tone(v.status)}`}>{v.status.replace('_', ' ')}</span></div>
          <div className="flex gap-2"><Link href={`/provider/vehicles/${v.id}`} className="btn-ghost btn-sm">Manage</Link>{v.status === 'verified' && <Link href={`/vehicles/${v.id}`} className="btn-ghost btn-sm">View listing</Link>}</div></div></div>))}</div>
      {!vehicles?.length && <div className="card py-10 text-center"><p className="text-4xl" aria-hidden="true">🚗</p><p className="mt-2 font-display text-lg font-bold">{verified ? 'Add your first vehicle' : 'Vehicles come next'}</p><p className="text-sm text-muted">{verified ? 'Photos and clear prices help you get more requests.' : 'You can add vehicles once your business is verified.'}</p></div>}</section>

    <section className="space-y-3"><h2 className="font-display text-2xl font-extrabold">Booking requests</h2>
      {bookings?.map((b: any) => (<div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 text-sm">
        <div className="space-y-1"><p className="flex flex-wrap items-center gap-2"><b className="font-display text-base">{b.vehicles?.title}</b><span className={`badge ${tone(b.status)}`}>{b.status.replaceAll('_', ' ')}</span></p>
          <p className="text-muted">{new Date(b.start_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} to {new Date(b.end_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          <p className="font-bold">{inr(Number(b.rental_amount))}</p>
          {b.customer_notes && <p className="text-muted">“{b.customer_notes}”</p>}
          {['confirmed', 'handed_over', 'completed'].includes(b.status) && b.customer_phone && <p className="font-semibold text-brand-700">Customer phone: {b.customer_phone}</p>}</div>
        <div className="flex gap-2">
          {b.status === 'requested' && (<><form action={respondBooking}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="decision" value="accept" /><SubmitButton pendingText="Accepting…" className="btn btn-sm">Accept</SubmitButton></form>
            <form action={respondBooking}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="decision" value="reject" /><SubmitButton pendingText="Rejecting…" className="btn-ghost btn-sm">Reject</SubmitButton></form></>)}
          {b.status === 'confirmed' && <form action={setBookingProgress}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="to" value="handed_over" /><SubmitButton className="btn-ghost btn-sm">Mark handed over</SubmitButton></form>}
          {b.status === 'handed_over' && <form action={setBookingProgress}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="to" value="completed" /><SubmitButton className="btn-ghost btn-sm">Mark returned</SubmitButton></form>}
        </div></div>))}
      {!bookings?.length && <div className="card py-8 text-center text-sm text-muted">No booking requests yet. They will appear here the moment a customer asks for one of your vehicles.</div>}</section>

    {verified && docsSection}
  </div>);
}
