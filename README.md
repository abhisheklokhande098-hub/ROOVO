# ROOVO: vehicle rental marketplace (website)

## Run it on your Mac (MacBook, Apple silicon)
1. **Install Node.js**: download the "LTS" macOS installer from https://nodejs.org and run it (or `brew install node` if you use Homebrew). Check in Terminal: `node -v` shows v20.9 or newer.
2. **Install VS Code** from https://code.visualstudio.com. Optional: Cmd+Shift+P → "Shell Command: Install 'code' command in PATH".
3. **Open this folder**: unzip roovo-website.zip, then in VS Code choose File → Open Folder and pick the `roovo` folder (the one containing `package.json`).
4. **Open the terminal in VS Code** (Terminal → New Terminal) and run: `npm install`
5. **Supabase** (https://supabase.com): create a project (region: Mumbai). Open SQL Editor → New query → paste ALL of `supabase/ALL_MIGRATIONS.sql` → Run. (Reusing an existing project that already has the tables? Run only `supabase/migrations/0006_terms_acceptance.sql` plus any numbered file you never ran.)
6. **Keys**: in the terminal run `cp .env.example .env.local`, open `.env.local` in VS Code and fill in the three Supabase values (Project Settings → API Keys): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Then run `npm run setup-env -- WHATSAPP_NUMBER=919876543210 UPI_ID=yourname@bank` (your own WhatsApp number with country code and your UPI ID). It adds any missing lines to `.env.local`, creates `CRON_SECRET` for you, and tells you what is still empty. No spaces around `=`, no quotes. Restart `npm run dev` after any change.
7. **Start**: `npm run dev`, then open http://localhost:3000
8. **Create your admin account** (use your own email and a long password):
   `ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a-long-password-here" npm run create-admin`
   Log in at http://localhost:3000/admin-login. The admin dashboard is at /admin.
9. **Check it builds** (do this before deploying): `npm run build`

## Try the whole flow
Provider account: sign up (tick the Terms box) → "List your vehicles" → submit business → admin verifies it at /admin (starts a 30-day Professional trial) → provider adds a vehicle + photos → admin verifies the vehicle → customer account requests a booking → provider accepts (booking is confirmed; customer pays the provider directly) → provider marks handed over / returned → customer reviews.
Plan payment (manual): Provider → Plan → choose a paid plan → WhatsApp opens with the request typed → as admin open Admin → Plan payments, send the QR, and after you see the money click "Payment received: activate" → the plan activates and a Receipt link appears.

## Where things are
`src/app` pages and server actions · `src/lib` shared logic · `supabase/migrations` SQL · `docs/DEPLOYMENT.md` going live · `/terms`, `/privacy`, `/refund-policy` are DRAFT templates: fill the [BRACKETS] and have a lawyer review them before launch.
