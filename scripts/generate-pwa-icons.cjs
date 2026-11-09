const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[i] = c;
  }
  let c = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xFF];
  return (c ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'binary');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, drawFn) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const rowBytes = width * 4 + 1;
  const raw = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    raw[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Drawing function for OSDEL logo:
// Dark navy gradient background, glowing circular ring and antenna/signal waves
function drawOsdelIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxR = w / 2;

  // Background: Deep dark corporate blue gradient #0a192f to #0f2744
  const bgT = (y / h) * 0.5 + (x / w) * 0.5;
  const bgR = Math.round(10 + bgT * 12);
  const bgG = Math.round(25 + bgT * 20);
  const bgB = Math.round(48 + bgT * 35);

  const scale = isMaskable ? 0.38 : 0.44; // keep inside safe zone
  const rOuter = maxR * scale * 1.0;
  const rInner = maxR * scale * 0.65;
  const rCore = maxR * scale * 0.35;

  // Outer glowing ring ("O" of OSDEL)
  if (dist >= rInner && dist <= rOuter) {
    // Gradient between bright cyan (0, 180, 255) and emerald (16, 185, 129)
    const angle = Math.atan2(dy, dx);
    const grad = (Math.sin(angle) + 1) / 2;
    const ringR = Math.round(0 * (1 - grad) + 16 * grad);
    const ringG = Math.round(180 * (1 - grad) + 210 * grad);
    const ringB = Math.round(250 * (1 - grad) + 140 * grad);
    return [ringR, ringG, ringB, 255];
  }

  // Inner Core center
  if (dist <= rCore) {
    return [37, 99, 235, 255]; // Royal Blue Core
  }

  // Connectivity pulse dots
  const dotAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  for (const a of dotAngles) {
    const dotX = cx + Math.cos(a) * (maxR * scale * 1.35);
    const dotY = cy + Math.sin(a) * (maxR * scale * 1.35);
    const dDot = Math.sqrt((x - dotX) ** 2 + (y - dotY) ** 2);
    if (dDot <= maxR * 0.04) {
      return [56, 189, 248, 255]; // Sky cyan pulse
    }
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate 192x192
console.log('Generating pwa-192x192.png...');
const png192 = createPng(192, 192, (x, y, w, h) => drawOsdelIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

// 2. Generate 512x512
console.log('Generating pwa-512x512.png...');
const png512 = createPng(512, 512, (x, y, w, h) => drawOsdelIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

// 3. Generate pwa-maskable-512x512.png
console.log('Generating pwa-maskable-512x512.png...');
const pngMaskable = createPng(512, 512, (x, y, w, h) => drawOsdelIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable);

// 4. Generate apple-touch-icon.png (180x180)
console.log('Generating apple-touch-icon.png...');
const pngApple = createPng(180, 180, (x, y, w, h) => drawOsdelIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngApple);

// 5. Generate icon.svg
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a192f"/>
      <stop offset="100%" stop-color="#142f4c"/>
    </linearGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#bgGrad)"/>
  <circle cx="256" cy="256" r="130" stroke="url(#ringGrad)" stroke-width="36" fill="none"/>
  <circle cx="256" cy="256" r="45" fill="#2563eb"/>
  <circle cx="256" cy="65" r="16" fill="#38bdf8"/>
  <circle cx="447" cy="256" r="16" fill="#10b981"/>
  <circle cx="256" cy="447" r="16" fill="#38bdf8"/>
  <circle cx="65" cy="256" r="16" fill="#10b981"/>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);

console.log('All PWA assets created successfully in /public!');
