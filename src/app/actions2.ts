'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, requireProvider, requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPlan, syncPlanRank } from '@/lib/plan';
import { allow } from '@/lib/rateLimit';
import { createPlanRequest } from '@/lib/manualPayments';
import { paidPlansOpen } from '@/lib/flags';

const IMG = ['image/jpeg', 'image/png', 'image/webp']; const DOC = ['application/pdf', 'image/jpeg', 'image/png'];
const ext = (n: string) => (n.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
async function ownVehicle(vid: string) {
  const { sb, user, provider } = await requireProvider();
  if (!provider) return null;
  const { data: v } = await sb.from('vehicles').select('id').eq('id', vid).eq('provider_id', provider.id).maybeSingle();
  return v ? { sb, user, provider, vid } : null;
}

/* ---------- vehicle images / documents ---------- */
export async function uploadVehicleImage(fd: FormData) {
  const c = await ownVehicle(String(fd.get('vehicleId')));
  const files = (fd.getAll('file') as File[]).filter((f) => f && f.size > 0).slice(0, 8);
  if (!c || !files.length) return;
  const { count } = await c.sb.from('vehicle_images').select('id', { count: 'exact', head: true }).eq('vehicle_id', c.vid);
  let order = count ?? 0;
  for (const f of files) {
    if (f.size > 4_300_000 || !IMG.includes(f.type)) continue;
    const path = `${c.user.id}/${c.vid}/${crypto.randomUUID()}.${ext(f.name)}`;
    const { error } = await c.sb.storage.from('vehicle-images').upload(path, f, { contentType: f.type });
    if (error) continue;
    await c.sb.from('vehicle_images').insert({ vehicle_id: c.vid, storage_path: path, sort_order: order++ });
  }
  revalidatePath(`/provider/vehicles/${c.vid}`);
}
export async function deleteVehicleImage(fd: FormData) {
  const c = await ownVehicle(String(fd.get('vehicleId')));
  if (!c) return;
  const { data: img } = await c.sb.from('vehicle_images').select('*').eq('id', String(fd.get('id'))).eq('vehicle_id', c.vid).maybeSingle();
  if (!img) return;
  await c.sb.storage.from('vehicle-images').remove([img.storage_path]);
  await c.sb.from('vehicle_images').delete().eq('id', img.id);
  revalidatePath(`/provider/vehicles/${c.vid}`);
}
export async function uploadVehicleDoc(fd: FormData) {
  const c = await ownVehicle(String(fd.get('vehicleId'))); const f = fd.get('file') as File;
  if (!c || !f || !f.size || f.size > 4_300_000 || !DOC.includes(f.type)) return;
  const path = `${c.user.id}/${c.vid}/${crypto.randomUUID()}.${ext(f.name)}`;
  const { error } = await c.sb.storage.from('vehicle-docs').upload(path, f, { contentType: f.type });
  if (error) return;
  const exp = String(fd.get('expires_on') || '');
  await c.sb.from('vehicle_documents').insert({ vehicle_id: c.vid, doc_type: String(fd.get('doc_type')), storage_path: path, expires_on: exp || null });
  revalidatePath(`/provider/vehicles/${c.vid}`);
}

/* ---------- availability calendar ---------- */
export async function addBlock(fd: FormData) {
  const c = await ownVehicle(String(fd.get('vehicleId')));
  if (!c) return;
  if (!(await getPlan(c.provider.id))?.membership_plans?.features?.dashboard) return; // availability calendar is a Professional/Premium feature
  const s = new Date(String(fd.get('start'))), e = new Date(String(fd.get('end')));
  if (isNaN(+s) || isNaN(+e) || e <= s) return;
  await c.sb.from('vehicle_availability').insert({ vehicle_id: c.vid, blocked_period: `[${s.toISOString()},${e.toISOString()})`, reason: String(fd.get('reason') ?? '').slice(0, 200) || null });
  revalidatePath(`/provider/vehicles/${c.vid}`);
}
export async function removeBlock(fd: FormData) {
  const c = await ownVehicle(String(fd.get('vehicleId')));
  if (!c) return;
  await c.sb.from('vehicle_availability').delete().eq('id', String(fd.get('id'))).eq('vehicle_id', c.vid);
  revalidatePath(`/provider/vehicles/${c.vid}`);
}

/* ---------- cancellations & refunds ---------- */
export async function requestCancel(fd: FormData) {
  const { sb, user } = await requireUser();
  const { data: b } = await sb.from('bookings').select('*').eq('id', String(fd.get('id'))).eq('customer_id', user.id).maybeSingle();
  if (!b || b.cancel_requested) return;
  const reason = String(fd.get('reason') ?? '').slice(0, 300); const db = supabaseAdmin();
  const { data: prov } = await db.from('provider_profiles').select('user_id').eq('id', b.provider_id).single();
  if (['requested', 'accepted_awaiting_payment', 'confirmed'].includes(b.status)) { // rentals are paid to the provider directly, so the platform holds no money: cancel immediately
    await db.from('bookings').update({ status: 'cancelled', cancel_reason: reason }).eq('id', b.id);
    await db.from('booking_payments').update({ status: 'cancelled' }).eq('booking_id', b.id).in('status', ['created', 'pending']);
    await db.from('booking_status_history').insert({ booking_id: b.id, from_status: b.status, to_status: 'cancelled', changed_by: user.id, note: reason });
    if (prov) await db.from('notifications').insert({ user_id: prov.user_id, title: 'Booking cancelled by customer', body: reason });
  } else if (b.status === 'confirmed') { // paid: needs admin decision (refund policy)
    await db.from('bookings').update({ cancel_requested: true, cancel_reason: reason }).eq('id', b.id);
    const { data: admins } = await db.from('profiles').select('id').eq('role', 'admin');
    if (admins?.length) await db.from('notifications').insert(admins.map((a: any) => ({ user_id: a.id, title: 'Cancellation request', body: 'Review in Admin → Refunds' })));
    if (prov) await db.from('notifications').insert({ user_id: prov.user_id, title: 'Customer requested cancellation', body: reason });
  }
  revalidatePath('/account/bookings');
}
/* ---------- reviews, support, notifications ---------- */
export async function submitReview(fd: FormData) {
  const { sb, user } = await requireUser();
  const p = z.object({ bookingId: z.string().uuid(), rating: z.coerce.number().int().min(1).max(5), comment: z.string().max(1000).optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  const { data: b } = await sb.from('bookings').select('vehicle_id').eq('id', p.data.bookingId).eq('customer_id', user.id).eq('status', 'completed').maybeSingle();
  if (!b) return;
  await sb.from('reviews').insert({ booking_id: p.data.bookingId, customer_id: user.id, vehicle_id: b.vehicle_id, rating: p.data.rating, comment: p.data.comment ?? null });
  revalidatePath('/account/bookings');
}
export async function createTicket(fd: FormData) {
  const { sb, user } = await requireUser();
  const p = z.object({ subject: z.string().min(3).max(150), message: z.string().min(5).max(2000) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  await sb.from('support_tickets').insert({ user_id: user.id, ...p.data });
  revalidatePath('/help');
}
export async function adminReplyTicket(fd: FormData) {
  const { user } = await requireAdmin(); const db = supabaseAdmin(); const id = String(fd.get('id'));
  const status = String(fd.get('status')); if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) return;
  const reply = String(fd.get('reply') ?? '').slice(0, 2000);
  const { data: t } = await db.from('support_tickets').update({ status, admin_reply: reply || null }).eq('id', id).select().single();
  if (t && reply) await db.from('notifications').insert({ user_id: t.user_id, title: 'Support replied', body: t.subject });
  await db.from('audit_logs').insert({ actor_id: user.id, action: 'ticket_updated', entity: 'support_tickets', entity_id: id });
  revalidatePath('/admin/support');
}
export async function markNotificationsRead() {
  const { sb, user } = await requireUser();
  await sb.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
  revalidatePath('/notifications');
}

/* ---------- promotions ---------- */
export async function adminToggleFeatured(fd: FormData) {
  const { user } = await requireAdmin(); const id = String(fd.get('id')); const on = fd.get('on') === '1';
  await supabaseAdmin().from('vehicles').update({ is_featured: on }).eq('id', id);
  await supabaseAdmin().from('audit_logs').insert({ actor_id: user.id, action: on ? 'featured_on' : 'featured_off', entity: 'vehicles', entity_id: id });
  revalidatePath('/admin/promotions');
}

/* ---------- manual payments: plan request -> WhatsApp ---------- */
export async function requestPlan(fd: FormData) {
  const { user, provider } = await requireProvider();
  if (!provider || !paidPlansOpen() || fd.get('consent') !== 'on') return;
  if (!(await allow('planreq', 6, 3600, user.id))) return;
  const r = await createPlanRequest({ providerId: provider.id, planId: String(fd.get('planId')), businessName: provider.business_name, email: user.email ?? '' });
  if (!r) return;
  if (r.url) redirect(r.url); // opens WhatsApp with the message already typed
  redirect('/provider/membership?req=1');
}
export async function cancelPlanRequest(fd: FormData) {
  const { provider } = await requireProvider(); if (!provider) return;
  const db = supabaseAdmin();
  const { data: tx } = await db.from('subscription_transactions').select('id, status, subscription_id, subscriptions(provider_id)').eq('id', String(fd.get('tx'))).maybeSingle();
  if (!tx || tx.status !== 'pending' || (tx as any).subscriptions?.provider_id !== provider.id) return;
  await db.from('subscription_transactions').update({ status: 'cancelled' }).eq('id', tx.id);
  await db.from('subscriptions').update({ status: 'cancelled' }).eq('id', tx.subscription_id).eq('status', 'past_due');
  revalidatePath('/provider/membership');
}
