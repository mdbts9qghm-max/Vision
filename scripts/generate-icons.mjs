import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// Minimal PNG encoder (RGBA, 8-bit) using zlib deflate — keine Bild-Dependency.
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const BG = hex('#0a0a0a');
const ACCENT = hex('#8b5cf6'); // Akzentfarbe der App (Violett)

// Dunkle abgerundete Kachel mit zentriertem violettem Ring.
function draw(size, { padding = 0.12, ringWidth = 0.11, opaque = true } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const outer = size * (0.5 - padding);
  const inner = outer - size * ringWidth;
  const corner = size * 0.22;
  const aa = 1.2; // Anti-Aliasing-Breite in px

  const inRoundedTile = (x, y) => {
    const dx = Math.max(Math.abs(x - cx) - (size / 2 - corner), 0);
    const dy = Math.max(Math.abs(y - cy) - (size / 2 - corner), 0);
    const d = Math.hypot(dx, dy) - corner;
    return 1 - Math.min(Math.max(d / aa + 0.5, 0), 1);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const i = (y * size + x) * 4;

      const tile = inRoundedTile(px, py);
      let r = BG[0], g = BG[1], b = BG[2];
      let a = opaque ? 255 : Math.round(tile * 255);

      const dist = Math.hypot(px - cx, py - cy);
      const outerCov = 1 - Math.min(Math.max((dist - outer) / aa + 0.5, 0), 1);
      const innerCov = Math.min(Math.max((dist - inner) / aa + 0.5, 0), 1);
      const ringCov = Math.max(0, Math.min(outerCov, innerCov));
      if (ringCov > 0) {
        r = Math.round(r * (1 - ringCov) + ACCENT[0] * ringCov);
        g = Math.round(g * (1 - ringCov) + ACCENT[1] * ringCov);
        b = Math.round(b * (1 - ringCov) + ACCENT[2] * ringCov);
        if (!opaque) a = Math.max(a, Math.round(ringCov * 255));
      }

      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
    }
  }
  return encodePng(size, size, buf);
}

const outDir = process.argv[2] || 'public/icons';
mkdirSync(outDir, { recursive: true });

writeFileSync(`${outDir}/pwa-192x192.png`, draw(192, { opaque: false }));
writeFileSync(`${outDir}/pwa-512x512.png`, draw(512, { opaque: false }));
// Maskable: extra Padding, damit die Safe Zone beim OS-Maskieren hält.
writeFileSync(`${outDir}/maskable-512x512.png`, draw(512, { opaque: false, padding: 0.2 }));
// Apple-Touch-Icon: opak, iOS rundet selbst ab.
writeFileSync(`${outDir}/apple-touch-icon.png`, draw(180, { opaque: true }));

console.log('icons written to', outDir);
