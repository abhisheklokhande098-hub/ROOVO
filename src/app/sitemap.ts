import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const pages: MetadataRoute.Sitemap = ['', '/vehicles', '/terms', '/privacy', '/refund-policy', '/contact', '/pricing', '/about'].map((p) => ({ url: base + p, changeFrequency: 'weekly' }));
  try {
    const { data } = await supabaseAdmin().from('vehicles').select('id, created_at').eq('status', 'verified').limit(5000);
    return [...pages, ...(data ?? []).map((v: any) => ({ url: `${base}/vehicles/${v.id}`, lastModified: v.created_at as string }))];
  } catch { return pages; }
}
