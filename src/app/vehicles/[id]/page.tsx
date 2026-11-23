import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import Icon from '@/components/Icon';
import BookingForm from './BookingForm';
export default async function VehiclePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params; const sp = await searchParams; const sb = await supabaseServer();
  const { data: v } = await sb.from('vehicles').select('*, vehicle_categories(name), provider_profiles(business_name,address,status), vehicle_images(storage_path,sort_order)').eq('id', id).eq('status', 'verified').maybeSingle();
  if (!v) notFound();
  const { data: reviews } = await sb.from('reviews').select('rating,comment,created_at').eq('vehicle_id', id).order('created_at', { ascending: false }).limit(10);
  const avg = reviews?.length ? (reviews.reduce((a: number, r: any) => a + r.rating, 0) / reviews.length).toFixed(1) : null;
  const imgs = [...(v.vehicle_images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order).map((i: any) => sb.storage.from('vehicle-images').getPublicUrl(i.storage_path).data.publicUrl);
  const specs = [['Fuel', v.fuel_type], ['Transmission', v.transmission], ['Seats', v.seats], ['Model year', v.year]].filter(([, x]) => x);
  return (<div className="space-y-4"><Link href="/vehicles" className="inline-flex items-center gap-1 text-sm font-bold text-brand-700">‹ All vehicles</Link>
    <div className="grid gap-8 md:grid-cols-[1fr_360px]"><div className="space-y-6">
      {imgs.length ? (<div className="grid gap-2 md:grid-cols-3 md:grid-rows-2">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={imgs[0]} alt={v.title} className="aspect-[4/3] w-full rounded-2xl object-cover md:col-span-2 md:row-span-2 md:h-full" />
        {imgs.slice(1, 3).map((u: string) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={u} src={u} alt="" className="hidden aspect-[4/3] w-full rounded-2xl object-cover md:block" />)}</div>)
        : <div className="grid aspect-[16/8] place-items-center rounded-2xl bg-brand-50 text-7xl" aria-hidden="true">🚗</div>}
      <div className="space-y-2"><div className="flex flex-wrap gap-1.5"><span className="chip">{v.vehicle_categories?.name}</span>{avg && <span className="chip bg-amber-500/15 text-amber-200">★ {avg} ({reviews?.length})</span>}</div>
        <h1 className="font-display text-3xl font-extrabold leading-tight">{v.title}</h1></div>
      {!!specs.length && <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">{specs.map(([k, val]) => <div key={k as string} className="rounded-2xl border border-line bg-surface p-3"><dt className="text-xs font-semibold text-subtle">{k}</dt><dd className="font-display text-lg font-bold">{val}</dd></div>)}</dl>}
      {v.description && <p className="max-w-prose whitespace-pre-line leading-7 text-muted">{v.description}</p>}
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-canvas"><Icon name="shield" size={18} /></span>
        <div className="text-sm"><p className="font-bold">{v.provider_profiles?.business_name}</p><p className="text-muted">{v.provider_profiles?.address}</p><p className="mt-1 text-xs text-subtle">Documents reviewed by our team. The rental agreement, handover and permits are handled by the provider.</p></div></div>
      <section><h2 className="mb-2 font-display text-xl font-bold">Reviews</h2>{reviews?.length ? <div className="space-y-2">{reviews.map((r: any, i: number) => <div key={i} className="rounded-2xl border border-line bg-surface p-3 text-sm"><p className="text-amber-500" aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>{r.comment && <p className="mt-1">{r.comment}</p>}</div>)}</div> : <p className="text-sm text-subtle">No reviews yet. Be the first after your trip.</p>}</section>
    </div>
    <aside className="card h-fit space-y-3 md:sticky md:top-24"><span className="plate text-2xl">₹{Number(v.price_per_day).toLocaleString('en-IN')}<small>/day</small></span>
      {Number(v.security_deposit) > 0 && <p className="text-sm text-muted">Security deposit ₹{Number(v.security_deposit).toLocaleString('en-IN')}, paid directly to the provider.</p>}
      <BookingForm vehicleId={v.id} start={sp.start} end={sp.end} perDay={Number(v.price_per_day)} perHour={v.price_per_hour ? Number(v.price_per_hour) : null} deposit={Number(v.security_deposit)} /></aside></div></div>);
}
