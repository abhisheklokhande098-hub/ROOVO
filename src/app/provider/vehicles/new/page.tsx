import { requireProvider } from '@/lib/auth';
import { addVehicle } from '@/app/actions';
export default async function NewVehicle() {
  const { sb, provider } = await requireProvider();
  if (provider?.status !== 'verified') return <p>Your business must be verified before you can list vehicles.</p>;
  const { data: cats } = await sb.from('vehicle_categories').select('id,name').order('sort_order');
  return (<form action={addVehicle} className="card mx-auto max-w-lg space-y-3"><h1 className="text-xl font-bold">Add vehicle</h1>
    <input name="title" placeholder="Title (e.g. Maruti Swift VXi 2022)" required className="input" />
    <select name="category_id" required className="input">{cats?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
    <input name="registration_no" placeholder="Registration number" required className="input" />
    <div className="grid grid-cols-2 gap-2"><input name="price_per_day" type="number" min="1" placeholder="₹ per day" required className="input" /><input name="price_per_hour" type="number" min="0" placeholder="₹ per hour (optional)" className="input" />
      <input name="security_deposit" type="number" min="0" placeholder="Refundable deposit ₹" className="input" /><input name="seats" type="number" min="1" placeholder="Seats" className="input" />
      <select name="fuel_type" className="input"><option value="">Fuel</option>{['Petrol', 'Diesel', 'Electric', 'CNG', 'Hybrid'].map((f) => <option key={f}>{f}</option>)}</select>
      <select name="transmission" className="input"><option value="">Transmission</option><option>Manual</option><option>Automatic</option></select></div>
    <textarea name="description" className="input" placeholder="Description" />
    <p className="text-xs text-subtle">The vehicle goes live only after admin review of its documents. Image/document upload UI is a TODO (see README).</p>
    <button className="btn">Submit for review</button></form>);
}
