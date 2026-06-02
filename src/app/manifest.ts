import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vial — Peptide Tracker',
    short_name: 'Vial',
    description:
      'A minimalist tracker for peptides, supplements, and medications — calendar, inventory, and dosing calculator.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#100d0a',
    theme_color: '#100d0a',
    categories: ['health', 'medical', 'lifestyle'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
