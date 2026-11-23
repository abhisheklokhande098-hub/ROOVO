import { notFound } from 'next/navigation';
import { requireProvider } from '@/lib/auth';
import PrintButton from '@/components/PrintButton';
export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { sb, provider } = await requireProvider();
  if (!provider) notFound();
  const { data: tx } = await sb.from('subscription_transactions').select('*, subscriptions(provider_id,current_period_start,current_period_end,membership_plans(name))').eq('id', id).eq('status', 'succeeded').maybeSingle();
  const sub = (tx as any)?.subscriptions;
  if (!tx || sub?.provider_id !== provider.id) notFound();
  const date = (d: string) => new Date(d).toLocaleDateString('en-IN', { dateStyle: 'long' });
  const rows: [string, string][] = [
    ['Receipt number', 'ROOVO-' + String(tx.id).slice(0, 8).toUpperCase()],
    ['Date', date(tx.created_at)],
    ['Plan', `${sub.membership_plans?.name} (30 days)`],
    ['Plan period', `${date(sub.current_period_start)} to ${date(sub.current_period_end)}`],
    ['Payment reference', tx.gateway_payment_id ?? '-'],
  ];
  return (<div className="mx-auto max-w-xl space-y-4"><div className="card space-y-4 print:border-0">
    <div className="flex items-start justify-between"><div><h1 className="font-display text-2xl font-extrabold">Payment receipt</h1><p className="text-sm text-muted">ROOVO membership</p></div></div>
    <div className="grid gap-3 text-sm sm:grid-cols-2"><div><p className="label">Issued by</p><p className="font-bold">{process.env.COMPANY_NAME || '[Your company name]'}</p><p className="whitespace-pre-line text-muted">{process.env.COMPANY_ADDRESS || '[Company address]'}</p>{process.env.COMPANY_GSTIN && <p className="text-muted">GSTIN: {process.env.COMPANY_GSTIN}</p>}</div>
      <div><p className="label">Billed to</p><p className="font-bold">{provider.business_name}</p><p className="text-muted">{provider.address}</p>{provider.gstin && <p className="text-muted">GSTIN: {provider.gstin}</p>}</div></div>
    <dl className="divide-y divide-line text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>)}
      <div className="flex justify-between py-3 font-display text-lg font-extrabold"><dt>Amount paid</dt><dd>₹{Number(tx.amount_inr).toLocaleString('en-IN')}</dd></div></dl>
    <p className="text-xs text-subtle">This is a payment receipt, not a GST tax invoice. [Add your tax invoice wording here once your CA confirms how GST applies to membership fees.]</p></div>
    <PrintButton /></div>);
}
