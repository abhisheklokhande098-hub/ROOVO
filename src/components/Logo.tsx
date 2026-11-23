// The ROOVO logo (your artwork, cut out so it works on dark backgrounds). Replace public/logo.png to change it.
/* eslint-disable @next/next/no-img-element */
export default function Logo({ height = 40, className = '' }: { height?: number; className?: string }) {
  return <img src="/logo.png" alt="ROOVO" height={height} style={{ height, width: 'auto' }} className={className} />;
}
