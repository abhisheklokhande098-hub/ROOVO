import './globals.css';
import Link from 'next/link';
import { Suspense } from 'react';
import { Sora, Figtree } from 'next/font/google';
import { supabaseServer } from '@/lib/supabase/server';
import { signOut } from './actions';
import Logo from '@/components/Logo';
import RegisterSW from '@/components/RegisterSW';
import RouteProgress from '@/components/RouteProgress';
import { TopNav, BottomNav, type NavItem } from '@/components/NavLinks';

const display = Sora({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Figtree({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
export const viewport = { themeColor: '#030409' };
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'ROOVO: rent cars, bikes & vans in Pune',
  description: 'Book cars, bikes, scooters and vans from local rental businesses in Pune. Send a request, pay the owner directly, no booking fee.',
  openGraph: { title: 'ROOVO: rent cars, bikes & vans in Pune', description: 'Book vehicles from local rental businesses in Pune. No booking fee.', siteName: 'ROOVO', locale: 'en_IN', type: 'website' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  let role = 'customer';
  if (user) { const { data } = await sb.from('profiles').select('role').eq('id', user.id).single(); role = data?.role ?? 'customer'; }
  const alerts: NavItem = { href: '/notifications', label: 'Alerts', icon: 'bell' };
  const help: NavItem = { href: '/help', label: 'Help', icon: 'help' };
  const items: NavItem[] = !user
    ? [{ href: '/vehicles', label: 'Browse', icon: 'search' }, help, { href: '/login', label: 'Log in', icon: 'user' }]
    : role === 'provider'
      ? [{ href: '/provider', label: 'Dashboard', icon: 'grid', exact: true }, { href: '/provider/analytics', label: 'Analytics', icon: 'chart' }, { href: '/provider/membership', label: 'Plan', icon: 'card' }, alerts, help]
      : role === 'admin'
        ? [{ href: '/admin', label: 'Admin', icon: 'shield', exact: true }, { href: '/vehicles', label: 'Browse', icon: 'search' }, alerts, help]
        : [{ href: '/', label: 'Home', icon: 'home', exact: true }, { href: '/vehicles', label: 'Browse', icon: 'search' }, { href: '/account/bookings', label: 'Bookings', icon: 'calendar' }, alerts, help];
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}><body>
      <Suspense fallback={null}><RouteProgress /></Suspense>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-canvas/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <Link href={role === 'provider' ? '/provider' : role === 'admin' ? '/admin' : '/'} aria-label="ROOVO home"><Logo height={38} className="transition-transform duration-300 hover:scale-[1.04]" /></Link>
          <TopNav items={items} />
          <span className="flex-1" />
          {user ? (<form action={signOut}><button className="btn-ghost btn-sm">Sign out</button></form>)
            : (<><Link href="/login" className="btn-ghost btn-sm hidden sm:inline-flex">Log in</Link><Link href="/register" className="btn btn-sm">Sign up</Link></>)}
        </div>
      </header>
      <main className="mx-auto min-h-[70vh] max-w-6xl px-4 pb-28 pt-6 md:pb-12">{children}</main>
      <RegisterSW />
      <footer className="border-t border-white/10 bg-canvas/60 pb-28 pt-10 text-xs text-subtle md:pb-10">
        <div className="mx-auto max-w-6xl space-y-2 px-4">
          <p className="flex flex-wrap gap-x-5 gap-y-1 font-semibold"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/refund-policy">Refund policy</Link><Link href="/about">About</Link><Link href="/pricing">Pricing</Link><Link href="/contact">Contact</Link><Link href="/help">Help</Link></p>
          <p className="max-w-3xl">ROOVO is a marketplace. Vehicles are supplied and operated by independent rental businesses. “Verified” means our team has reviewed the documents submitted; it is not a government approval.</p>
        </div>
      </footer>
      <BottomNav items={items} />
    </body></html>
  );
}
