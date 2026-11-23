export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (<article className="mx-auto max-w-3xl space-y-4 text-sm leading-6">
    {process.env.LEGAL_REVIEWED !== 'true' && <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-200">DRAFT: this page has not yet been reviewed by a lawyer.</p>}
    <h1 className="text-2xl font-bold">{title}</h1>{children}</article>);
}
