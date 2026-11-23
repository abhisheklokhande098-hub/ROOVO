// Business details shown on the legal pages, Contact page and receipts. Set them in environment variables (see .env.example).
const month = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
export const company = {
  name: process.env.COMPANY_NAME || 'ROOVO',
  address: process.env.COMPANY_ADDRESS || 'Pune, Maharashtra, India',
  email: process.env.SUPPORT_EMAIL || '',
  phone: process.env.SUPPORT_PHONE || '',
  hours: process.env.SUPPORT_HOURS || 'Mon–Sat, 10 am to 6 pm IST',
  grievanceName: process.env.GRIEVANCE_OFFICER_NAME || '',
  grievanceEmail: process.env.GRIEVANCE_OFFICER_EMAIL || process.env.SUPPORT_EMAIL || '',
  updated: process.env.LEGAL_LAST_UPDATED || month,
  gst: process.env.PRICES_INCLUDE_GST === 'true' ? 'inclusive' : 'exclusive',
};
export const emailText = company.email || 'the email address on our Contact page';
