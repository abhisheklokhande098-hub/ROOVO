import { requireProvider } from '@/lib/auth';
import { getPlan } from '@/lib/plan';
import { requestPlan, cancelPlanRequest } from '@/app/actions2';
import SubmitButton from '@/components/SubmitButton';
import { getOpenRequest } from '@/lib/manualPayments';
import { paidPlansOpen } from '@/lib/flags';

const perks = (f: any = {}) => [
  f.dashboard ? 'Booking management dashboard + availability calendar' : 'Business profile + basic booking inquiries',
  f.analytics ? (f.analytics === 'advanced' ? 'Advanced analytics' : 'Business analytics') : null,
  f.visibility === 'priority' ? 'Priority visibility in search' : f.visibility === 'improved' ? 'Improved listing visibility' : null,
  f.featured ? 'Featured listing badge + promotional opportunities' : null,
].filter(Boolean) as string[];
const inr = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

export default async function Membership() {
  const { sb, provider, user } = await requireProvider();
  if (!provider) return <p>Register your business first.</p>;
  const sub = await getPlan(provider.id);
  const open = await getOpenRequest(provider.id, provider.business_name, user.email ?? '');
  const { data: plans } = await sb.from('membership_plans').select('*').eq('is_active', true).order('price_inr_monthly');
  const { data: txs } = await sb.from('subscription_transactions').select('*').in('status', ['succeeded', 'pending']).order('created_at', { ascending: false }).limit(10);

  return (<div className="space-y-6"><h1 className="font-display text-3xl font-extrabold">Membership</h1>
    <div className="card text-sm">Current plan: <b>{sub?.membership_plans?.name ?? 'Basic'}</b>{sub?.is_trial && ' (free trial)'}{sub && <> · valid until {new Date(sub.current_period_end).toLocaleDateString('en-IN')}</>}
      <p className="mt-1 text-xs text-subtle">Plans last 30 days and never renew automatically. We remind you before the end; if you don't renew you move to Basic.</p></div>

    {open && (<div className="card space-y-3 border-2 border-brand-600 bg-amber-500/10">
      <p className="font-display text-lg font-bold">Waiting for your payment: {open.planName} ({inr(open.amount)})</p>
      <ol className="list-decimal space-y-1 pl-5 text-sm"><li>Open WhatsApp and send us the message (it is already typed).</li><li>We reply with a payment QR code for exactly {inr(open.amount)}.</li><li>Pay by UPI and send us the UPI reference number.</li><li>We confirm your payment and switch your plan on. You get a notification.</li></ol>
      <p className="text-sm">Your reference: <b>{open.ref}</b></p>
      <div className="flex flex-wrap gap-2">{open.url ? <a href={open.url} target="_blank" rel="noreferrer" className="btn">Open WhatsApp</a> : <p className="text-sm font-semibold text-red-300">Please send reference {open.ref} to our support number (see the Contact page).</p>}
        <form action={cancelPlanRequest}><input type="hidden" name="tx" value={open.txId} /><SubmitButton className="btn-ghost" pendingText="Cancelling…">Cancel request</SubmitButton></form></div></div>)}

    {!paidPlansOpen() && <div className="card border-brand-600 text-sm">Paid plans open soon. Until then, new verified providers get the Professional features free for a trial period.</div>}
    <div className="grid gap-4 md:grid-cols-3">{plans?.map((p: any) => (<div key={p.id} className={`card space-y-2 ${sub?.membership_plans?.code === p.code ? 'border-2 border-brand-600' : ''}`}><h2 className="font-display text-xl font-bold">{p.name}</h2>
      <p className="font-display text-2xl font-extrabold">{Number(p.price_inr_monthly) === 0 ? 'Free' : inr(p.price_inr_monthly) + ' / 30 days'}</p>
      <ul className="list-disc space-y-1 pl-4 text-sm text-muted"><li>Up to {p.max_vehicles} vehicle listings</li>{perks(p.features).map((x) => <li key={x}>{x}</li>)}</ul>
      {paidPlansOpen() && Number(p.price_inr_monthly) > 0 && sub?.membership_plans?.code !== p.code && (
        <form action={requestPlan} className="space-y-2"><input type="hidden" name="planId" value={p.id} />
          <label className="flex gap-2 text-xs"><input type="checkbox" name="consent" required />I understand I will pay {inr(p.price_inr_monthly)} by UPI using the QR code sent on WhatsApp. The plan lasts 30 days and does not renew automatically.</label>
          <SubmitButton className="btn w-full" pendingText="Opening WhatsApp…">Choose {p.name} on WhatsApp</SubmitButton></form>)}</div>))}</div>
    <section className="card text-sm"><h2 className="mb-1 font-semibold">Payment history</h2>{txs?.map((t: any) => <p key={t.id}>{new Date(t.created_at).toLocaleDateString('en-IN')} · ₹{t.amount_inr} · {t.status === 'pending' ? 'waiting for payment' : t.status}{t.status === 'succeeded' && <> · <a href={`/provider/membership/receipt/${t.id}`} className="font-bold text-brand-700 underline">Receipt</a></>}</p>)}{!txs?.length && <p className="text-subtle">None yet.</p>}</section></div>);
}
