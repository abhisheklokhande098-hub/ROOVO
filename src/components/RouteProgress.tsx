'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
/** Thin gradient bar at the top that runs while a page is loading. */
export default function RouteProgress() {
  const pathname = usePathname(); const search = useSearchParams(); const key = pathname + '?' + search.toString();
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  useEffect(() => { // the page changed: finish the bar
    setState((s) => (s === 'loading' ? 'done' : s));
    const t = setTimeout(() => setState('idle'), 700); return () => clearTimeout(t);
  }, [key]);
  useEffect(() => {
    let safety: ReturnType<typeof setTimeout>;
    function onClick(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest('a'); if (!a || e.defaultPrevented) return;
      const href = a.getAttribute('href'); if (!href || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || (/^https?:\/\//.test(href) && !href.startsWith(location.origin))) return;
      if (href === location.pathname + location.search) return;
      setState('loading'); clearTimeout(safety); safety = setTimeout(() => setState('idle'), 12000);
    }
    document.addEventListener('click', onClick); return () => { document.removeEventListener('click', onClick); clearTimeout(safety); };
  }, []);
  return <div className={`route-progress ${state === 'idle' ? '' : state}`} aria-hidden="true" />;
}
