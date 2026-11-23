import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adminSetBlocked } from '@/app/actions3';
export default async function Customers() {
  await requireAdmin(); const db = supabaseAdmin();
  const { data: c } = await db.from('profiles').select('id,full_name,is_blocked,created_at').eq('role', 'customer').order('created_at', { ascending: false }).limit(200);
  const { data: au } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  const email: Record<string, string> = Object.fromEntries((au?.users ?? []).map((u: any) => [u.id, u.email]));
  return (<div className="space-y-3"><h1 className="text-2xl font-bold">Customers</h1><p className="text-sm text-subtle">Blocked customers can still log in but cannot request bookings.</p>
    {c?.map((x: any) => (<form key={x.id} action={adminSetBlocked} className="card flex flex-wrap items-center justify-between gap-2 text-sm">
      <span><b>{x.full_name || '-'}</b> · {email[x.id] ?? '-'} · joined {new Date(x.created_at).toLocaleDateString('en-IN')}{x.is_blocked && <b className="ml-2 text-red-300">BLOCKED</b>}</span>
      <input type="hidden" name="id" value={x.id} /><input type="hidden" name="block" value={x.is_blocked ? '0' : '1'} />
      <button className={x.is_blocked ? 'btn' : 'btn-ghost'}>{x.is_blocked ? 'Unblock' : 'Block'}</button></form>))}
    {!c?.length && <p className="text-subtle">No customers yet.</p>}</div>);
}
