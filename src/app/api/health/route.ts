import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
export const dynamic = 'force-dynamic';
// Point an uptime monitor (UptimeRobot / Better Stack) at https://YOUR-DOMAIN/api/health every 1-5 minutes.
export async function GET() {
  const t = Date.now(); const h = { 'Cache-Control': 'no-store' };
  try {
    const { error } = await supabaseAdmin().from('membership_plans').select('id').limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, db: 'up', ms: Date.now() - t }, { headers: h });
  } catch {
    return NextResponse.json({ ok: false, db: 'down' }, { status: 503, headers: h });
  }
}
