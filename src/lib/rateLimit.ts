import { headers } from 'next/headers';
import { supabaseAdmin } from './supabase/admin';
/** true = allowed. Fails OPEN if the limiter itself errors, so a database hiccup never locks everyone out. */
export async function allow(name: string, max: number, windowSec: number, extra = '') {
  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const { data, error } = await supabaseAdmin().rpc('rate_limit_hit', { p_key: `${name}:${ip}:${extra}`, p_max: max, p_window: windowSec });
  return error ? true : data === true;
}
