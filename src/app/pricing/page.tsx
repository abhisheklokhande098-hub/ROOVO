import Link from 'next/link';
import { company } from '@/lib/company';
import { paidPlansOpen } from '@/lib/flags';
import { supabaseServer } from '@/lib/supabase/server';
export const metadata = { title: 'Pricing for rental businesses | ROOVO' };
const perks = (f: any = {}) => [
  f.dashboard ? 'Booking management dashboard and availability calendar' : 'Business profile and basic booking requests',
  f.analytics ? (f.analytics === 'advanced' ? 'Advanced analytics' : 'Business analytics') : null,
  f.visibility === 'priority' ? 'Priority visibility in search' : f.visibility === 'improved' ? 'Improved listing visibility' : null,
  f.featured ? 'Featured listing badge and promotional opportunities' : null,
].filter(Boolean) as string[];
export default async function Pricing() {
  const sb = await supabaseServer();
  const { data: plans } = await sb.from('membership_plans').select('*').eq('is_active', true).order('price_inr_monthly');
  return (<div className="space-y-8">
    <div className="max-w-2xl space-y-2"><h1 className="font-display text-4xl font-extrabold">Simple pricing for rental businesses</h1>
      <p className="text-muted">Customers use ROOVO free and pay the owner directly. Rental businesses choose a plan. New verified providers get a free 30-day Professional trial, and nothing renews automatically.</p></div>
    {!paidPlansOpen() && <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">Paid plans open soon. During our launch period, new verified providers get the Professional features free for a trial period.</p>}
    <div className="grid gap-4 md:grid-cols-3">{plans?.map((p: any) => (<div key={p.id} className="card space-y-3"><h2 className="font-display text-xl font-bold">{p.name}</h2>
      <p className="font-display text-3xl font-extrabold">{Number(p.price_inr_monthly) === 0 ? 'Free' : '₹' + Number(p.price_inr_monthly).toLocaleString('en-IN')}{Number(p.price_inr_monthly) > 0 && <span className="text-sm font-semibold text-subtle"> / 30 days</span>}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted"><li>Up to {p.max_vehicles} vehicle listings</li>{perks(p.features).map((x) => <li key={x}>{x}</li>)}</ul></div>))}</div>
    <p className="text-xs text-subtle">Prices are {company.gst} of GST. Plans last 30 days, are paid once, and do not renew automatically. See our <Link href="/terms#memberships" className="underline">membership terms</Link> and <Link href="/refund-policy" className="underline">refund policy</Link>.</p>
    <Link href="/register?as=provider" className="btn">List your vehicles</Link></div>);
}
