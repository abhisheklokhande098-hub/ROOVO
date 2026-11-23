'use client';
import { useActionState } from 'react';
import { adminLogin } from './actions';
export default function AdminLogin() {
  const [state, action, pending] = useActionState(adminLogin, null as any);
  return (
    <form action={action} className="card mx-auto mt-10 max-w-sm space-y-4">
      <h1 className="font-display text-2xl font-extrabold">Admin login</h1>
      <label><span className="label">Admin email</span><input name="email" type="email" autoComplete="username" required className="input" /></label>
      <label><span className="label">Password</span><input name="password" type="password" autoComplete="current-password" required className="input" /></label>
      {state?.error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-300">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? 'Checking…' : 'Log in'}</button>
    </form>
  );
}
