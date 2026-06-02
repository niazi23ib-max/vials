// Generates PWA icons that match the landing-page VialFill motif (capped vial
// with neck, measurement ticks, ~66% amber fill) on the warm-dark background.
// Run: node scripts/gen-icons.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const BG = '#100d0a';
// Amber fill palette (hex approximations of the app's oklch hue-62 ramp).
const FILL_TOP = '#e6ad66';
const FILL_BOT = '#b3742f';
const SURFACE = '#f0c488';
const METAL = 'rgba(240,230,214,0.22)'; // cap / neck / outline (= --line-strong)
const TICK = 'rgba(240,230,214,0.11)'; // measurement ticks (= --line)
const FILL_PCT = 0.66;

const r2 = (n) => Math.round(n * 100) / 100;

/** Draw the VialFill vial centered in an S×S canvas, motif height ≈ scale·S. */
function svg(S, scale) {
  const bw = (scale * S) / 2.63; // body width (cap+neck+body height ≈ 2.63·bw)
  const bodyH = bw * 2.4;
  const capH = bw * 0.13;
  const neckH = bw * 0.1;
  const Ht = bodyH + capH + neckH;
  const topY = (S - Ht) / 2;
  const cx = S / 2;
  const capW = bw * 0.54;
  const neckW = bw * 0.36;
  const bodyX = cx - bw / 2;
  const bodyY = topY + capH + neckH;
  const topR = bw * 0.1;
  const botR = bw * 0.42;
  const stroke = Math.max(2, bw * 0.05);
  const fillH = bodyH * FILL_PCT;
  const fillY = bodyY + bodyH - fillH;

  const body = `M ${r2(bodyX)} ${r2(bodyY + topR)}`
    + ` a ${r2(topR)} ${r2(topR)} 0 0 1 ${r2(topR)} ${r2(-topR)}`
    + ` h ${r2(bw - 2 * topR)}`
    + ` a ${r2(topR)} ${r2(topR)} 0 0 1 ${r2(topR)} ${r2(topR)}`
    + ` V ${r2(bodyY + bodyH - botR)}`
    + ` a ${r2(botR)} ${r2(botR)} 0 0 1 ${r2(-botR)} ${r2(botR)}`
    + ` h ${r2(-(bw - 2 * botR))}`
    + ` a ${r2(botR)} ${r2(botR)} 0 0 1 ${r2(-botR)} ${r2(-botR)}`
    + ` Z`;

  const tickW = bw * 0.13;
  const tickH = Math.max(1.5, bw * 0.022);
  const ticks = [0.25, 0.5, 0.75]
    .map((t) => `<rect x="${r2(bodyX + bw - tickW)}" y="${r2(bodyY + bodyH - t * bodyH)}" width="${r2(tickW)}" height="${r2(tickH)}" fill="${TICK}"/>`)
    .join('');

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="amber" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${FILL_TOP}"/>
      <stop offset="1" stop-color="${FILL_BOT}"/>
    </linearGradient>
    <clipPath id="body"><path d="${body}"/></clipPath>
  </defs>
  <rect width="${S}" height="${S}" fill="${BG}"/>
  <rect x="${r2(cx - capW / 2)}" y="${r2(topY)}" width="${r2(capW)}" height="${r2(capH)}" rx="${r2(capH * 0.35)}" fill="${METAL}"/>
  <rect x="${r2(cx - neckW / 2)}" y="${r2(topY + capH)}" width="${r2(neckW)}" height="${r2(neckH)}" fill="${METAL}"/>
  <g clip-path="url(#body)">
    <rect x="${r2(bodyX)}" y="${r2(fillY)}" width="${r2(bw)}" height="${r2(fillH)}" fill="url(#amber)"/>
    <rect x="${r2(bodyX)}" y="${r2(fillY)}" width="${r2(bw)}" height="${r2(Math.max(2, bw * 0.03))}" fill="${SURFACE}"/>
    ${ticks}
  </g>
  <path d="${body}" fill="none" stroke="${METAL}" stroke-width="${r2(stroke)}"/>
</svg>`);
}

async function main() {
  await mkdir('public', { recursive: true });
  const jobs = [
    { name: 'public/icon-192.png', size: 192, scale: 0.64 },
    { name: 'public/icon-512.png', size: 512, scale: 0.64 },
    { name: 'public/icon-maskable-512.png', size: 512, scale: 0.5 },
    { name: 'public/apple-touch-icon.png', size: 180, scale: 0.64 },
  ];
  for (const j of jobs) {
    await sharp(svg(j.size, j.scale)).png().toFile(j.name);
    console.log('wrote', j.name);
  }
}
main();
