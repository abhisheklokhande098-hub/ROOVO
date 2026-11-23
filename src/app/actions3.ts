'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
export async function adminSetBlocked(fd: FormData) {
  const { user } = await requireAdmin(); const id = String(fd.get('id')); const block = fd.get('block') === '1';
  if (id === user.id) return; // never lock yourself out
  await supabaseAdmin().from('profiles').update({ is_blocked: block }).eq('id', id).eq('role', 'customer');
  await supabaseAdmin().from('audit_logs').insert({ actor_id: user.id, action: block ? 'customer_blocked' : 'customer_unblocked', entity: 'profiles', entity_id: id });
  revalidatePath('/admin/customers');
}
