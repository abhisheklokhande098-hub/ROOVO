import Link from 'next/link';
import { waLink } from '@/lib/manualPayments';
import { company } from '@/lib/company';
export const metadata = { title: 'Contact us | ROOVO' };
export default function Contact() {
  const wa = process.env.WHATSAPP_NUMBER ? waLink(process.env.WHATSAPP_NUMBER, 'Hello ROOVO team') : null;
  return (<div className="mx-auto max-w-2xl space-y-5">
    <h1 className="font-display text-3xl font-extrabold">Contact us</h1>
    <p className="text-muted">Questions about a booking, your listing, your membership or your account? Reach us here, or use the Help page when you are logged in so we can see your account.</p>
    <div className="card space-y-3 text-sm">
      <div><p className="label">Business</p><p className="font-bold">{company.name}</p></div>
      <div><p className="label">Address</p><p className="whitespace-pre-line">{company.address}</p></div>
      {company.email && <div><p className="label">Email</p><a href={`mailto:${company.email}`} className="font-bold text-brand-700 underline">{company.email}</a></div>}
      {company.phone && <div><p className="label">Phone</p><a href={`tel:${company.phone.replace(/\s/g, '')}`} className="font-bold">{company.phone}</a></div>}
      {wa && <div><p className="label">WhatsApp</p><a href={wa} target="_blank" rel="noreferrer" className="font-bold text-brand-700 underline">Chat with us on WhatsApp</a></div>}
      <div><p className="label">Support hours</p><p>{company.hours}</p></div>
    </div>
    <p className="text-sm text-muted">Complaints: see the grievance section of our <Link href="/terms#grievance" className="font-bold text-brand-700 underline">Terms of Service</Link>. Logged-in users can also <Link href="/help" className="font-bold text-brand-700 underline">open a support ticket</Link>.</p>
  </div>);
}
