import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import Icon from '@/components/Icon';
import Swoosh from '@/components/Swoosh';
import Reveal from '@/components/Reveal';

const EMOJI: Record<string, string> = { hatchback: '🚗', sedan: '🚘', suv: '🚙', luxury: '🏎️', electric: '⚡', 'bike-scooter': '🛵', 'tempo-traveller': '🚐', commercial: '🚚', other: '🧰' };

export default async function Home() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (user) { const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single(); if (me?.role === 'provider') redirect('/provider'); }
  const { data: cats } = await sb.from('vehicle_categories').select('*').eq('is_active', true).order('sort_order');
  return (<div className="space-y-16">
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-brand-900/60 px-5 py-12 md:px-14 md:py-20">
      <div className="orb -right-24 -top-24 h-80 w-80 bg-[#FE8C2B]/30" /><div className="orb -bottom-28 left-10 h-72 w-72 bg-[#DF4466]/25 [animation-delay:-4s]" />
      <Swoosh className="pointer-events-none absolute -right-10 top-8 hidden w-[62%] opacity-50 md:block" />
      <div className="relative">
        <p className="chip mb-5 [animation:fadeUp_.6s_var(--ease)_both]">Pune · cars, bikes and vans</p>
        <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] [animation:fadeUp_.7s_var(--ease)_.08s_both] md:text-6xl">Rent a ride from <span className="gradient-text">local owners</span> in Pune.</h1>
        <p className="mt-4 max-w-xl text-lg text-muted [animation:fadeUp_.7s_var(--ease)_.16s_both]">Choose your dates, send a request, and pay the owner directly. We charge no booking fee.</p>
        <form action="/vehicles" className="panel-raised mt-9 grid gap-3 [animation:fadeUp_.8s_var(--ease)_.26s_both] md:grid-cols-[1.1fr_1fr_1fr_1.1fr_auto] md:items-end">
          <label><span className="label">What do you need?</span><select name="category" className="input"><option value="">Any vehicle</option>{cats?.map((c: any) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></label>
          <label><span className="label">Pickup</span><input type="datetime-local" name="start" className="input" /></label>
          <label><span className="label">Return</span><input type="datetime-local" name="end" className="input" /></label>
          <label><span className="label">Make or model</span><input name="q" placeholder="e.g. Swift, Activa" className="input" /></label>
          <button className="btn md:min-h-[46px]"><Icon name="search" size={18} />Find vehicles</button>
        </form>
      </div>
    </section>

    <Reveal><section><h2 className="mb-5 font-display text-2xl font-extrabold">What do you need?</h2>
      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">{cats?.map((c: any) => (
        <Link key={c.id} href={`/vehicles?category=${c.slug}`} className="lift flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 font-bold">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-2xl" aria-hidden="true">{EMOJI[c.slug] ?? '🚗'}</span><span className="leading-tight">{c.name}</span></Link>))}</div></section></Reveal>

    <Reveal><section className="grid gap-6 md:grid-cols-3">
      {[['shield', 'Owners checked by our team', 'We review each rental business’s documents before it can list a vehicle.'],
        ['tag', 'Pay the owner directly', 'There is no online payment and no booking fee on ROOVO.'],
        ['key', 'The owner confirms your booking', 'Send a request. When the owner accepts, you arrange pickup together.']].map(([icon, t, d], i) => (
        <Reveal key={t} delay={i * 110}><div className="card h-full space-y-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-grad text-canvas shadow-[0_10px_24px_-10px_rgb(246_113_57/0.8)]"><Icon name={icon} size={20} /></span>
          <h3 className="font-display text-lg font-bold">{t}</h3><p className="text-sm text-muted">{d}</p></div></Reveal>))}
    </section></Reveal>

    <Reveal><section className="relative overflow-hidden rounded-[2rem] p-px bg-grad">
      <div className="relative flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-[calc(2rem-1px)] bg-canvas p-7 md:p-10">
        <div className="orb -right-16 -top-16 h-56 w-56 bg-[#FE8C2B]/25" />
        <div className="relative"><h2 className="font-display text-2xl font-extrabold md:text-3xl">Own a rental business?</h2><p className="mt-2 max-w-xl text-muted">List your vehicles, receive booking requests, and manage everything from one dashboard. Verified providers can try the Professional features free for a trial period.</p></div>
        <Link href="/register?as=provider" className="btn relative">List your vehicles</Link>
      </div></section></Reveal>
  </div>);
}
