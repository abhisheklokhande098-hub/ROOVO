import { supabaseAdmin } from './supabase/admin';
import { notify } from './notify';
import { syncPlanRank } from './plan';
/** Called ONLY by an admin after seeing the money in the bank / UPI app. Safe to call twice: the second call does nothing. */
export async function activatePendingRequest(txId: string, utr: string) {
  const db = supabaseAdmin();
  const { data: tx } = await db.from('subscription_transactions').select('*, subscriptions(id, provider_id)').eq('id', txId).maybeSingle();
  if (!tx || tx.status !== 'pending' || !String(tx.gateway_order_id).startsWith('manual_')) return { ok: false as const, error: 'not a pending request' };
  const ref = String(tx.gateway_order_id).replace('manual_', '');
  // claim it first so two clicks cannot activate twice
  const { data: claimed } = await db.from('subscription_transactions').update({ status: 'succeeded', gateway_payment_id: utr ? `UPI-${utr}` : `manual-${ref}` }).eq('id', tx.id).eq('status', 'pending').select('id');
  if (!claimed?.length) return { ok: false as const, error: 'already handled' };
  const sub = (tx as any).subscriptions; const now = Date.now();
  await db.from('subscriptions').update({ status: 'expired' }).eq('provider_id', sub.provider_id).neq('id', sub.id).in('status', ['trialing', 'active']);
  await db.from('subscriptions').update({ status: 'active', is_trial: false, current_period_start: new Date(now).toISOString(), current_period_end: new Date(now + 30 * 864e5).toISOString(), reminder_sent_at: null }).eq('id', sub.id);
  await syncPlanRank(sub.provider_id);
  const { data: p } = await db.from('provider_profiles').select('user_id').eq('id', sub.provider_id).single();
  if (p) await notify(p.user_id, 'Membership active', 'Thank you! Your plan features are now unlocked for 30 days.', '/provider/membership');
  return { ok: true as const };
}
