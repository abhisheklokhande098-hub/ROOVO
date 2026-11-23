import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { syncPlanRank } from '@/lib/plan';
import { notify } from '@/lib/notify';
// Daily: (1) remind providers 5 days before their plan ends, (2) move expired plans to Basic. Never charges anyone.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = supabaseAdmin(); const now = new Date().toISOString();
  const { data: basic } = await db.from('membership_plans').select('id').eq('code', 'basic').single();
  const { data: ending } = await db.from('subscriptions').select('id,provider_id').in('status', ['trialing', 'active']).gt('current_period_end', now).lt('current_period_end', new Date(Date.now() + 5 * 864e5).toISOString()).is('reminder_sent_at', null);
  for (const s of ending ?? []) {
    const { data: p } = await db.from('provider_profiles').select('user_id').eq('id', s.provider_id).single();
    if (p) await notify(p.user_id, 'Your plan ends in less than 5 days', 'Renew from Provider → Membership to keep your features. We never charge you automatically.');
    await db.from('subscriptions').update({ reminder_sent_at: now }).eq('id', s.id);
  }
  const { data: due } = await db.from('subscriptions').select('id,provider_id').in('status', ['trialing', 'active']).lt('current_period_end', now);
  let n = 0;
  for (const s of due ?? []) {
    await db.from('subscriptions').update({ status: 'expired' }).eq('id', s.id);
    const { data: still } = await db.from('subscriptions').select('id').eq('provider_id', s.provider_id).in('status', ['trialing', 'active']).limit(1);
    if (!still?.length) {
      await db.from('subscriptions').insert({ provider_id: s.provider_id, plan_id: basic!.id, status: 'active', current_period_end: new Date(Date.now() + 3650 * 864e5).toISOString() });
      const { data: p } = await db.from('provider_profiles').select('user_id').eq('id', s.provider_id).single();
      if (p) await notify(p.user_id, 'Plan changed to Basic', 'Your plan period ended. Renew any time to restore features.');
      n++;
    }
    await syncPlanRank(s.provider_id);
  }
  return NextResponse.json({ ok: true, reminded: ending?.length ?? 0, downgraded: n });
}
