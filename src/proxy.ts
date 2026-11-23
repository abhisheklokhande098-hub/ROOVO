import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
type CookieToSet = { name: string; value: string; options?: any };

// Next.js 16 calls this file "proxy" (it used to be "middleware"). It refreshes the login session and guards private pages.
export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: CookieToSet[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await sb.auth.getUser();
  const p = req.nextUrl.pathname;
  const isAdminPath = p === '/admin' || p.startsWith('/admin/');
  const needsLogin = isAdminPath || ['/account', '/provider', '/help', '/notifications'].some((x) => p.startsWith(x));
  if (needsLogin && !user) {
    const url = req.nextUrl.clone();
    url.pathname = isAdminPath ? '/admin-login' : '/login';
    url.search = '';
    if (!isAdminPath) url.searchParams.set('next', p);
    return NextResponse.redirect(url);
  }
  return res;
}
// skip static files (anything with a dot), Next internals, cron and the health check
export const config = { matcher: ['/((?!_next|api/cron|api/health|.*\\..*).*)'] };
