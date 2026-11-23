'use client';
import { useFormStatus } from 'react-dom';
/** Drop-in submit button for <form action={...}>: shows a spinner and blocks double-clicks while saving. */
export default function SubmitButton({ children, pendingText = 'Please wait…', className = 'btn' }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (<button className={className} disabled={pending} aria-busy={pending}>{pending ? (<><span className="spinner" aria-hidden="true" />{pendingText}</>) : children}</button>);
}
