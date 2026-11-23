# Going live: ROOVO as a website

## 1. Accounts
GitHub (free) · Supabase · Vercel · a domain name · optional: Resend (email), UptimeRobot (monitoring).

## 2. Put the code on GitHub (Mac)
In Terminal inside the project folder: `xcode-select --install` once if Git is missing, then
`git init`, `git add .`, `git commit -m "ROOVO first version"`, `git branch -M main`,
create an empty PRIVATE repo on github.com, then `git remote add origin https://github.com/YOUR-REAL-USERNAME/roovo.git` and `git push -u origin main`. `.env.local` must NOT appear on GitHub.

## 3. Production database
Create a separate Supabase project for production (Mumbai region). SQL Editor: run `supabase/ALL_MIGRATIONS.sql` once. Authentication → URL Configuration: Site URL = your live address; Redirect URLs: add the live address followed by /** . Turn email confirmation ON. For real users use the Pro plan (the Free plan pauses a project after a week of low activity).

## 4. Deploy on Vercel
Import the GitHub repo. Add Environment Variables from `.env.example` (all of them; use production values). Deploy. Then set `NEXT_PUBLIC_SITE_URL` to your live address and redeploy. Create the admin: run `npm run create-admin` on your Mac with the PRODUCTION Supabase keys in `.env.local` (keep a separate local file for dev), then log in at /admin-login. Vercel's free Hobby plan is for non-commercial use: use Pro for the real launch.

## 5. Custom domain
Vercel → Settings → Domains → add your domain and copy the DNS records it shows into your domain registrar. HTTPS is automatic. Update Supabase Site URL/Redirect URLs to the domain.

## 6. Plan payments (manual: WhatsApp + UPI)
There is no online checkout. Providers pick a plan, WhatsApp opens with a typed request to your number, you send a UPI QR, and after you SEE the money in your bank/UPI app you click "Payment received: activate" in Admin > Plan payments.
1. Set in Vercel > Environment Variables: `WHATSAPP_NUMBER` (country code + digits), `UPI_ID`, `UPI_NAME`, plus `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_GSTIN`, `SUPPORT_EMAIL`, `SUPPORT_PHONE`. Redeploy.
2. Test once on the live site with your own provider account.
3. Use a business bank/UPI account, keep records, and ask your CA about GST on membership fees. The receipt page is a payment receipt, not a GST tax invoice.
See docs/MANUAL-PAYMENTS.md for the daily routine.

## 7. Keeping it running
No server runs on your Mac in production: Vercel runs the code on demand, Supabase runs the database. Use paid plans for real users, set every environment variable, and add an uptime monitor on `https://YOUR-DOMAIN/api/health` (returns 200 when app and database answer). Set spend alerts. Load-test before a big launch and launch in waves.

## 8. Before the public launch
Fill and legally review Terms, Privacy and Refund pages · trademark check for "ROOVO" · decide support email/phone · test every flow on a real phone's browser (the site is mobile-friendly and can be added to the home screen).
