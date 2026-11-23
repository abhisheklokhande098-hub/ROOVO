'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { allow } from '@/lib/rateLimit';
const site = () => (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export async function requestPasswordReset(_: any, fd: FormData) {
  if (!(await allow('pwreset', 5, 3600))) return { error: 'Too many requests. Please try again later.' };
  const p = z.string().email().safeParse(String(fd.get('email') ?? '').trim());
  if (!p.success) return { error: 'Enter a valid email address.' };
  const sb = await supabaseServer();
  await sb.auth.resetPasswordForEmail(p.data, { redirectTo: `${site()}/auth/callback?next=/reset-password` });
  return { ok: 'If that email has an account, we have sent a reset link. Check your inbox (and spam folder).' }; // same reply whether or not the account exists
}
export async function updatePassword(_: any, fd: FormData) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'This link has expired. Please request a new one.' };
  const pw = String(fd.get('password') ?? '');
  if (pw.length < 8 || pw !== String(fd.get('confirm') ?? '')) return { error: 'Use at least 8 characters, and make both boxes match.' };
  const { error } = await sb.auth.updateUser({ password: pw });
  if (error) return { error: error.message };
  await sb.auth.signOut();
  redirect('/login?reset=1');
}
