import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adminReplyTicket } from '@/app/actions2';
export default async function Support() {
  await requireAdmin();
  const { data: t } = await supabaseAdmin().from('support_tickets').select('*').order('created_at', { ascending: false }).limit(100);
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Support tickets</h1>{t?.map((x: any) => (<form key={x.id} action={adminReplyTicket} className="card space-y-2 text-sm"><input type="hidden" name="id" value={x.id} />
    <p><b>{x.subject}</b> · {x.status.replace('_', ' ')}</p><p>{x.message}</p><textarea name="reply" defaultValue={x.admin_reply ?? ''} placeholder="Reply" className="input" />
    <div className="flex gap-2"><select name="status" defaultValue={x.status} className="input w-auto">{['open', 'in_progress', 'resolved', 'closed'].map((s) => <option key={s}>{s}</option>)}</select><button className="btn">Save</button></div></form>))}{!t?.length && <p className="text-subtle">No tickets.</p>}</div>);
}
