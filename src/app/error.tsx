'use client';
import Link from 'next/link';
import { useEffect } from 'react';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (<div className="mx-auto max-w-md py-16 text-center"><p className="text-5xl" aria-hidden="true">🛠️</p>
    <h1 className="mt-3 font-display text-2xl font-extrabold">Something went wrong on our side</h1>
    <p className="mt-2 text-muted">This is not your fault. Please try again in a moment. If it keeps happening, tell us from the Help page{error.digest ? ` and mention code ${error.digest}` : ''}.</p>
    <div className="mt-5 flex justify-center gap-2"><button onClick={reset} className="btn">Try again</button><Link href="/" className="btn-ghost">Go to home</Link></div></div>);
}
