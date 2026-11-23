import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import { ResetForm } from '@/components/PasswordForms';
export default async function Page() {
  const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser();
  if (!user) return (<div className="card mx-auto max-w-sm space-y-3 text-center"><h1 className="font-display text-xl font-extrabold">This link has expired</h1><p className="text-sm text-muted">Reset links work once and for a short time.</p><Link href="/forgot-password" className="btn">Request a new link</Link></div>);
  return <ResetForm />;
}
