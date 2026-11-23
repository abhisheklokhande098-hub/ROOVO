import LegalPage from '@/components/LegalPage';
import { company, emailText } from '@/lib/company';
export const metadata = { title: 'Privacy Policy | ROOVO' };
export default function Privacy() {
  return (<LegalPage title="Privacy Policy">
    <p>Last updated: {company.updated}. {company.name} (“we”) explains here how we handle personal data, in line with applicable Indian law including the Digital Personal Data Protection Act, 2023.</p>
    <h2 className="font-semibold">What we collect</h2><p>Account details (name, email, phone), booking details, payment status (we do not store card numbers; payments are handled by our payment gateway), documents that rental providers upload for verification, support messages, and technical data such as device and log information.</p>
    <h2 className="font-semibold">Why we use it</h2><p>To run bookings and payments, verify providers and vehicles, prevent fraud, send service messages, provide support, and meet legal duties. We do not sell your data or use it for third-party advertising. We may send you service messages about your account and bookings.</p>
    <h2 className="font-semibold">Who we share it with</h2><p>The rental provider for your booking (name, contact, booking details); our payment gateway; hosting and email services we use (Supabase for the database and file storage, Vercel for hosting, and an email delivery service); and authorities where the law requires.</p>
    <h2 className="font-semibold">Storage and security</h2><p>Provider documents are stored privately and visible only to the uploading provider and our administrators. We keep data for as long as needed for these purposes and legal requirements (for as long as your account is active and for up to three years afterwards for legal, tax and dispute purposes, unless the law requires longer).</p>
    <h2 className="font-semibold">Your rights</h2><p>You can ask to access, correct or delete your data by writing to {emailText}. Grievance Officer: {company.grievanceName || 'see the Contact page'}{company.grievanceEmail ? ` (${company.grievanceEmail})` : ''}.</p>
  </LegalPage>);
}
