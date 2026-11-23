import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const EMOJI: Record<string, string> = { hatchback: '🚗', sedan: '🚘', suv: '🚙', luxury: '🏎️', electric: '⚡', 'bike-scooter': '🛵', 'tempo-traveller': '🚐', commercial: '🚚', other: '🧰' };

function FilterForm({ sp, cats }: { sp: Record<string, string | undefined>; cats: any[] | null }) {
  return (<form className="space-y-3">
    <label><span className="label">Vehicle type</span><select name="category" defaultValue={sp.category ?? ''} className="input"><option value="">All types</option>{cats?.map((c: any) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></label>
    <label><span className="label">Pickup</span><input type="datetime-local" name="start" defaultValue={sp.start} className="input" /></label>
    <label><span className="label">Return</span><input type="datetime-local" name="end" defaultValue={sp.end} className="input" /></label>
    <div className="grid grid-cols-2 gap-2"><label><span className="label">Min ₹/day</span><input name="min" inputMode="numeric" defaultValue={sp.min} className="input" /></label><label><span className="label">Max ₹/day</span><input name="max" inputMode="numeric" defaultValue={sp.max} className="input" /></label></div>
    <label><span className="label">Fuel</span><select name="fuel" defaultValue={sp.fuel ?? ''} className="input"><option value="">Any fuel</option>{['Petrol', 'Diesel', 'Electric', 'CNG', 'Hybrid'].map((f) => <option key={f}>{f}</option>)}</select></label>
    <label><span className="label">Sort by</span><select name="sort" defaultValue={sp.sort ?? ''} className="input"><option value="">Price: low to high</option><option value="price_desc">Price: high to low</option></select></label>
    <div className="flex gap-2"><button className="btn flex-1">Show results</button><Link href="/vehicles" className="btn-ghost">Clear</Link></div>
  </form>);
}

export default async function Vehicles({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams; const sb = await supabaseServer();
  const { data: cats } = await sb.from('vehicle_categories').select('*').order('sort_order');
  let q = sb.from('vehicles').select('*, vehicle_categories!inner(slug,name), provider_profiles(business_name,plan_rank), vehicle_images(storage_path,sort_order)').eq('status', 'verified');
  if (sp.category) q = q.eq('vehicle_categories.slug', sp.category);
  if (sp.min) q = q.gte('price_per_day', Number(sp.min));
  if (sp.max) q = q.lte('price_per_day', Number(sp.max));
  if (sp.fuel) q = q.eq('fuel_type', sp.fuel);
  if (sp.q) q = q.or(`title.ilike.%${sp.q.replace(/[%,()]/g, '')}%,make.ilike.%${sp.q.replace(/[%,()]/g, '')}%,model.ilike.%${sp.q.replace(/[%,()]/g, '')}%`);
  const sort = sp.sort === 'price_desc' ? ['price_per_day', false] : ['price_per_day', true];
  let { data: vehicles } = await q.order('is_featured', { ascending: false }).order(sort[0] as string, { ascending: sort[1] as boolean }).limit(60);
  if (sp.start && sp.end && vehicles?.length) { // availability filter
    const s = new Date(sp.start).toISOString(), e = new Date(sp.end).toISOString(); const db = supabaseAdmin(); const ids = vehicles.map((v: any) => v.id);
    const { data: busy } = await db.from('bookings').select('vehicle_id').in('vehicle_id', ids).in('status', ['confirmed', 'handed_over']).lt('start_at', e).gt('end_at', s);
    const { data: blocked } = await db.from('vehicle_availability').select('vehicle_id').in('vehicle_id', ids).overlaps('blocked_period', `[${s},${e})`);
    const out = new Set([...(busy ?? []), ...(blocked ?? [])].map((r: any) => r.vehicle_id));
    vehicles = vehicles.filter((v: any) => !out.has(v.id));
  }
  const asc = sp.sort !== 'price_desc'; const top = (v: any) => Number(!!v.is_featured || v.provider_profiles?.plan_rank === 2);
  vehicles = [...(vehicles ?? [])].sort((a: any, b: any) => (top(b) - top(a)) || ((b.provider_profiles?.plan_rank ?? 0) - (a.provider_profiles?.plan_rank ?? 0)) || (asc ? 1 : -1) * (Number(a.price_per_day) - Number(b.price_per_day)));
  const img = (v: any) => { const p = [...(v.vehicle_images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.storage_path;
    return p ? sb.storage.from('vehicle-images').getPublicUrl(p).data.publicUrl : null; };
  const keep = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && ['start', 'end'].includes(k)) as any).toString();
  return (<div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-2"><h1 className="font-display text-3xl font-extrabold">Find a vehicle</h1><p className="text-sm font-semibold text-subtle">{vehicles?.length ?? 0} available</p></div>
    <div className="grid gap-6 md:grid-cols-[250px_1fr]">
      <aside className="self-start">
        <details className="card md:hidden"><summary className="cursor-pointer font-bold">Filters and dates</summary><div className="mt-3"><FilterForm sp={sp} cats={cats} /></div></details>
        <div className="card hidden md:block"><h2 className="mb-3 font-display text-lg font-bold">Filters</h2><FilterForm sp={sp} cats={cats} /></div>
      </aside>
      <div className="stagger grid content-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles?.length === 0 && (<div className="card col-span-full py-12 text-center"><p className="text-4xl" aria-hidden="true">🔍</p><h2 className="mt-2 font-display text-xl font-bold">No vehicles match yet</h2><p className="mt-1 text-sm text-muted">Try different dates, a wider price range, or another vehicle type.</p><Link href="/vehicles" className="btn mt-4">Clear filters</Link></div>)}
        {vehicles?.map((v: any) => (<Link key={v.id} href={`/vehicles/${v.id}${keep ? '?' + keep : ''}`} className="lift flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="relative aspect-[4/3] bg-brand-50">
            {img(v) ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={img(v)!} alt={v.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-6xl" aria-hidden="true">{EMOJI[v.vehicle_categories?.slug] ?? '🚗'}</div>}
            {(v.is_featured || v.provider_profiles?.plan_rank === 2) && <span className="absolute left-3 top-3 rounded-full bg-grad px-2.5 py-1 text-xs font-extrabold text-canvas">Featured</span>}
            <span className="plate absolute bottom-3 left-3">₹{Number(v.price_per_day).toLocaleString('en-IN')}<small>/day</small></span>
          </div>
          <div className="space-y-2 p-4"><h3 className="font-display text-lg font-bold leading-tight">{v.title}</h3><p className="text-sm text-subtle">{v.provider_profiles?.business_name}</p>
            <div className="flex flex-wrap gap-1.5"><span className="chip">{v.vehicle_categories?.name}</span>{v.fuel_type && <span className="chip">{v.fuel_type}</span>}{v.transmission && <span className="chip">{v.transmission}</span>}{v.seats && <span className="chip">{v.seats} seats</span>}</div></div>
        </Link>))}
      </div></div></div>);
}
