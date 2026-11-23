'use server';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { activatePendingRequest } from '@/lib/membership';
import { syncPlanRank } from '@/lib/plan';
import { notify } from '@/lib/notify';

/** You confirmed the money in your bank/UPI app: activate the plan the provider asked for. */
export async function adminActivateRequest(fd: FormData) {
  const { user } = await requireAdmin(); const txId = String(fd.get('tx'));
  const utr = String(fd.get('utr') ?? '').trim().slice(0, 40);
  const r = await activatePendingRequest(txId, utr);
  if (r.ok) await supabaseAdmin().from('audit_logs').insert({ actor_id: user.id, action: 'manual_payment_confirmed', entity: 'subscription_transactions', entity_id: txId, details: { utr } });
  revalidatePath('/admin/subscriptions');
}
export async function adminCancelRequest(fd: FormData) {
  const { user } = await requireAdmin(); const db = supabaseAdmin();
  const { data: tx } = await db.from('subscription_transactions').select('id, subscription_id, status, subscriptions(provider_id, provider_profiles(user_id))').eq('id', String(fd.get('tx'))).eq('status', 'pending').maybeSingle();
  if (!tx) return;
  await db.from('subscription_transactions').update({ status: 'cancelled' }).eq('id', tx.id);
  await db.from('subscriptions').update({ status: 'cancelled' }).eq('id', tx.subscription_id).eq('status', 'past_due');
  const owner = (tx as any).subscriptions?.provider_profiles?.user_id;
  if (owner) await notify(owner, 'Plan request cancelled', 'Your plan request was cancelled. You can make a new request from the Membership page.', '/provider/membership');
  await db.from('audit_logs').insert({ actor_id: user.id, action: 'plan_request_cancelled', entity: 'subscription_transactions', entity_id: tx.id });
  revalidatePath('/admin/subscriptions');
}
/** Give a provider a plan directly (a renewal, a longer period, a free upgrade). */
export async function adminGrantPlan(fd: FormData) {
  const { user } = await requireAdmin(); const db = supabaseAdmin();
  const providerId = String(fd.get('provider')); const days = Math.min(Math.max(parseInt(String(fd.get('days') || '30'), 10) || 30, 1), 400);
  const { data: plan } = await db.from('membership_plans').select('*').eq('id', String(fd.get('plan'))).maybeSingle();
  const { data: prov } = await db.from('provider_profiles').select('id, user_id').eq('id', providerId).maybeSingle();
  if (!plan || !prov) return;
  const utr = String(fd.get('utr') ?? '').trim().slice(0, 40); const now = Date.now();
  await db.from('subscriptions').update({ status: 'expired' }).eq('provider_id', providerId).in('status', ['trialing', 'active']);
  const { data: sub } = await db.from('subscriptions').insert({ provider_id: providerId, plan_id: plan.id, status: 'active', is_trial: false, current_period_start: new Date(now).toISOString(), current_period_end: new Date(now + days * 864e5).toISOString(), consent_recorded_at: new Date().toISOString() }).select('id').single();
  if (Number(plan.price_inr_monthly) > 0) await db.from('subscription_transactions').insert({ subscription_id: sub!.id, amount_inr: plan.price_inr_monthly, status: 'succeeded', gateway_order_id: 'manual_grant_' + crypto.randomUUID().slice(0, 8), gateway_payment_id: utr ? `UPI-${utr}` : 'manual-grant' });
  await syncPlanRank(providerId);
  await notify(prov.user_id, 'Membership active', `Your ${plan.name} plan is active for ${days} days.`, '/provider/membership');
  await db.from('audit_logs').insert({ actor_id: user.id, action: 'plan_granted', entity: 'provider_profiles', entity_id: providerId, details: { plan: plan.code, days, utr } });
  revalidatePath('/admin/subscriptions');
}
