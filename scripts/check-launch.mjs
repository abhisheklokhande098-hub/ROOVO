// Launch readiness check. Run:  npm run check-launch            (reads .env.local)
//                              npm run check-launch -- .env.production.local
import fs from 'node:fs';
const file = process.argv[2] || '.env.local';
const env = {};
if (fs.existsSync(file)) for (const l of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
else console.log(`(${file} not found: checking nothing in it)`);
let bad = 0, warn = 0;
const ok = (m) => console.log('  OK      ' + m), no = (m) => { bad++; console.log('  MISSING ' + m); }, wn = (m) => { warn++; console.log('  CHECK   ' + m); };
console.log(`\nLaunch check using ${file}\n`);
for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET']) env[k] ? ok(k) : no(k);
const site = env.NEXT_PUBLIC_SITE_URL || ''; /^https:\/\//.test(site) && !site.includes('localhost') ? ok('NEXT_PUBLIC_SITE_URL is your live https address') : no('NEXT_PUBLIC_SITE_URL must be your live https address (not localhost)');
for (const k of ['COMPANY_NAME', 'COMPANY_ADDRESS', 'SUPPORT_EMAIL', 'SUPPORT_PHONE', 'GRIEVANCE_OFFICER_NAME']) env[k] ? ok(k + ' (shown on legal pages)') : no(k + ' (shown on legal pages)');
const wa = (env.WHATSAPP_NUMBER || '').replace(/\D/g, ''); wa.length >= 10 ? ok('WHATSAPP_NUMBER') : no('WHATSAPP_NUMBER');
env.UPI_ID ? ok('UPI_ID') : wn('UPI_ID empty: no ready-made QR in Admin (only needed when paid plans are open)');
env.COMPANY_GSTIN ? ok('COMPANY_GSTIN') : wn('COMPANY_GSTIN empty (fine if you are not GST-registered yet; ask your CA)');
env.RESEND_API_KEY && env.EMAIL_FROM ? ok('Email notifications configured') : wn('RESEND_API_KEY / EMAIL_FROM empty: no emails for bookings or verification');
env.LEGAL_REVIEWED === 'true' ? ok('LEGAL_REVIEWED=true (draft banner hidden)') : wn('LEGAL_REVIEWED is not true: legal pages still show a DRAFT banner. Set it after a lawyer reviews them.');
console.log(env.PAID_PLANS_OPEN === 'true' ? '  INFO    PAID_PLANS_OPEN=true: providers can request paid plans. Be sure your business bank/UPI account is ready.' : '  INFO    PAID_PLANS_OPEN is not true: paid plans show "opening soon" (good for a pilot launch).');
// leftover [placeholders] in the public pages
const pages = ['terms', 'privacy', 'refund-policy', 'about', 'pricing', 'contact'];
let found = 0;
for (const p of pages) { const f = `src/app/${p}/page.tsx`; if (!fs.existsSync(f)) continue;
  fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => { if (/import |export |const |=>/.test(line) && !/<p|<li|<h2|<div/.test(line)) return;
    for (const m of line.matchAll(/\[[A-Za-z][^\]\[]{3,200}\]/g)) { if (/string\[\]|\[0\]|\[id\]/.test(m[0])) continue; found++; console.log(`  PLACEHOLDER ${f}:${i + 1}  ${m[0].slice(0, 70)}`); } }); }
found ? (bad += found) : ok('no [placeholders] left in legal and info pages');
console.log(`\n${bad ? bad + ' item(s) to fix before launch. ' : 'All required items are set. '}${warn ? warn + ' to double-check.' : ''}\n`);
process.exit(bad ? 1 : 0);
