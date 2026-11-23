import Link from 'next/link';
import { company } from '@/lib/company';
export const metadata = { title: 'About ROOVO' };
export default function About() {
  return (<div className="mx-auto max-w-2xl space-y-4">
    <h1 className="font-display text-3xl font-extrabold">About ROOVO</h1>
    <p className="leading-7 text-muted">ROOVO helps people in Pune find cars, bikes, scooters and vans from local rental businesses. You compare vehicles, send a request for your dates, and pay the owner directly. We charge customers no booking fee.</p>
    <p className="leading-7 text-muted">For rental businesses, ROOVO is a simple way to be found online, manage requests and keep a calendar of bookings, with plans that start free. Our team reviews each business’s documents before it can list a vehicle.</p>
    <p className="leading-7 text-muted">ROOVO is built in Pune, for Pune. We want renting a vehicle from a trusted local business to be as easy as booking a table: clear prices, real owners, and no surprises.</p>
    <div className="flex gap-2"><Link href="/vehicles" className="btn">Browse vehicles</Link><Link href="/pricing" className="btn-ghost">For rental businesses</Link></div>
    <p className="text-sm text-subtle">Operated by {company.name}, {company.address}. See <Link href="/contact" className="underline">Contact</Link>.</p></div>);
}
