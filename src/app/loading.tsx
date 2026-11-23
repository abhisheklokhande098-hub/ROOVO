export default function Loading() {
  return (<div role="status" aria-label="Loading" className="space-y-5"><div className="skeleton h-10 w-60" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-72" />)}</div></div>);
}
