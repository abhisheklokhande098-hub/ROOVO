import crypto from 'crypto';
import { supabaseAdmin } from './supabase/admin';
import { notify } from './notify';

const digits = (s: string) => s.replace(/\D/g, '');
/** wa.me link with a ready-typed message. 10-digit Indian numbers get +91 added. */
export function waLink(phone: string, text: string) {
  let n = digits(phone); if (n.length === 10) n = '91' + n;
  return n.length >= 11 ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
/** UPI payment link with the amount and our reference already filled in (shown to you as a QR on the admin page). */
export function upiLink(o: { amount: number; ref: string }) {
  const vpa = process.env.UPI_ID; if (!vpa) return null;
  return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(process.env.UPI_NAME || 'ROOVO')}&am=${o.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(o.ref)}`;
}
const inr = (n: number) => Number(n).toLocaleString('en-IN');
export const requestMessage = (o: { planName: string; price: number; business: string; email: string; ref: string }) =>
  `Hello ROOVO team, I would like to activate the ${o.planName} plan (₹${inr(o.price)} for 30 days).\nBusiness: ${o.business}\nEmail: ${o.email}\nReference: ${o.ref}\nPlease send the payment QR code.`;

/** Creates (or reuses) ONE open plan request per provider and returns the WhatsApp link to message you. */
export async function createPlanRequest(o: { providerId: string; planId: string; businessName: string; email: string }) {
  const db = supabaseAdmin();
  const { data: plan } = await db.from('membership_plans').select('*').eq('id', o.planId).eq('is_active', true).maybeSingle();
  if (!plan || Number(plan.price_inr_monthly) <= 0) return null;
  const { data: old } = await db.from('subscriptions').select('id, plan_id, subscription_transactions(id, gateway_order_id, status)').eq('provider_id', o.providerId).eq('status', 'past_due');
  let ref: string | null = null;
  for (const s of (old ?? []) as any[]) {
    const tx = (s.subscription_transactions ?? []).find((t: any) => t.status === 'pending' && String(t.gateway_order_id).startsWith('manual_'));
    if (tx && s.plan_id === plan.id && !ref) { ref = String(tx.gateway_order_id).replace('manual_', ''); continue; } // same plan again: reuse
    await db.from('subscriptions').update({ status: 'cancelled' }).eq('id', s.id);
    await db.from('subscription_transactions').update({ status: 'cancelled' }).eq('subscription_id', s.id).eq('status', 'pending');
  }
  if (!ref) {
    ref = 'ROOVO-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const { data: sub } = await db.from('subscriptions').insert({ provider_id: o.providerId, plan_id: plan.id, status: 'past_due', current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(), consent_recorded_at: new Date().toISOString() }).select('id').single();
    await db.from('subscription_transactions').insert({ subscription_id: sub!.id, amount_inr: plan.price_inr_monthly, status: 'pending', gateway_order_id: 'manual_' + ref });
    const { data: admins } = await db.from('profiles').select('id').eq('role', 'admin');
    for (const a of admins ?? []) await notify(a.id, 'New plan request', `${o.businessName} wants ${plan.name} (${ref}).`, '/admin/subscriptions');
  }
  const message = requestMessage({ planName: plan.name, price: Number(plan.price_inr_monthly), business: o.businessName, email: o.email, ref });
  const to = process.env.WHATSAPP_NUMBER ?? '';
  return { ref, plan, message, url: to ? waLink(to, message) : null };
}

/** The provider's current open request, if any (for the Membership page banner). */
export async function getOpenRequest(providerId: string, business: string, email: string) {
  const { data } = await supabaseAdmin().from('subscriptions').select('id, membership_plans(name, price_inr_monthly), subscription_transactions(id, gateway_order_id, status)').eq('provider_id', providerId).eq('status', 'past_due').order('created_at', { ascending: false });
  for (const s of (data ?? []) as any[]) {
    const tx = (s.subscription_transactions ?? []).find((t: any) => t.status === 'pending' && String(t.gateway_order_id).startsWith('manual_'));
    if (!tx) continue;
    const ref = String(tx.gateway_order_id).replace('manual_', ''); const plan = s.membership_plans;
    const message = requestMessage({ planName: plan.name, price: Number(plan.price_inr_monthly), business, email, ref });
    const to = process.env.WHATSAPP_NUMBER ?? '';
    return { txId: tx.id as string, ref, planName: plan.name as string, amount: Number(plan.price_inr_monthly), url: to ? waLink(to, message) : null };
  }
  return null;
}
