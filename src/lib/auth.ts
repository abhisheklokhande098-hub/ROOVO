import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase/server';
export async function requireUser() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
  return { sb, user, profile };
}
export async function requireAdmin() {
  const ctx = await requireUser();
  if (ctx.profile?.role !== 'admin') redirect('/');
  return ctx;
}
export async function requireProvider() {
  const ctx = await requireUser();
  const { data: provider } = await ctx.sb.from('provider_profiles').select('*').eq('user_id', ctx.user.id).maybeSingle();
  return { ...ctx, provider };
}
