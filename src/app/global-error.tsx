'use client';
// Last-resort screen if the whole app shell fails (for example a missing environment variable).
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (<html lang="en"><body style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1rem', background: '#F2F5F3', color: '#15221E' }}>
    <h1>ROOVO is taking a short break</h1><p>Something went wrong. Please try again in a moment.</p>
    <button onClick={reset} style={{ marginTop: 16, padding: '12px 24px', borderRadius: 999, border: 0, background: '#17624E', color: '#fff', fontWeight: 700, fontSize: 16 }}>Try again</button></body></html>);
}
