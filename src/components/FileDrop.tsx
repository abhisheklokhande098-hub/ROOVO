'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Icon from './Icon';

const TOTAL_LIMIT = 4.2 * 1048576; // Vercel rejects request bodies above about 4.5 MB, so keep every upload under this
const size = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

/** Shrinks phone photos in the browser (max 1600px, JPEG) so uploads are fast and fit the server limit. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch { return file; }
}

type Props = { name: string; accept: string; multiple?: boolean; maxFiles?: number; maxMB?: number; required?: boolean; label?: string; hint?: string; compress?: boolean };

/** Drag-and-drop upload area with previews, validation and an upload progress bar. Use inside a <form action={...}>. */
export default function FileDrop({ name, accept, multiple = false, maxFiles = 8, maxMB = 4, required, label, hint, compress = true }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]); const [over, setOver] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const { pending } = useFormStatus(); const was = useRef(false);
  useEffect(() => { if (was.current && !pending) { setFiles([]); if (input.current) input.current.value = ''; } was.current = pending; }, [pending]);
  const previews = useMemo(() => files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)), [files]);
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews]);

  function sync(list: File[]) { const dt = new DataTransfer(); list.forEach((f) => dt.items.add(f)); if (input.current) input.current.files = dt.files; setFiles(list); }
  async function take(incoming: FileList | File[] | null) {
    if (!incoming || !incoming.length) return; setError(''); setBusy(true);
    const allowed = accept.split(',').map((s) => s.trim().toLowerCase());
    const okType = (f: File) => allowed.some((a) => (a.startsWith('.') ? f.name.toLowerCase().endsWith(a) : a.endsWith('/*') ? f.type.startsWith(a.slice(0, -1)) : f.type === a));
    const next: File[] = multiple ? [...files] : [];
    for (const f of Array.from(incoming)) {
      if (!okType(f)) { setError(`“${f.name}” is not an allowed file type.`); continue; }
      const g = compress ? await shrink(f) : f;
      if (g.size > maxMB * 1048576) { setError(`“${f.name}” is over ${maxMB} MB${compress ? ' even after shrinking' : ''}. Please choose a smaller file.`); continue; }
      if (next.length >= maxFiles) { setError(`You can add up to ${maxFiles} files at a time.`); break; }
      next.push(g); if (!multiple) break;
    }
    while (next.length > 1 && next.reduce((a, f) => a + f.size, 0) > TOTAL_LIMIT) { next.pop(); setError('That is a lot at once. The rest can go in a second upload.'); }
    sync(next); setBusy(false);
  }

  return (<div className="space-y-2">
    {label && <span className="label">{label}</span>}
    <label onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
      className={`group relative block cursor-pointer rounded-2xl p-px transition-all duration-300 ${over ? 'bg-grad scale-[1.01]' : 'bg-line hover:bg-grad'}`}>
      <span className={`flex flex-col items-center gap-2 rounded-[15px] px-4 py-7 text-center transition-colors ${over ? 'bg-surface2' : 'bg-surface'}`}>
        <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-700 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110"><Icon name="upload" size={22} /></span>
        <span className="text-sm font-bold">{busy ? 'Preparing your files…' : over ? 'Drop to add' : multiple ? 'Drag and drop photos, or tap to choose' : 'Drag and drop a file, or tap to choose'}</span>
        {hint && <span className="text-xs text-subtle">{hint}</span>}
      </span>
      <input ref={input} type="file" name={name} accept={accept} multiple={multiple} required={required && files.length === 0} className="sr-only" disabled={pending} onChange={(e) => take(e.target.files)} />
    </label>
    {error && <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">{error}</p>}
    {files.length > 0 && (<ul className="grid gap-2 sm:grid-cols-2">{files.map((f, i) => (
      <li key={f.name + i} className="flex items-center gap-3 rounded-xl border border-line bg-surface2 p-2 [animation:fadeUp_.35s_var(--ease)_both]">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface text-subtle">{previews[i] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={previews[i]!} alt="" className="h-full w-full object-cover" /> : <Icon name="file" size={20} />}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{f.name}</span><span className="text-xs text-subtle">{size(f.size)}</span></span>
        {!pending && <button type="button" aria-label={`Remove ${f.name}`} onClick={() => sync(files.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center rounded-full text-subtle transition hover:bg-white/10 hover:text-ink"><Icon name="x" size={16} /></button>}
      </li>))}</ul>)}
    {pending && (<div role="status" className="space-y-1"><div className="upload-bar"><span /></div><p className="text-xs font-semibold text-muted">Uploading {files.length > 1 ? `${files.length} files` : 'your file'}… please keep this page open.</p></div>)}
  </div>);
}
