import LegalPage from '@/components/LegalPage';
import { company, emailText } from '@/lib/company';
export const metadata = { title: 'Cancellation & Refund Policy | ROOVO' };
export default function Refund() {
  return (<LegalPage title="Cancellation & Refund Policy">
    <p>Last updated: {company.updated}.</p>
    <h2 className="font-semibold">Customers</h2><p>You can cancel a booking request or a confirmed booking from “My bookings”. ROOVO does not collect rental payments or deposits: you pay the rental provider directly. Any advance, deposit or refund for a rental is therefore agreed with, and handled by, the provider under their rental agreement.</p>
    <h2 className="font-semibold">If a provider cancels</h2><p>If a provider cancels a confirmed booking, you should receive back everything you paid them. Tell us through Help if this does not happen. We will help you contact the provider and record your complaint against the provider’s account, which can lead to the provider’s suspension.</p>
    <h2 className="font-semibold">Provider membership fees</h2><p>Membership fees are paid to ROOVO through our payment gateway for a 30-day period and do not renew automatically. Fees are not refundable once a plan is active, except where the law requires otherwise or where a payment was made twice or a plan was not activated after we received your payment. Contact {emailText} for billing problems.</p>
    <h2 className="font-semibold">Refund timelines</h2><p>When a membership refund is approved, it is returned to the original payment method; banks usually take [5–7] working days.</p>
  </LegalPage>);
}
