// Replace the ENTIRE contents of src/app/admin/page.tsx with this file.
// Needs: src/app/actions.ts (original bundle) and src/app/actions2.ts (update pack 1).
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { adminReviewProvider, adminReviewVehicle, adminSetPlanPrice } from '@/app/actions';

const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');
const when = (d: string) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

function Btn({ action, id, d, children }: { action: any; id: string; d: string; children: React.ReactNode }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" value={d} />
      <button className="btn-ghost">{children}</button>
    </form>
  );
}
const Stat = ({ k, v }: { k: string; v: string | number }) => (
  <div className="card text-center"><b className="text-lg">{v}</b><p className="text-xs text-subtle">{k}</p></div>
);

export default async function Admin() {
  await requireAdmin();
  const db = supabaseAdmin();

  const [provs, vehs, plans, bks, logs, tickets, profs, authUsers, planReqs] = await Promise.all([
    db.from('provider_profiles').select('*, provider_documents(id,doc_type,status,storage_path)').order('created_at', { ascending: false }),
    db.from('vehicles').select('id,title,status,registration_no, provider_profiles(business_name), vehicle_documents(id,doc_type,status,expires_on,storage_path)').order('created_at', { ascending: false }).limit(100),
    db.from('membership_plans').select('*').order('price_inr_monthly'),
    db.from('bookings').select('id,status,rental_amount,deposit_amount,start_at,end_at,created_at,vehicles(title), provider_profiles(business_name)').order('created_at', { ascending: false }).limit(200),
    db.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(20),
    db.from('support_tickets').select('id,status'),
    db.from('profiles').select('id,full_name,role,created_at').eq('role', 'customer').order('created_at', { ascending: false }).limit(100),
    db.auth.admin.listUsers({ page: 1, perPage: 200 }),
    db.from('subscription_transactions').select('id', { count: 'exact', head: true }).eq('status', 'pending').like('gateway_order_id', 'manual_%'),
  ]);

  // short-lived signed links to private documents
  const signed: Record<string, string> = {};
  for (const p of (provs.data ?? []) as any[])
    for (const d of p.provider_documents ?? []) {
      const { data } = await db.storage.from('provider-docs').createSignedUrl(d.storage_path, 600);
      if (data) signed[d.id] = data.signedUrl;
    }
  for (const v of (vehs.data ?? []) as any[])
    for (const d of v.vehicle_documents ?? []) {
      const { data } = await db.storage.from('vehicle-docs').createSignedUrl(d.storage_path, 600);
      if (data) signed[d.id] = data.signedUrl;
    }

  const email: Record<string, string> = Object.fromEntries((authUsers.data?.users ?? []).map((u: any) => [u.id, u.email]));
  const bookings = (bks.data ?? []) as any[];
  const paidStatuses = ['confirmed', 'handed_over', 'completed'];
  const bookedValue = bookings.filter((b) => paidStatuses.includes(b.status)).reduce((a, b) => a + Number(b.rental_amount), 0);
  const pendingProviders = (provs.data ?? []).filter((p: any) => ['submitted', 'under_review'].includes(p.status)).length;
  const pendingVehicles = (vehs.data ?? []).filter((v: any) => ['submitted', 'under_review'].includes(v.status)).length;
  const openTickets = (tickets.data ?? []).filter((t: any) => ['open', 'in_progress'].includes(t.status)).length;
  const bookingsByCustomer: Record<string, number> = {};
  // customer booking counts need customer_id; fetched separately to keep the main query light
  const { data: custBookings } = await db.from('bookings').select('customer_id');
  for (const b of (custBookings ?? []) as any[]) bookingsByCustomer[b.customer_id] = (bookingsByCustomer[b.customer_id] ?? 0) + 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin dashboard</h1>
      <div className="flex flex-wrap gap-4 text-sm">
        <a href="/admin/support" className="text-brand-600 underline">Support tickets{openTickets ? ` (${openTickets})` : ''}</a>
        <a href="/admin/promotions" className="text-brand-600 underline">Featured listings</a>
        <a href="/admin/subscriptions" className="font-bold text-brand-600 underline">Plan payments{planReqs.count ? ` (${planReqs.count})` : ''}</a>
        <a href="/admin/customers" className="text-brand-600 underline">Block / unblock customers</a>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat k="Providers awaiting review" v={pendingProviders} />
        <Stat k="Vehicles awaiting review" v={pendingVehicles} />
        <Stat k="Customers" v={profs.data?.length ?? 0} />
        <Stat k="Bookings (latest 200)" v={bookings.length} />
        <Stat k="Booked rental value" v={inr(bookedValue)} />
        <Stat k="Plan requests waiting for payment" v={planReqs.count ?? 0} />
        <Stat k="Open support tickets" v={openTickets} />
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">Providers</h2>
        {(provs.data as any[])?.map((p) => (
          <div key={p.id} className="border-t pt-2 text-sm">
            <b>{p.business_name}</b> · <span className="capitalize">{String(p.status).replace('_', ' ')}</span> · {p.contact_phone} · {p.address}
            {p.gstin && <> · GSTIN {p.gstin}</>}
            <div className="flex flex-wrap gap-3 text-xs">
              {p.provider_documents?.length ? p.provider_documents.map((d: any) => (
                <a key={d.id} href={signed[d.id]} target="_blank" rel="noreferrer" className="text-brand-600 underline">{d.doc_type}</a>
              )) : <span className="text-subtle">No documents uploaded</span>}
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              <Btn action={adminReviewProvider} id={p.id} d="verified">Verify</Btn>
              <Btn action={adminReviewProvider} id={p.id} d="rejected">Reject</Btn>
              <Btn action={adminReviewProvider} id={p.id} d="suspended">Suspend</Btn>
            </div>
          </div>
        ))}
        {!provs.data?.length && <p className="text-sm text-subtle">No providers yet.</p>}
        <p className="text-xs text-subtle">“Verify” means you reviewed the documents yourself. Uploading documents never verifies anyone automatically.</p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Vehicles</h2>
        {(vehs.data as any[])?.map((v) => (
          <div key={v.id} className="border-t pt-2 text-sm">
            <b>{v.title}</b> ({v.registration_no}) · {v.provider_profiles?.business_name} · <span className="capitalize">{String(v.status).replace('_', ' ')}</span>
            <div className="flex flex-wrap gap-3 text-xs">
              {v.vehicle_documents?.length ? v.vehicle_documents.map((d: any) => (
                <a key={d.id} href={signed[d.id]} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                  {d.doc_type}{d.expires_on ? ` (exp ${d.expires_on})` : ''}
                </a>
              )) : <span className="text-subtle">No documents uploaded</span>}
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              <Btn action={adminReviewVehicle} id={v.id} d="verified">Verify</Btn>
              <Btn action={adminReviewVehicle} id={v.id} d="rejected">Reject</Btn>
              <Btn action={adminReviewVehicle} id={v.id} d="suspended">Suspend</Btn>
            </div>
          </div>
        ))}
        {!vehs.data?.length && <p className="text-sm text-subtle">No vehicles yet.</p>}
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Membership prices (₹ per month)</h2>
        {(plans.data as any[])?.map((p) => (
          <form key={p.id} action={adminSetPlanPrice} className="flex items-center gap-2 text-sm">
            <input type="hidden" name="id" value={p.id} />
            <span className="w-28">{p.name}</span>
            <input name="price" type="number" min="0" defaultValue={p.price_inr_monthly} className="input w-28" />
            <button className="btn-ghost">Save</button>
          </form>
        ))}
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Customers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-subtle"><tr><th className="py-1 pr-3">Name</th><th className="pr-3">Email</th><th className="pr-3">Joined</th><th>Bookings</th></tr></thead>
            <tbody>
              {(profs.data as any[])?.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="py-1 pr-3">{c.full_name || '-'}</td>
                  <td className="pr-3">{email[c.id] || '-'}</td>
                  <td className="pr-3">{when(c.created_at)}</td>
                  <td>{bookingsByCustomer[c.id] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!profs.data?.length && <p className="text-sm text-subtle">No customers yet.</p>}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Bookings (latest 200)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-subtle"><tr><th className="py-1 pr-3">Vehicle</th><th className="pr-3">Provider</th><th className="pr-3">Dates</th><th className="pr-3">Rental</th><th>Status</th></tr></thead>
            <tbody>
              {bookings.slice(0, 50).map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="py-1 pr-3">{b.vehicles?.title}</td>
                  <td className="pr-3">{b.provider_profiles?.business_name}</td>
                  <td className="pr-3">{when(b.start_at)} → {when(b.end_at)}</td>
                  <td className="pr-3">{inr(b.rental_amount)}</td>
                  <td className="capitalize">{String(b.status).replaceAll('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!bookings.length && <p className="text-sm text-subtle">No bookings yet.</p>}
        </div>
      </section>

      

      <section className="card text-xs">
        <h2 className="mb-1 text-sm font-semibold">Recent audit log</h2>
        {(logs.data as any[])?.map((l) => <p key={l.id}>{when(l.created_at)} · {l.action} · {l.entity_id}</p>)}
        {!logs.data?.length && <p className="text-subtle">No activity yet.</p>}
      </section>
    </div>
  );
}
