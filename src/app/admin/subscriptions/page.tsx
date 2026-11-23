import QRCode from 'qrcode';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adminActivateRequest, adminCancelRequest, adminGrantPlan } from '@/app/actions5';
import { upiLink, waLink } from '@/lib/manualPayments';
import SubmitButton from '@/components/SubmitButton';

const inr = (n: number) => '₹' + Number(n).toLocaleString('en-IN');
const when = (d: string) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default async function PlanPayments() {
  await requireAdmin(); const db = supabaseAdmin();
  const [pending, active, recent, providers, plans] = await Promise.all([
    db.from('subscription_transactions').select('id, amount_inr, gateway_order_id, created_at, subscriptions(provider_profiles(business_name, contact_phone), membership_plans(name))').eq('status', 'pending').like('gateway_order_id', 'manual_%').order('created_at'),
    db.from('subscriptions').select('id, current_period_end, is_trial, provider_profiles(business_name, contact_phone), membership_plans(name)').in('status', ['trialing', 'active']).order('current_period_end'),
    db.from('subscription_transactions').select('id, amount_inr, gateway_payment_id, created_at, subscriptions(provider_profiles(business_name), membership_plans(name))').eq('status', 'succeeded').order('created_at', { ascending: false }).limit(20),
    db.from('provider_profiles').select('id, business_name').order('business_name'),
    db.from('membership_plans').select('id, name, price_inr_monthly').order('price_inr_monthly'),
  ]);
  const reqs = await Promise.all(((pending.data ?? []) as any[]).map(async (t) => {
    const ref = String(t.gateway_order_id).replace('manual_', ''); const link = upiLink({ amount: Number(t.amount_inr), ref });
    const prov = t.subscriptions?.provider_profiles; const plan = t.subscriptions?.membership_plans?.name;
    const qr = link ? await QRCode.toDataURL(link, { margin: 1, width: 300 }) : null;
    const wa = prov?.contact_phone ? waLink(prov.contact_phone, `Hello ${prov.business_name}, thanks for choosing the ROOVO ${plan} plan (${inr(t.amount_inr)}). Please pay using the attached QR and reply with the UPI reference number (UTR). Reference: ${ref}`) : null;
    return { t, ref, link, prov, plan, qr, wa };
  }));
  const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);
  return (<div className="space-y-8"><h1 className="font-display text-3xl font-extrabold">Plan payments</h1>
    {!process.env.WHATSAPP_NUMBER && <div role="alert" className="rounded-2xl border-2 border-red-400/40 bg-red-500/10 p-4 text-sm font-semibold text-red-300">WHATSAPP_NUMBER is not set in your environment variables, so providers cannot be sent to WhatsApp. Run <code>npm run setup-env -- WHATSAPP_NUMBER=91XXXXXXXXXX</code>, then restart the server.</div>}
    {!process.env.UPI_ID && <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-200">UPI_ID is not set, so ready-made QR codes are not shown. You can still send a QR from your own UPI app.</div>}

    <section className="space-y-3"><h2 className="font-display text-xl font-bold">Waiting for payment ({reqs.length})</h2>
      <p className="text-sm text-muted">Providers appear here after they tap a plan and message you on WhatsApp. Send them the QR, wait for the payment, check your bank or UPI app, then confirm below. Only confirm money you can see in your account.</p>
      {reqs.map(({ t, ref, link, prov, plan, qr, wa }) => (<div key={t.id} className="card grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-2 text-sm"><p className="font-display text-lg font-bold">{prov?.business_name} <span className="chip">{plan}</span></p>
          <p>Amount: <b>{inr(t.amount_inr)}</b> · Reference: <b>{ref}</b> · Asked {when(t.created_at)}</p><p>Phone: {prov?.contact_phone}</p>
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">Message on WhatsApp</a>}
          <div className="flex flex-wrap items-end gap-2 pt-2"><form action={adminActivateRequest} className="flex flex-wrap items-end gap-2"><input type="hidden" name="tx" value={t.id} />
            <label><span className="label">UPI reference (UTR)</span><input name="utr" placeholder="12-digit reference" className="input" /></label><SubmitButton pendingText="Activating…">Payment received: activate</SubmitButton></form>
            <form action={adminCancelRequest}><input type="hidden" name="tx" value={t.id} /><SubmitButton className="btn-ghost" pendingText="Cancelling…">Cancel request</SubmitButton></form></div></div>
        {qr ? (<div className="text-center">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={qr} alt={`UPI QR for ${ref}`} width={200} height={200} className="mx-auto rounded-xl border border-line" />
          <p className="mt-1 text-xs text-subtle">Press and hold or screenshot this QR, then send it on WhatsApp. Amount and reference are pre-filled.</p></div>)
          : <p className="text-xs text-subtle">Set UPI_ID in your environment variables to see a ready-made QR here. Until then send your own QR from your bank app and ask for reference {ref} in the payment note.</p>}</div>))}
      {!reqs.length && <div className="card text-sm text-muted">No pending requests.</div>}</section>

    <section className="space-y-3"><h2 className="font-display text-xl font-bold">Active memberships</h2>
      <div className="card overflow-x-auto p-0"><table className="w-full text-left text-sm"><thead className="bg-canvas text-xs text-subtle"><tr><th className="p-3">Business</th><th>Plan</th><th>Ends</th><th>Days left</th><th></th></tr></thead><tbody>
        {((active.data ?? []) as any[]).map((s) => { const left = daysLeft(s.current_period_end); const p = s.provider_profiles;
          const remind = p?.contact_phone ? waLink(p.contact_phone, `Hello ${p.business_name}, your ROOVO ${s.membership_plans?.name} plan ends on ${new Date(s.current_period_end).toLocaleDateString('en-IN')}. Reply here if you would like to renew.`) : null;
          return (<tr key={s.id} className="border-t border-line"><td className="p-3 font-semibold">{p?.business_name}</td><td>{s.membership_plans?.name}{s.is_trial ? ' (trial)' : ''}</td><td>{new Date(s.current_period_end).toLocaleDateString('en-IN')}</td>
            <td className={left <= 7 ? 'font-bold text-red-300' : ''}>{left > 3000 ? 'no end' : left}</td><td>{remind && left <= 7 && left < 3000 && <a href={remind} target="_blank" rel="noreferrer" className="font-bold text-brand-700 underline">Send reminder</a>}</td></tr>); })}
      </tbody></table>{!active.data?.length && <p className="p-3 text-sm text-subtle">None yet.</p>}</div></section>

    <section className="space-y-3"><h2 className="font-display text-xl font-bold">Give a plan directly</h2>
      <p className="text-sm text-muted">For renewals paid outside a request, longer periods, or free upgrades. Replaces the provider’s current plan.</p>
      <form action={adminGrantPlan} className="card grid gap-3 md:grid-cols-5 md:items-end">
        <label><span className="label">Provider</span><select name="provider" required className="input">{((providers.data ?? []) as any[]).map((p) => <option key={p.id} value={p.id}>{p.business_name}</option>)}</select></label>
        <label><span className="label">Plan</span><select name="plan" required className="input">{((plans.data ?? []) as any[]).map((p) => <option key={p.id} value={p.id}>{p.name} ({inr(p.price_inr_monthly)})</option>)}</select></label>
        <label><span className="label">Days</span><input name="days" type="number" min="1" max="400" defaultValue={30} className="input" /></label>
        <label><span className="label">UPI reference (optional)</span><input name="utr" className="input" /></label>
        <SubmitButton pendingText="Saving…">Give plan</SubmitButton></form></section>

    <section className="space-y-2"><h2 className="font-display text-xl font-bold">Recent confirmed payments</h2>
      <div className="card text-sm">{((recent.data ?? []) as any[]).map((r) => <p key={r.id} className="border-b border-line py-1 last:border-0">{when(r.created_at)} · <b>{r.subscriptions?.provider_profiles?.business_name}</b> · {r.subscriptions?.membership_plans?.name} · {inr(r.amount_inr)} · {r.gateway_payment_id}</p>)}{!recent.data?.length && <p className="text-subtle">None yet.</p>}</div></section>
  </div>);
}
