// Brings .env.local up to date with .env.example WITHOUT touching values you already have.
//   npm run setup-env
//   npm run setup-env -- WHATSAPP_NUMBER=919876543210 UPI_ID=yourname@bank UPI_NAME=ROOVO
import fs from 'node:fs';
import crypto from 'node:crypto';

const target = '.env.local';
const example = fs.readFileSync('.env.example', 'utf8');
let lines = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').split(/\r?\n/) : [];
if (lines.length && lines[lines.length - 1] === '') lines.pop();
const keyOf = (l) => (l.match(/^\s*([A-Z0-9_]+)\s*=/) || [])[1];
const valueOf = (l) => l.slice(l.indexOf('=') + 1).trim();
const idx = (k) => lines.findIndex((l) => keyOf(l) === k);

const overrides = {};
for (const a of process.argv.slice(2)) { const i = a.indexOf('='); if (i > 0) overrides[a.slice(0, i)] = a.slice(i + 1); }

const added = [], updated = [];
for (const l of example.split(/\r?\n/)) {
  const k = keyOf(l); if (!k) continue;
  if (idx(k) === -1) { lines.push(`${k}=${l.slice(l.indexOf('=') + 1)}`); added.push(k); }
}
for (const [k, v] of Object.entries(overrides)) {
  const i = idx(k);
  if (i === -1) { lines.push(`${k}=${v}`); added.push(k); } else { lines[i] = `${k}=${v}`; updated.push(k); }
}
const ci = idx('CRON_SECRET');
if (ci !== -1 && !valueOf(lines[ci])) { lines[ci] = `CRON_SECRET=${crypto.randomBytes(24).toString('hex')}`; added.push('CRON_SECRET (random value created)'); }

fs.writeFileSync(target, lines.join('\n') + '\n');

const get = (k) => { const i = idx(k); return i === -1 ? '' : valueOf(lines[i]); };
console.log(`\n.env.local checked.${added.length ? '\n  Added:   ' + added.join(', ') : ''}${updated.length ? '\n  Updated: ' + updated.join(', ') : ''}`);
const needed = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'WHATSAPP_NUMBER'];
const missing = needed.filter((k) => !get(k));
if (missing.length) console.log('\n  STILL EMPTY (fill these in .env.local):\n   - ' + missing.join('\n   - '));
const wa = get('WHATSAPP_NUMBER').replace(/\D/g, '');
if (wa && wa.length === 10) console.log('\n  Note: WHATSAPP_NUMBER has 10 digits, so the site will assume India (+91). Best to write it as 91' + wa);
else if (wa && (wa.length < 11 || wa.length > 15)) console.log('\n  WARNING: WHATSAPP_NUMBER does not look right: use country code + number, digits only.');
if (!get('UPI_ID')) console.log('\n  Optional: UPI_ID is empty, so ready-made payment QR codes will not be shown in Admin.');
const old = ['PAYMENT_PROVIDER', 'PAYMENT_WEBHOOK_SECRET', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'NEXT_PUBLIC_RAZORPAY_KEY_ID', 'ALLOW_SANDBOX_PAYMENTS'].filter((k) => idx(k) !== -1);
if (old.length) console.log('\n  No longer used (you can delete these lines): ' + old.join(', '));
console.log('\nNow stop the server (Ctrl+C) and run: npm run dev\n');
