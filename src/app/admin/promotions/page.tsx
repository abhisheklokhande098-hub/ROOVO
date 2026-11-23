import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adminToggleFeatured } from '@/app/actions2';
export default async function Promotions() {
  await requireAdmin();
  const { data: v } = await supabaseAdmin().from('vehicles').select('id,title,is_featured,provider_profiles(business_name)').eq('status', 'verified').order('is_featured', { ascending: false });
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Featured listings</h1><p className="text-sm text-subtle">Featured vehicles appear first in search and carry a “Featured” tag.</p>
    {v?.map((x: any) => <form key={x.id} action={adminToggleFeatured} className="card flex items-center justify-between text-sm"><span><b>{x.title}</b> · {x.provider_profiles?.business_name}</span><input type="hidden" name="id" value={x.id} /><input type="hidden" name="on" value={x.is_featured ? '0' : '1'} /><button className={x.is_featured ? 'btn' : 'btn-ghost'}>{x.is_featured ? 'Featured: remove' : 'Make featured'}</button></form>)}{!v?.length && <p className="text-subtle">No verified vehicles yet.</p>}</div>);
}
