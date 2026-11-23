import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireProvider } from '@/lib/auth';
import { getPlan } from '@/lib/plan';
import FileDrop from '@/components/FileDrop';
import SubmitButton from '@/components/SubmitButton';
import { uploadVehicleImage, deleteVehicleImage, uploadVehicleDoc, addBlock, removeBlock } from '@/app/actions2';
const fmt = (r: string) => { const m = String(r).match(/["\[(]*([\d-]+[ T][\d:]+)[^,]*,\s*"?([\d-]+[ T][\d:]+)/); return m ? `${new Date(m[1].replace(' ', 'T') + 'Z').toLocaleString('en-IN')} → ${new Date(m[2].replace(' ', 'T') + 'Z').toLocaleString('en-IN')}` : r; };
export default async function ManageVehicle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { sb, provider } = await requireProvider();
  if (!provider) notFound();
  const { data: v } = await sb.from('vehicles').select('*').eq('id', id).eq('provider_id', provider.id).maybeSingle();
  if (!v) notFound();
  const canBlock = !!(await getPlan(provider.id))?.membership_plans?.features?.dashboard;
  const [{ data: imgs }, { data: docs }, { data: blocks }] = await Promise.all([
    sb.from('vehicle_images').select('*').eq('vehicle_id', id).order('sort_order'),
    sb.from('vehicle_documents').select('*').eq('vehicle_id', id),
    sb.from('vehicle_availability').select('*').eq('vehicle_id', id)]);
  const url = (p: string) => sb.storage.from('vehicle-images').getPublicUrl(p).data.publicUrl;
  return (<div className="space-y-6"><Link href="/provider" className="text-sm text-brand-600 underline">← Back</Link>
    <h1 className="text-2xl font-bold">{v.title} <span className="text-sm font-normal text-subtle">({v.status})</span></h1>
    <section className="card space-y-3"><h2 className="font-semibold">Photos</h2>
      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">{imgs?.map((i: any) => (<div key={i.id} className="space-y-1">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={url(i.storage_path)} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
        <form action={deleteVehicleImage}><input type="hidden" name="vehicleId" value={id} /><input type="hidden" name="id" value={i.id} /><button className="text-xs text-red-300 underline">Remove</button></form></div>))}</div>
      <form action={uploadVehicleImage} className="space-y-3"><input type="hidden" name="vehicleId" value={id} />
        <FileDrop name="file" accept="image/jpeg,image/png,image/webp" multiple maxFiles={8} required hint="Up to 8 photos at once · JPG, PNG or WebP · we shrink them for you" />
        <SubmitButton pendingText="Uploading photos…">Upload photos</SubmitButton></form>
      <p className="text-xs text-subtle">JPG, PNG or WebP, max 5 MB. The first photo is the cover image.</p></section>
    <section className="card space-y-3"><h2 className="font-semibold">Vehicle documents (private; reviewed by admin)</h2>
      {docs?.map((d: any) => <p key={d.id} className="text-sm">{d.doc_type}{d.expires_on && ` · expires ${d.expires_on}`}: <b>{d.status}</b>{d.reviewer_notes && ` (${d.reviewer_notes})`}</p>)}
      <form action={uploadVehicleDoc} className="space-y-3"><input type="hidden" name="vehicleId" value={id} />
        <div className="grid gap-3 sm:grid-cols-2"><label><span className="label">Document type</span><select name="doc_type" className="input"><option value="rc">Registration certificate (RC)</option><option value="insurance">Insurance</option><option value="puc">PUC</option><option value="fitness">Fitness certificate</option><option value="permit">Permit</option><option value="other">Other</option></select></label><label><span className="label">Expiry date (optional)</span><input type="date" name="expires_on" className="input" /></label></div>
        <FileDrop name="file" accept=".pdf,.jpg,.jpeg,.png" required hint="PDF, JPG or PNG · up to 4 MB" />
        <SubmitButton pendingText="Uploading…">Upload document</SubmitButton></form>
      <p className="text-xs text-subtle">Uploading documents does not make a vehicle verified. Our team reviews them first.</p></section>
    <section className="card space-y-3"><h2 className="font-semibold">Availability: block dates</h2>
      {blocks?.map((b: any) => (<div key={b.id} className="flex items-center justify-between text-sm"><span>{fmt(b.blocked_period)}{b.reason && ` · ${b.reason}`}</span>
        <form action={removeBlock}><input type="hidden" name="vehicleId" value={id} /><input type="hidden" name="id" value={b.id} /><button className="text-xs text-red-300 underline">Remove</button></form></div>))}
      {!blocks?.length && <p className="text-sm text-subtle">No blocked dates. Customers can book any free slot.</p>}
      {!canBlock && <p className="rounded bg-amber-500/10 p-2 text-sm text-amber-200">The availability calendar is part of the Professional and Premium plans. <a href="/provider/membership" className="underline">View plans</a></p>}
      <form action={addBlock} className="grid gap-2 md:grid-cols-4" style={canBlock ? undefined : { display: 'none' }}><input type="hidden" name="vehicleId" value={id} /><input type="datetime-local" name="start" required className="input" /><input type="datetime-local" name="end" required className="input" /><input name="reason" placeholder="Reason (maintenance…)" className="input" /><button className="btn">Block</button></form>
      <p className="text-xs text-subtle">You can't block time that overlaps an already confirmed booking.</p></section></div>);
}
