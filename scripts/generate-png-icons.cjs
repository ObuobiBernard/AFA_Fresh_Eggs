const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function generateEggPng(size, isMaskable = false) {
  // Brand colors:
  // Green: 31, 94, 59 (0x1F, 0x5E, 0x3B)
  // Cream: 255, 246, 224 (0xFF, 0xF6, 0xE0)
  // Gold/Yolk: 245, 166, 35 (0xF5, 0xA6, 0x23)
  // Leaf: 127, 199, 122 (0x7F, 0xC7, 0x7A)

  const rows = [];
  const cx = size / 2;
  const cy = size / 2;
  const scale = (size / 100) * (isMaskable ? 0.75 : 0.95);

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // Filter None

    for (let x = 0; x < size; x++) {
      const idx = 1 + x * 4;
      const dx = (x - cx) / scale;
      const dy = (y - cy) / scale;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 31, g = 94, b = 59, a = 255;

      if (isMaskable) {
        // Full bleed background green for maskable
        r = 31; g = 94; b = 59; a = 255;
      } else {
        // Outer circular badge
        if (dist > 48) {
          r = 0; g = 0; b = 0; a = 0;
        } else if (dist > 42) {
          r = 255; g = 246; b = 224; a = 255; // Cream ring
        }
      }

      // Inside badge:
      if (dist <= 42) {
        r = 31; g = 94; b = 59; a = 255; // Dark green inner field

        // Egg shape approximation:
        // centered around (0, 0), slightly wider at bottom, tapered at top
        const eggY = dy + 2;
        const eggX = dx;
        const eggDist = Math.sqrt(eggX * eggX * (1 + (eggY < 0 ? -0.4 * (eggY / 25) : 0)) + eggY * eggY);
        
        if (eggDist <= 23) {
          r = 255; g = 246; b = 224; a = 255; // Cream egg
          
          // Yolk in center:
          const yolkDist = Math.sqrt(dx * dx + (dy - 5) * (dy - 5));
          if (yolkDist <= 9) {
            r = 245; g = 166; b = 35; a = 255; // Golden yolk
          }
        }

        // Green leaves at bottom
        if (dy >= 14 && dy <= 24 && Math.abs(dx) <= 18) {
          const leafDist = Math.sqrt((dx * dx) / 4 + (dy - 20) * (dy - 20));
          if (leafDist <= 5) {
            r = 127; g = 199; b = 122; a = 255; // Green leaf
          }
        }
      }

      row[idx] = r;
      row[idx + 1] = g;
      row[idx + 2] = b;
      row[idx + 3] = a;
    }
    rows.push(row);
  }

  const rawData = Buffer.concat(rows);
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generateEggPng(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generateEggPng(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generateEggPng(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateEggPng(180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generateEggPng(64, false));

console.log('Successfully generated PWA and Apple touch PNG icons in public/');
