'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireUser, requireProvider, requireAdmin } from '@/lib/auth';
import { computePricing } from '@/lib/pricing';
import { revalidatePath } from 'next/cache';
import { allow } from '@/lib/rateLimit';
import { notify } from '@/lib/notify';
import { syncPlanRank } from '@/lib/plan';
import { TERMS_VERSION } from '@/lib/terms';
import { createPlanRequest } from '@/lib/manualPayments';
import { paidPlansOpen } from '@/lib/flags';

export async function signOut() { const sb = await supabaseServer(); await sb.auth.signOut(); redirect('/'); }

export async function login(_: any, fd: FormData) {
  if (!(await allow('login', 8, 600))) return { error: 'Too many attempts. Please wait a few minutes and try again.' };
  const sb = await supabaseServer();
  const { data: auth, error } = await sb.auth.signInWithPassword({ email: String(fd.get('email')), password: String(fd.get('password')) });
  if (error) return { error: error.message };
  const { data: me } = await sb.from('profiles').select('role').eq('id', auth.user.id).single();
  const nx = String(fd.get('next') || ''); const safe = nx.startsWith('/') && !nx.startsWith('//') ? nx : '';
  if (me?.role === 'admin') redirect(safe.startsWith('/admin') ? safe : '/admin');
  if (me?.role === 'provider') redirect(['/provider', '/notifications', '/help'].some((p) => safe.startsWith(p)) ? safe : '/provider');
  redirect(safe || '/');
}
export async function register(_: any, fd: FormData) {
  if (!(await allow('register', 5, 3600))) return { error: 'Too many sign-ups from this network. Try again later.' };
  const p = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(2) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: 'Enter a valid name, email and a password of 8+ characters.' };
  if (fd.get('terms') !== 'on') return { error: 'Please accept the Terms of Service and Privacy Policy to continue.' };
  const sb = await supabaseServer();
  const { error } = await sb.auth.signUp({ email: p.data.email, password: p.data.password, options: { emailRedirectTo: `${(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')}/login?confirmed=1`, data: { full_name: p.data.name, terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION } } });
  if (error) return { error: error.message };
  const rn = String(fd.get('next') || '');
  redirect('/login?registered=1' + (rn.startsWith('/provider') ? `&next=${encodeURIComponent(rn)}` : ''));
}

/* ---------- booking request (customer) ---------- */
export async function requestBooking(_: any, fd: FormData) {
  const { sb, user } = await requireUser();
  if (!(await allow('booking', 10, 3600, user.id))) return { error: 'Too many booking requests. Please try again later.' };
  const { data: me } = await sb.from('profiles').select('is_blocked').eq('id', user.id).single();
  if (me?.is_blocked) return { error: 'Your account cannot make bookings. Please contact support.' };
  const p = z.object({ vehicleId: z.string().uuid(), start: z.string(), end: z.string(), notes: z.string().max(500).optional(), phone: z.string().regex(/^[0-9+() -]{8,18}$/) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: 'Invalid booking details.' };
  const start = new Date(p.data.start), end = new Date(p.data.end);
  if (isNaN(+start) || isNaN(+end) || end <= start || start < new Date()) return { error: 'Choose a future pickup and a later return time.' };
  const { data: v } = await sb.from('vehicles').select('*').eq('id', p.data.vehicleId).eq('status', 'verified').single();
  if (!v) return { error: 'Vehicle not available.' };
  const period = `[${start.toISOString()},${end.toISOString()})`;
  const db = supabaseAdmin();
  const { count: clash } = await db.from('bookings').select('id', { count: 'exact', head: true }).eq('vehicle_id', v.id).in('status', ['confirmed', 'handed_over']).lt('start_at', end.toISOString()).gt('end_at', start.toISOString());
  const { count: blocked } = await db.from('vehicle_availability').select('id', { count: 'exact', head: true }).eq('vehicle_id', v.id).overlaps('blocked_period', period);
  if (clash || blocked) return { error: 'Sorry, this vehicle is not available for those dates.' };
  const price = computePricing({ start, end, perDay: Number(v.price_per_day), perHour: v.price_per_hour ? Number(v.price_per_hour) : null, deposit: Number(v.security_deposit) });
  const { data: b, error } = await sb.from('bookings').insert({
    customer_id: user.id, vehicle_id: v.id, provider_id: v.provider_id, start_at: start.toISOString(), end_at: end.toISOString(),
    rental_amount: price.rental, deposit_amount: price.deposit, price_breakdown: price, customer_notes: p.data.notes ?? null, customer_phone: p.data.phone,
  }).select('id').single();
  if (error) return { error: 'Could not create booking.' };
  await db.from('booking_status_history').insert({ booking_id: b.id, to_status: 'requested', changed_by: user.id });
  const { data: prov } = await db.from('provider_profiles').select('user_id').eq('id', v.provider_id).single();
  if (prov) await notify(prov.user_id, 'New booking request', v.title);
  redirect('/account/bookings');
}

/* ---------- provider ---------- */
export async function registerProvider(fd: FormData) {
  const { sb, user } = await requireUser();
  const p = z.object({ business_name: z.string().min(2), address: z.string().min(5), contact_phone: z.string().min(8), gstin: z.string().optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success || fd.get('provider_terms') !== 'on') return;
  const { data: newProv } = await sb.from('provider_profiles').insert({ ...p.data, user_id: user.id, status: 'submitted', provider_terms_accepted_at: new Date().toISOString(), provider_terms_version: TERMS_VERSION }).select('id, business_name').single();
  await supabaseAdmin().from('profiles').update({ role: 'provider' }).eq('id', user.id);
  revalidatePath('/provider');
  const planId = String(fd.get('plan_id') ?? '');
  if (newProv && planId && paidPlansOpen()) { // paid plan chosen at registration: open WhatsApp with the request message
    const r = await createPlanRequest({ providerId: newProv.id, planId, businessName: newProv.business_name, email: user.email ?? '' });
    if (r?.url) redirect(r.url);
  }
}
export async function uploadProviderDoc(fd: FormData) {
  const { sb, user, provider } = await requireProvider();
  const file = fd.get('file') as File; const docType = String(fd.get('doc_type'));
  if (!provider || !file || file.size === 0 || file.size > 4_300_000 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) return;
  const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
  const { error } = await sb.storage.from('provider-docs').upload(path, file, { contentType: file.type });
  if (!error) await sb.from('provider_documents').insert({ provider_id: provider.id, doc_type: docType, storage_path: path });
  revalidatePath('/provider');
}
export async function addVehicle(fd: FormData) {
  const { sb, provider } = await requireProvider();
  if (!provider || provider.status !== 'verified') return;
  const p = z.object({ title: z.string().min(3), category_id: z.string().uuid(), registration_no: z.string().min(4), price_per_day: z.coerce.number().positive(),
    price_per_hour: z.coerce.number().nonnegative().optional(), security_deposit: z.coerce.number().nonnegative().default(0), seats: z.coerce.number().int().positive().optional(),
    fuel_type: z.string().optional(), transmission: z.string().optional(), description: z.string().max(2000).optional() }).safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  const db = supabaseAdmin();
  const { data: sub } = await db.from('subscriptions').select('plan_id, membership_plans(max_vehicles)').eq('provider_id', provider.id).in('status', ['trialing', 'active']).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const max = (sub as any)?.membership_plans?.max_vehicles ?? 3;
  const { count } = await sb.from('vehicles').select('id', { count: 'exact', head: true }).eq('provider_id', provider.id);
  if ((count ?? 0) >= max) return;
  await sb.from('vehicles').insert({ ...p.data, provider_id: provider.id, status: 'submitted' });
  redirect('/provider');
}
export async function respondBooking(fd: FormData) {
  const { provider } = await requireProvider();
  const id = String(fd.get('id')); const accept = fd.get('decision') === 'accept';
  const db = supabaseAdmin();
  const { data: b } = await db.from('bookings').select('*').eq('id', id).single();
  if (!provider || !b || b.provider_id !== provider.id || b.status !== 'requested') return;
  const to = accept ? 'confirmed' : 'rejected';
  // Customers pay the provider directly, so accepting confirms. The database still refuses overlapping confirmed bookings.
  const { error: upErr } = await db.from('bookings').update({ status: to }).eq('id', id);
  if (upErr) { await notify(provider.user_id, 'Could not accept booking', 'It overlaps another confirmed booking for this vehicle.'); revalidatePath('/provider'); return; }
  await db.from('booking_status_history').insert({ booking_id: id, from_status: 'requested', to_status: to, changed_by: provider.user_id });
  await notify(b.customer_id, accept ? 'Booking confirmed' : 'Booking rejected', accept ? 'The provider accepted. Pay them directly as agreed and contact them to arrange pickup. See My bookings.' : 'Open My bookings on the website.');
  revalidatePath('/provider');
}
export async function setBookingProgress(fd: FormData) {
  const { provider } = await requireProvider();
  const id = String(fd.get('id')); const to = String(fd.get('to'));
  const allowed: Record<string, string> = { handed_over: 'confirmed', completed: 'handed_over' };
  const db = supabaseAdmin(); const { data: b } = await db.from('bookings').select('*').eq('id', id).single();
  if (!provider || !b || b.provider_id !== provider.id || allowed[to] !== b.status) return;
  await db.from('bookings').update({ status: to }).eq('id', id);
  await db.from('booking_status_history').insert({ booking_id: id, from_status: b.status, to_status: to, changed_by: provider.user_id });
  revalidatePath('/provider');
}

/* ---------- admin ---------- */
export async function adminReviewProvider(fd: FormData) {
  const { user } = await requireAdmin();
  const id = String(fd.get('id')); const decision = String(fd.get('decision')) as 'verified' | 'rejected' | 'suspended';
  const db = supabaseAdmin();
  const { data: prov } = await db.from('provider_profiles').update({ status: decision, approved_at: decision === 'verified' ? new Date().toISOString() : null }).eq('id', id).select().single();
  if (decision === 'verified' && prov) {
    const { data: existing } = await db.from('subscriptions').select('id').eq('provider_id', id).in('status', ['trialing', 'active', 'expired']).limit(1);
    if (!existing?.length) {
      const { data: plan } = await db.from('membership_plans').select('id').eq('code', 'professional').single();
      const { data: s } = await db.from('platform_settings').select('value').eq('key', 'trial_days').single();
      const days = Number(s?.value ?? 30);
      if (days > 0) await db.from('subscriptions').insert({ provider_id: id, plan_id: plan!.id, status: 'trialing', is_trial: true, current_period_end: new Date(Date.now() + days * 864e5).toISOString() });
    }
  }
  if (prov) await notify(prov.user_id, decision === 'verified' ? 'Your business is verified' : decision === 'rejected' ? 'Your business was not approved' : 'Your account was suspended', decision === 'verified' ? 'You can now list vehicles. Check your plan on the Membership page.' : 'Please contact support if you have questions.', '/provider');
  await syncPlanRank(id);
  await db.from('audit_logs').insert({ actor_id: user.id, action: `provider_${decision}`, entity: 'provider_profiles', entity_id: id });
  revalidatePath('/admin');
}
export async function adminReviewVehicle(fd: FormData) {
  const { user } = await requireAdmin();
  const id = String(fd.get('id')); const decision = String(fd.get('decision'));
  if (!['verified', 'rejected', 'suspended'].includes(decision)) return;
  const db = supabaseAdmin();
  const { data: veh } = await db.from('vehicles').update({ status: decision }).eq('id', id).select('title, provider_profiles(user_id)').single();
  const owner = (veh as any)?.provider_profiles?.user_id;
  if (owner) await notify(owner, decision === 'verified' ? 'Your vehicle is live' : decision === 'rejected' ? 'Your vehicle was not approved' : 'Your vehicle was suspended', String((veh as any).title), '/provider');
  await db.from('audit_logs').insert({ actor_id: user.id, action: `vehicle_${decision}`, entity: 'vehicles', entity_id: id });
  revalidatePath('/admin');
}
export async function adminSetPlanPrice(fd: FormData) {
  const { user } = await requireAdmin();
  const price = Number(fd.get('price')); if (!(price >= 0)) return;
  const db = supabaseAdmin(); await db.from('membership_plans').update({ price_inr_monthly: price }).eq('id', String(fd.get('id')));
  await db.from('audit_logs').insert({ actor_id: user.id, action: 'plan_price_changed', entity: 'membership_plans', entity_id: String(fd.get('id')), details: { price } });
  revalidatePath('/admin');
}
