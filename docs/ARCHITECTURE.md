# ROOVO: architecture in brief
Website only (no native app). Next.js 16 (App Router) + TypeScript + Tailwind; Supabase (Postgres, Auth, Storage) with Row Level Security; hosted on Vercel.
- Roles: customer, provider, admin (profiles.role). Only admins can change roles or verify providers/vehicles (DB triggers + server checks).
- Bookings: customer requests → provider accepts (= confirmed). Customers pay providers directly; the platform holds no rental money. A GiST exclusion constraint stops overlapping confirmed bookings.
- Revenue: provider memberships (Basic free, Professional, Premium). A provider taps a plan, is redirected to WhatsApp, pays by UPI, and an admin confirms and activates the plan for 30 days. No online payment, nothing renews automatically; a daily cron sends reminders and moves expired plans to Basic.
- Plan perks enforced in code: listing limit, availability calendar, analytics, search ranking, Premium featured badge.
- Safety: rate limiting (database), audit logs, private document storage, terms acceptance recorded (profiles.terms_accepted_at).
- Key folders: src/app (pages + server actions), src/lib (auth, pricing, payments, plan, notify), supabase/migrations (SQL), scripts/create-admin.mjs.
