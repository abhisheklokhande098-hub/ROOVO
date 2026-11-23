import LegalPage from '@/components/LegalPage';
import { company, emailText } from '@/lib/company';
export const metadata = { title: 'Terms of Service | ROOVO' };

const H = ({ id, children }: { id?: string; children: React.ReactNode }) => <h2 id={id} className="scroll-mt-24 pt-4 font-display text-lg font-bold">{children}</h2>;

export default function Terms() {
  return (<LegalPage title="Terms of Service">
    <p>Last updated: {company.updated}. These Terms govern your use of the ROOVO website and services, operated by {company.name}, {company.address} (“ROOVO”, “we”, “us”). Contact: {emailText}.</p>
    <nav className="rounded-xl bg-brand-50 p-3 text-xs"><b>Jump to:</b> <a className="underline" href="#bookings">Bookings</a> · <a className="underline" href="#customers">Customers</a> · <a className="underline" href="#providers">Providers</a> · <a className="underline" href="#memberships">Memberships and fees</a> · <a className="underline" href="#liability">Liability</a> · <a className="underline" href="#grievance">Grievances</a></nav>

    <H>1. Who we are and what ROOVO does</H>
    <p>ROOVO is an online marketplace that helps customers find and request vehicles offered by independent rental businesses (“Providers”) in and around Pune, Maharashtra. We do not own, operate, insure or maintain any listed vehicle. A rental is an agreement between the customer and the Provider. ROOVO is not a party to that agreement and does not collect or hold rental payments or security deposits.</p>
    <H>2. Accepting these Terms</H>
    <p>By creating an account, requesting a booking, listing a vehicle or buying a membership, you agree to these Terms and to our <a className="underline" href="/privacy">Privacy Policy</a> and <a className="underline" href="/refund-policy">Cancellation & Refund Policy</a>. If you do not agree, do not use ROOVO. We may update these Terms; if a change is significant we will notify you, and continued use after the change means you accept it.</p>
    <H>3. Accounts and eligibility</H>
    <p>You must be at least 18 years old and legally able to enter into a contract in India. Give accurate information and keep it up to date. Keep your password secret and tell us at once if you suspect unauthorised use. You are responsible for activity on your account. One person or business may not run multiple accounts to avoid a suspension or limit.</p>

    <H id="bookings">4. How bookings work</H>
    <ol className="list-decimal space-y-1 pl-5">
      <li>A customer chooses a vehicle and dates and sends a booking request, with a contact number.</li>
      <li>The Provider accepts or rejects the request. A booking is confirmed when the Provider accepts it. We prevent two confirmed bookings from overlapping on the same vehicle.</li>
      <li>The customer pays the Provider directly, in the way agreed with the Provider. ROOVO charges customers no booking fee and does not process rental payments.</li>
      <li>The Provider hands over the vehicle and the parties sign the Provider’s rental agreement. The Provider records the return.</li>
    </ol>
    <p>Prices shown on ROOVO are estimates set by the Provider and may exclude taxes, fuel, tolls, fines, damage or other charges described in the rental agreement. The price and terms in the Provider’s rental agreement prevail over any estimate shown on our site.</p>

    <H id="customers">5. Customers</H>
    <ul className="list-disc space-y-1 pl-5">
      <li>You must hold a valid driving licence for the vehicle category and carry original identity documents the Provider asks for. Providers may refuse a rental if documents are missing or unclear.</li>
      <li>You must use the vehicle lawfully and carefully, follow all traffic and road-safety laws, and not allow anyone who is not authorised under the rental agreement to drive it.</li>
      <li>You are responsible for traffic fines, tolls, parking charges, loss and damage that arise during the rental, as set out in the rental agreement and to the extent the law allows.</li>
      <li>Do not use a vehicle for racing, illegal activity, towing, carrying prohibited goods, or while under the influence of alcohol or drugs.</li>
      <li>Reviews must be honest, based on your own experience, and must not contain abuse, personal data or unlawful content.</li>
    </ul>

    <H id="providers">6. Providers</H>
    <p>These terms apply to anyone who lists vehicles on ROOVO.</p>
    <ul className="list-disc space-y-1 pl-5">
      <li><b>Licences and permits.</b> You confirm that you and each listed vehicle hold every registration, permit, licence, fitness certificate, pollution certificate and insurance policy that the law requires for renting that type of vehicle in Maharashtra, and that you will keep them valid. Requirements differ by vehicle type (for example self-drive cars, two-wheelers, passenger vans and goods vehicles). You are solely responsible for knowing and meeting them.</li>
      <li><b>Verification is a document review only.</b> “Verified” on ROOVO means our team looked at documents you submitted. It is not a government approval, certification or guarantee of legality, condition, roadworthiness or insurance cover, and you must not describe it that way. We may ask for more documents, re-check them, and suspend or remove any listing at any time.</li>
      <li><b>Accurate listings.</b> Photos, prices, specifications, deposits and availability must be accurate. Keep the availability calendar current. Do not list a vehicle you cannot supply.</li>
      <li><b>Your rental business.</b> You alone are responsible for the rental agreement, pricing, deposits and their return, vehicle condition and maintenance, insurance and claims, handover and return checks, taxes and compliance with consumer-protection and other laws, and for any disputes with customers.</li>
      <li><b>Customer data.</b> You may use a customer’s contact details only to arrange and perform that rental and must protect them. Do not sell, share or use them for marketing.</li>
      <li><b>Fair dealing.</b> Treat customers fairly, honour confirmed bookings, and do not discriminate unlawfully.</li>
    </ul>

    <H id="memberships">7. Memberships and fees (Providers)</H>
    <ul className="list-disc space-y-1 pl-5">
      <li><b>Plans.</b> ROOVO offers Basic (free), Professional and Premium plans. Features, listing limits and prices are shown on the Membership page and may change for future periods. Prices are {company.gst} of GST, as shown at checkout.</li>
      <li><b>Free trial.</b> A newly verified Provider receives a free 30-day Professional trial. When the trial ends, the account moves to Basic unless the Provider buys a paid plan. We never charge you automatically.</li>
      <li><b>Paying.</b> A paid plan is bought for 30 days. You request it on the website, we send you payment instructions (a UPI QR code) on WhatsApp, and the plan starts when we confirm that we have received your payment. It does not renew automatically; we send a reminder before it ends and you choose whether to renew.</li>
      <li><b>When a plan ends.</b> Features above your current plan switch off and the account returns to Basic. Existing bookings are not affected, but listings above the Basic limit may be hidden until you renew or remove vehicles.</li>
      <li><b>Changing plans.</b> If you buy a different plan during a paid period, the new plan starts at once and the earlier plan ends; unused days are not credited.</li>
      <li><b>Refunds.</b> See the Cancellation & Refund Policy. Membership fees are not refundable once a plan has been activated, except where the law requires otherwise, or where a payment was made twice or a plan was not activated after we received your payment.</li>
      <li><b>Receipts and taxes.</b> You can download a payment receipt from the Membership page. You are responsible for your own taxes.</li>
      <li><b>Visibility.</b> Higher plans may rank or highlight your listings more prominently. We do not guarantee any number of views, enquiries or bookings.</li>
    </ul>

    <H>8. Acceptable use</H>
    <p>Do not misuse ROOVO: no fake listings, fake bookings or fake reviews; no attempts to break, overload or scrape the service; no uploading of malicious files or documents you do not have the right to share; no harassment; no use that breaks any law. We may remove content and suspend or end accounts that do.</p>
    <H>9. Content you provide</H>
    <p>You keep ownership of photos, text and other content you upload, and you give ROOVO a non-exclusive, worldwide, royalty-free licence to host, display and promote it on our service for as long as the listing is live. You confirm you have the rights to share it.</p>
    <H>10. Safety and emergencies</H>
    <p>ROOVO is not an emergency service. In an emergency call 112. Report accidents and theft to the police and to the Provider immediately.</p>

    <H id="liability">11. Disclaimers and limits of liability</H>
    <p>ROOVO is provided “as is”. To the fullest extent the law allows, we are not responsible for the conduct of Providers or customers, the condition, legality or insurance of any vehicle, or loss, injury, damage or delay arising from a rental. To the extent the law allows, our total liability to you for any claim connected with the service is limited to the fees you paid to ROOVO in the 12 months before the claim (customers pay ROOVO no fees), and we are not liable for indirect or consequential loss. Nothing in these Terms limits any right you have under Indian consumer-protection law.</p>
    <H>12. Indemnity</H>
    <p>You agree to compensate ROOVO for losses, claims and costs that arise from your breach of these Terms, the content you submit, or your breach of any law or third-party right, to the extent the law allows.</p>
    <H>13. Suspension and ending your account</H>
    <p>You may stop using ROOVO at any time. We may suspend or end your access if you break these Terms, if we must by law, or to protect users. Sections that by their nature should continue (for example payment, liability and disputes) continue after your account ends.</p>
    <H>14. Privacy</H>
    <p>How we handle personal data is explained in our <a className="underline" href="/privacy">Privacy Policy</a>.</p>

    <H id="grievance">15. Complaints and grievance officer</H>
    <p>Write to {company.grievanceName || 'our Grievance Officer'} at {company.grievanceEmail || emailText}, {company.address}. We will acknowledge your complaint within 48 hours and aim to resolve it within 30 days. You can also use the Help page when logged in.</p>
    <H>16. Governing law and disputes</H>
    <p>These Terms are governed by the laws of India. Subject to any rights you have under consumer-protection law, the courts at Pune, Maharashtra have jurisdiction.</p>
    <H>17. General</H>
    <p>If any part of these Terms is unenforceable, the rest remains in force. Our failure to enforce a right is not a waiver. We may transfer our rights to a successor of our business. These Terms, with the Privacy Policy and Refund Policy, are the entire agreement between you and ROOVO about the service.</p>
  </LegalPage>);
}
