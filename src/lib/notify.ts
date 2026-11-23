import { supabaseAdmin } from './supabase/admin';
import { renderEmail } from './emailTemplate';
/** In-app notification always; a branded email too when RESEND_API_KEY and EMAIL_FROM are set (EMAIL_FROM must be a verified sender). `link` is a site path like "/provider". */
export async function notify(userId: string, title: string, body = '', link?: string) {
  const db = supabaseAdmin();
  await db.from('notifications').insert({ user_id: userId, title, body });
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) return;
  try {
    const { data } = await db.auth.admin.getUserById(userId);
    const to = data.user?.email; if (!to) return;
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
    const url = site ? site + (link ?? '/') : undefined;
    await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: title, html: renderEmail({ title, body, ctaUrl: url }), text: `${title}\n\n${body}\n\n${url ?? ''}` }),
    });
  } catch { /* email problems must never break a booking */ }
}
