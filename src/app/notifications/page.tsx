import { requireUser } from '@/lib/auth';
import { markNotificationsRead } from '@/app/actions2';
export default async function Notifications() {
  const { sb, user } = await requireUser();
  const { data: n } = await sb.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
  return (<div className="mx-auto max-w-2xl space-y-4"><div className="flex justify-between"><h1 className="text-2xl font-bold">Notifications</h1><form action={markNotificationsRead}><button className="btn-ghost">Mark all read</button></form></div>
    {n?.length === 0 && <p className="text-subtle">Nothing yet.</p>}
    {n?.map((x: any) => <div key={x.id} className={`card text-sm ${x.is_read ? '' : 'border-brand-600'}`}><b>{x.title}</b> {x.body}<p className="text-xs text-subtle">{new Date(x.created_at).toLocaleString('en-IN')}</p></div>)}</div>);
}
