'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useActionState } from 'react';
import { login, register } from '@/app/actions';
import Logo from './Logo';
import Swoosh from './Swoosh';
export default function AuthForm({ mode, next, notice }: { mode: 'login' | 'register'; next?: string; notice?: string }) {
  const [state, action, pending] = useActionState(mode === 'login' ? login : register, null as any);
  const [show, setShow] = useState(false);
  const isLogin = mode === 'login';
  return (<div className="mx-auto grid max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-surface md:grid-cols-[1fr_1.1fr]">
    <div className="relative hidden overflow-hidden bg-brand-900 p-8 md:flex md:flex-col md:justify-between">
      <div className="orb -left-16 -top-16 h-64 w-64 bg-[#FE8C2B]/30" /><div className="orb -bottom-20 -right-10 h-64 w-64 bg-[#DF4466]/25 [animation-delay:-3s]" />
      <Logo height={46} className="relative" />
      <div className="relative"><Swoosh className="mb-6 w-full opacity-60" /><h2 className="font-display text-3xl font-extrabold leading-tight">{isLogin ? 'Good to see you again.' : 'Your next ride is a few taps away.'}</h2>
        <p className="mt-3 text-muted">{isLogin ? 'Log in to manage your bookings or your rental business.' : 'Create a free account to request vehicles from local owners, or to list your own.'}</p></div>
    </div>
    <form action={action} className="space-y-4 p-6 md:p-9">
      <div className="md:hidden"><Logo height={34} /></div>
      <h1 className="font-display text-2xl font-extrabold">{isLogin ? 'Log in' : 'Create your account'}</h1>
      {notice && <p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300">{notice}</p>}
      {!isLogin && <label><span className="label">Full name</span><input name="name" autoComplete="name" required className="input" /></label>}
      <label><span className="label">Email</span><input name="email" type="email" autoComplete="email" required className="input" /></label>
      <label><span className="label">Password</span><span className="relative block"><input name="password" type={show ? 'text' : 'password'} autoComplete={isLogin ? 'current-password' : 'new-password'} required minLength={8} className="input pr-16" />
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute inset-y-0 right-3 my-auto h-8 rounded-full px-2 text-xs font-bold text-brand-700 hover:text-ink">{show ? 'Hide' : 'Show'}</button></span></label>
      {!isLogin && <p className="-mt-2 text-xs text-subtle">Use at least 8 characters.</p>}
      {isLogin && <Link href="/forgot-password" className="-mt-2 block text-sm font-bold text-brand-700 underline">Forgot password?</Link>}
      {!isLogin && (<label className="flex items-start gap-2 text-sm"><input type="checkbox" name="terms" required className="mt-1 h-4 w-4 accent-[#FE8C2B]" /><span>I agree to the <Link href="/terms" target="_blank" className="font-bold text-brand-700 underline">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="font-bold text-brand-700 underline">Privacy Policy</Link>.</span></label>)}
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-300">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? (<><span className="spinner" aria-hidden="true" />Please wait…</>) : isLogin ? 'Log in' : 'Create account'}</button>
      <p className="text-center text-sm text-muted">{isLogin ? <>New here? <Link href="/register" className="font-bold text-brand-700 underline">Create an account</Link></> : <>Already registered? <Link href="/login" className="font-bold text-brand-700 underline">Log in</Link></>}</p>
    </form></div>);
}
