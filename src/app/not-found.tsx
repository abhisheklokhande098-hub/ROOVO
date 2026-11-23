import Link from 'next/link';
export default function NotFound() {
  return (<div className="mx-auto max-w-md py-16 text-center"><p className="text-5xl" aria-hidden="true">🧭</p>
    <h1 className="mt-3 font-display text-2xl font-extrabold">We couldn’t find that page</h1>
    <p className="mt-2 text-muted">The link may be old, or the vehicle may no longer be listed.</p>
    <div className="mt-5 flex justify-center gap-2"><Link href="/vehicles" className="btn">Browse vehicles</Link><Link href="/" className="btn-ghost">Go to home</Link></div></div>);
}
