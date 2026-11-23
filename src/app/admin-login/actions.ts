'use server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { allow } from '@/lib/rateLimit';

export async function adminLogin(_: any, fd: FormData) {
  if (!(await allow('adminlogin', 6, 600))) return { error: 'Too many attempts. Please wait a few minutes.' };
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signInWithPassword({ email: String(fd.get('email')), password: String(fd.get('password')) });
  const generic = { error: 'Invalid credentials, or this account has no admin access.' };
  if (error || !data.user) return generic;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', data.user.id).single();
  if (profile?.role !== 'admin') { await sb.auth.signOut(); return generic; }
  redirect('/admin');
}
