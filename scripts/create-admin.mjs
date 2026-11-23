// Creates (or repairs) the admin account. Run from the project folder:
//   PowerShell:  $env:ADMIN_EMAIL="you@example.com"; $env:ADMIN_PASSWORD="your-long-password"; node --env-file=.env.local scripts/create-admin.mjs
import { createClient } from '@supabase/supabase-js';

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
if (!url || !key) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1); }
if (!email || !password) { console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD first (see the comment at the top of this file).'); process.exit(1); }
if (password.length < 12) { console.error('Use a password of at least 12 characters.'); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false } });
let userId;
const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (error) {
  // user probably exists already: find it and reset its password
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const u = list?.users?.find((x) => x.email?.toLowerCase() === email.toLowerCase());
  if (!u) { console.error('Could not create user:', error.message); process.exit(1); }
  userId = u.id;
  const { error: e2 } = await db.auth.admin.updateUserById(userId, { password, email_confirm: true });
  if (e2) { console.error('Could not update password:', e2.message); process.exit(1); }
  console.log('User already existed: password reset and email confirmed.');
} else {
  userId = created.user.id;
  console.log('User created.');
}
const { error: pe } = await db.from('profiles').upsert({ id: userId, role: 'admin', full_name: 'Admin' }, { onConflict: 'id' });
if (pe) { console.error('Could not set admin role:', pe.message, '(did you run 0001_schema.sql and 0002_rls.sql?)'); process.exit(1); }
console.log(`Done. ${email} is now an admin. Log in at /login (or /admin-login), then open /admin.`);
