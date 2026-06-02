// Generates PWA icons from an inline SVG (amber vial on warm-dark) using sharp.
// Run: node scripts/gen-icons.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const BG = '#100d0a';

/** Vial motif centered in a `size` viewBox, scaled by `s` (0..1) within the safe area. */
function svg(size, motifScale) {
  const c = size / 2;
  const h = size * motifScale;        // motif height
  const w = h * 0.42;                 // vial body width
  const x = c - w / 2;
  const top = c - h / 2;
  const capH = h * 0.1;
  const bodyTop = top + capH + h * 0.04;
  const bodyBot = top + h;
  const r = w * 0.46;                 // rounded bottom
  const fillTop = bodyBot - (bodyBot - bodyTop) * 0.62; // ~62% full
  const neckW = w * 0.4;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="amber" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e6ad66"/>
      <stop offset="1" stop-color="#b3742f"/>
    </linearGradient>
    <clipPath id="body">
      <path d="M ${x} ${bodyTop} H ${x + w} V ${bodyBot - r} a ${r} ${r} 0 0 1 -${r} ${r} H ${x + r} a ${r} ${r} 0 0 1 -${r} -${r} Z"/>
    </clipPath>
  </defs>
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <!-- cap -->
  <rect x="${c - neckW / 2}" y="${top}" width="${neckW}" height="${capH}" rx="${capH * 0.4}" fill="#6b5c49"/>
  <!-- vial outline -->
  <path d="M ${x} ${bodyTop} H ${x + w} V ${bodyBot - r} a ${r} ${r} 0 0 1 -${r} ${r} H ${x + r} a ${r} ${r} 0 0 1 -${r} -${r} Z"
        fill="rgba(255,255,255,0.04)" stroke="#7c6b57" stroke-width="${size * 0.012}"/>
  <!-- liquid -->
  <g clip-path="url(#body)">
    <rect x="${x}" y="${fillTop}" width="${w}" height="${bodyBot - fillTop}" fill="url(#amber)"/>
    <rect x="${x}" y="${fillTop}" width="${w}" height="${size * 0.012}" fill="#f0c488"/>
  </g>
</svg>`);
}

async function main() {
  await mkdir('public', { recursive: true });
  const jobs = [
    { name: 'public/icon-192.png', size: 192, scale: 0.66 },
    { name: 'public/icon-512.png', size: 512, scale: 0.66 },
    // maskable: keep motif inside the ~80% safe zone
    { name: 'public/icon-maskable-512.png', size: 512, scale: 0.52 },
    { name: 'public/apple-touch-icon.png', size: 180, scale: 0.66 },
  ];
  for (const j of jobs) {
    await sharp(svg(j.size, j.scale)).png().toFile(j.name);
    console.log('wrote', j.name);
  }
}
main();
