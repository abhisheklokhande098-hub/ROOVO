'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';
export type NavItem = { href: string; label: string; icon: string; exact?: boolean };
const useOn = () => { const p = usePathname(); return (i: NavItem) => (i.exact ? p === i.href : p === i.href || p.startsWith(i.href + '/')); };

export function TopNav({ items }: { items: NavItem[] }) {
  const on = useOn();
  return (<div className="hidden items-center gap-1 md:flex">{items.map((i) => (
    <Link key={i.href} href={i.href} aria-current={on(i) ? 'page' : undefined}
      className={`relative rounded-full px-3.5 py-2 text-sm font-bold transition-colors duration-300 ${on(i) ? 'text-ink' : 'text-muted hover:text-ink'}`}>{on(i) && <span className="absolute inset-0 -z-0 rounded-full bg-white/10 [animation:fadeUp_.3s_var(--ease)_both]" />}{on(i) && <span className="absolute inset-x-4 -bottom-0.5 h-[2px] rounded-full bg-grad" />}<span className="relative">{i.label}</span></Link>))}</div>);
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const on = useOn();
  return (<nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-canvas/85 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
    <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>{items.map((i) => (
      <Link key={i.href} href={i.href} aria-current={on(i) ? 'page' : undefined}
        className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold transition ${on(i) ? 'text-brand-700' : 'text-subtle'}`}>
        {on(i) && <span className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-grad shadow-[0_0_12px_rgb(246_113_57/0.8)]" />}
        <Icon name={i.icon} size={22} />{i.label}</Link>))}</div></nav>);
}
