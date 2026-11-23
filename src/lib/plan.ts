import { supabaseAdmin } from './supabase/admin';
export async function getPlan(providerId: string) {
  const { data } = await supabaseAdmin().from('subscriptions').select('*, membership_plans(*)')
    .eq('provider_id', providerId).in('status', ['trialing', 'active']).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data as any;
}
/** Keeps provider_profiles.plan_rank in step with the active plan (drives search ranking and the Featured badge for Premium). */
export async function syncPlanRank(providerId: string) {
  const code = (await getPlan(providerId))?.membership_plans?.code;
  await supabaseAdmin().from('provider_profiles').update({ plan_rank: code === 'premium' ? 2 : code === 'professional' ? 1 : 0 }).eq('id', providerId);
}
