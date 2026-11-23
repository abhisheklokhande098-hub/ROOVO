import { requireProvider } from '@/lib/auth';
import { getPlan } from '@/lib/plan';
export default async function Analytics() {
  const { sb, provider } = await requireProvider();
  if (!provider) return <p>Register your business first.</p>;
  const plan = await getPlan(provider.id);
  if (!plan?.membership_plans?.features?.analytics) return <div className="card">Analytics is included in Professional and Premium plans. <a className="text-brand-600 underline" href="/provider/membership">View plans</a></div>;
  const { data: b } = await sb.from('bookings').select('status,rental_amount,created_at,start_at,vehicles(title)').eq('provider_id', provider.id);
  const all = b ?? []; const paid = all.filter((x: any) => ['confirmed', 'handed_over', 'completed'].includes(x.status));
  const months: Record<string, number> = {}; const byVeh: Record<string, number> = {};
  for (const x of paid as any[]) { const k = String(x.start_at).slice(0, 7); months[k] = (months[k] ?? 0) + Number(x.rental_amount); byVeh[x.vehicles?.title ?? '?'] = (byVeh[x.vehicles?.title ?? '?'] ?? 0) + Number(x.rental_amount); }
  const keys = Object.keys(months).sort().slice(-6); const max = Math.max(1, ...keys.map((k) => months[k]));
  const rate = all.length ? Math.round((paid.length / all.length) * 100) : 0;
  const advanced = plan.membership_plans.features.analytics === 'advanced';
  return (<div className="space-y-6"><h1 className="text-2xl font-bold">Analytics</h1>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['Requests', all.length], ['Paid bookings', paid.length], ['Booked value', '₹' + paid.reduce((a: number, x: any) => a + Number(x.rental_amount), 0).toLocaleString('en-IN')], ['Conversion', rate + '%']].map(([k, v]) => <div key={k as string} className="card text-center"><b className="text-xl">{v}</b><p className="text-xs text-subtle">{k}</p></div>)}</div>
    <section className="card"><h2 className="mb-2 font-semibold">Booked value by month</h2>{keys.length ? keys.map((k) => <div key={k} className="flex items-center gap-2 text-xs"><span className="w-16">{k}</span><div className="h-4 rounded bg-brand-600" style={{ width: `${(months[k] / max) * 100}%` }} /><span>₹{months[k].toLocaleString('en-IN')}</span></div>) : <p className="text-sm text-subtle">No paid bookings yet.</p>}</section>
    {advanced ? <section className="card"><h2 className="mb-2 font-semibold">Top vehicles (Premium)</h2>{Object.entries(byVeh).sort((a, b) => b[1] - a[1]).map(([k, v]) => <p key={k} className="text-sm">{k}: ₹{v.toLocaleString('en-IN')}</p>)}</section> : <p className="text-xs text-subtle">Per-vehicle breakdown is part of Premium.</p>}</div>);
}
