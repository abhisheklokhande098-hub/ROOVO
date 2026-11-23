import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ROOVO', short_name: 'ROOVO', description: 'Rent cars, bikes and vans in Pune.',
    start_url: '/', display: 'standalone', background_color: '#030409', theme_color: '#030409',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
