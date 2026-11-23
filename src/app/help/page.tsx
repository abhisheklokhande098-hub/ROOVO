import { requireUser } from '@/lib/auth';
import { createTicket } from '@/app/actions2';
export default async function Help() {
  const { sb, user } = await requireUser();
  const { data: tickets } = await sb.from('support_tickets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  return (<div className="mx-auto max-w-2xl space-y-6"><h1 className="text-2xl font-bold">Help & support</h1>
    <form action={createTicket} className="card space-y-2"><input name="subject" placeholder="Subject" required minLength={3} className="input" /><textarea name="message" placeholder="How can we help?" required minLength={5} className="input min-h-28" /><button className="btn">Send</button></form>
    {tickets?.map((t: any) => <div key={t.id} className="card text-sm"><b>{t.subject}</b> · {t.status.replace('_', ' ')}<p>{t.message}</p>{t.admin_reply && <p className="mt-1 rounded bg-surface2 p-2"><b>Reply:</b> {t.admin_reply}</p>}</div>)}</div>);
}
