const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Branded HTML email (inline styles so it works in Gmail, Outlook and phones). */
export function renderEmail(o: { title: string; body?: string; ctaLabel?: string; ctaUrl?: string }) {
  const company = process.env.COMPANY_NAME || 'ROOVO';
  const btn = o.ctaUrl ? `<tr><td style="padding:8px 28px 28px"><a href="${esc(o.ctaUrl)}" style="display:inline-block;background:#FE8C2B;color:#0B0C10;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px">${esc(o.ctaLabel ?? 'Open ROOVO')}</a></td></tr>` : '';
  return `<!doctype html><html><body style="margin:0;background:#F2F5F3;font-family:Arial,Helvetica,sans-serif;color:#15221E">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2F5F3;padding:24px 12px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #D8E1DC">
<tr><td style="background:#030409;border-bottom:3px solid #F67139;padding:18px 28px;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:1px">ROOVO</td></tr>
<tr><td style="padding:28px 28px 8px;font-size:20px;font-weight:700;line-height:1.3">${esc(o.title)}</td></tr>
${o.body ? `<tr><td style="padding:0 28px 20px;font-size:15px;line-height:1.6;color:#334155">${esc(o.body).replace(/\n/g, '<br>')}</td></tr>` : ''}
${btn}
<tr><td style="background:#F2F5F3;padding:16px 28px;font-size:12px;color:#64748B">${esc(company)} · Pune, Maharashtra. You received this because you have an account on ROOVO.</td></tr>
</table></td></tr></table></body></html>`;
}
