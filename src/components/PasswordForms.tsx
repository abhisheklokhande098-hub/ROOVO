'use client';
import { useActionState } from 'react';
import { requestPasswordReset, updatePassword } from '@/app/actions4';
export function ForgotForm() {
  const [s, action, pending] = useActionState(requestPasswordReset, null as any);
  return (<form action={action} className="card mx-auto max-w-sm space-y-4"><h1 className="font-display text-2xl font-extrabold">Forgot your password?</h1>
    <p className="text-sm text-muted">Enter your email and we will send you a link to choose a new one.</p>
    <label><span className="label">Email</span><input name="email" type="email" autoComplete="email" required className="input" /></label>
    {s?.error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-300">{s.error}</p>}
    {s?.ok && <p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300">{s.ok}</p>}
    <button className="btn w-full" disabled={pending}>{pending ? 'Sending…' : 'Send reset link'}</button></form>);
}
export function ResetForm() {
  const [s, action, pending] = useActionState(updatePassword, null as any);
  return (<form action={action} className="card mx-auto max-w-sm space-y-4"><h1 className="font-display text-2xl font-extrabold">Choose a new password</h1>
    <label><span className="label">New password</span><input name="password" type="password" autoComplete="new-password" minLength={8} required className="input" /></label>
    <label><span className="label">Repeat new password</span><input name="confirm" type="password" autoComplete="new-password" minLength={8} required className="input" /></label>
    {s?.error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-300">{s.error}</p>}
    <button className="btn w-full" disabled={pending}>{pending ? 'Saving…' : 'Save new password'}</button></form>);
}
