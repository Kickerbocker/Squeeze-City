// Draws the app icons in code (a lemon on sky blue) and writes PNGs to public/.
// Usage: npx tsx scripts/make-icons.ts
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

type RGBA = [number, number, number, number];
const SKY: RGBA = [143, 211, 255, 255];
const LEMON: RGBA = [255, 216, 74, 255];
const LEMON_DARK: RGBA = [224, 176, 32, 255];
const HIGHLIGHT: RGBA = [255, 243, 160, 255];
const LEAF: RGBA = [107, 191, 89, 255];

/** Colour of the icon at normalized coordinates (0..1). `maskable` keeps art in the safe zone. */
function sample(x: number, y: number, maskable: boolean): RGBA {
  const s = maskable ? 0.72 : 0.9; // art scale
  const u = (x - 0.5) / s + 0.5;
  const v = (y - 0.5) / s + 0.5;
  const inEllipse = (cx: number, cy: number, rx: number, ry: number, rot = 0) => {
    const dx = u - cx;
    const dy = v - cy;
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    const a = (dx * c + dy * sn) / rx;
    const b = (-dx * sn + dy * c) / ry;
    return a * a + b * b <= 1;
  };
  if (inEllipse(0.66, 0.24, 0.13, 0.055, -0.5)) return LEAF;
  if (inEllipse(0.5, 0.55, 0.36, 0.27, -0.25)) {
    if (inEllipse(0.4, 0.46, 0.1, 0.06, -0.25)) return HIGHLIGHT;
    if (!inEllipse(0.47, 0.52, 0.34, 0.25, -0.25)) return LEMON_DARK;
    return LEMON;
  }
  if (inEllipse(0.86, 0.58, 0.05, 0.04)) return LEMON_DARK; // lemon tip
  if (inEllipse(0.14, 0.52, 0.04, 0.035)) return LEMON_DARK;
  return SKY;
}

function render(size: number, maskable: boolean): Buffer {
  const ss = 4; // supersampling
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0, 0];
      for (let j = 0; j < ss; j++)
        for (let i = 0; i < ss; i++) {
          const c = sample((x + (i + 0.5) / ss) / size, (y + (j + 0.5) / ss) / size, maskable);
          for (let k = 0; k < 4; k++) acc[k]! += c[k]!;
        }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      for (let k = 0; k < 4; k++) raw[o + k] = Math.round(acc[k]! / (ss * ss));
    }
  }
  return png(size, size, raw);
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(w: number, h: number, raw: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = new URL('../public/', import.meta.url);
writeFileSync(new URL('icon-192.png', out), render(192, false));
writeFileSync(new URL('icon-512.png', out), render(512, false));
writeFileSync(new URL('icon-maskable-512.png', out), render(512, true));
writeFileSync(new URL('apple-touch-icon.png', out), render(180, true));
writeFileSync(new URL('favicon-64.png', out), render(64, false));
console.log('Icons written to public/.');
