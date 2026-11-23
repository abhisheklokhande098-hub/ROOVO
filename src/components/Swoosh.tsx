import { useId } from 'react';
import { SWOOSH } from '@/lib/swoosh';
/** The logo's car-roof swoosh as a vector; it draws itself in from left to right. */
export default function Swoosh({ className = '', animate = true }: { className?: string; animate?: boolean }) {
  const id = 'sw' + useId().replace(/:/g, '');
  return (<svg viewBox={SWOOSH.viewBox} className={`${animate ? 'swoosh-reveal' : ''} ${className}`} fill="none" aria-hidden="true">
    <defs><linearGradient id={id} x1="0" y1="0" x2="690" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#F5913F" /><stop offset="0.35" stopColor="#FE8C2B" /><stop offset="0.62" stopColor="#F67139" /><stop offset="0.8" stopColor="#E9708C" /><stop offset="0.92" stopColor="#DF4466" /><stop offset="1" stopColor="#ED4828" /></linearGradient></defs>
    <path d={SWOOSH.paths.main} fill={`url(#${id})`} />{'tick' in SWOOSH.paths && <path d={SWOOSH.paths.tick} fill="#ED4828" />}</svg>);
}
