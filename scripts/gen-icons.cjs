/* Generates the app icons (PNG) without any dependencies. */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePNG(width, height, pixelAt) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelAt(x, y);
      const o = y * stride + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const TOP = [255, 45, 85];
const BOTTOM = [255, 149, 0];

function makeIcon(size) {
  const s = size;
  // Rings: [cx, cy, radius, thickness] relative to size
  const rings = [
    [0.5, 0.46, 0.2, 0.035],
    [0.24, 0.72, 0.11, 0.028],
    [0.76, 0.72, 0.11, 0.028],
    [0.2, 0.26, 0.085, 0.024],
    [0.8, 0.26, 0.085, 0.024],
  ];
  const aa = 1.2;
  return encodePNG(s, s, (x, y) => {
    const t = y / (s - 1);
    let r = lerp(TOP[0], BOTTOM[0], t);
    let g = lerp(TOP[1], BOTTOM[1], t);
    let b = lerp(TOP[2], BOTTOM[2], t);
    let white = 0;
    for (const [cx, cy, rad, th] of rings) {
      const d = Math.hypot(x + 0.5 - cx * s, y + 0.5 - cy * s);
      const half = (th * s) / 2;
      const dist = Math.abs(d - rad * s);
      const ring = 1 - smooth(half - aa, half + aa, dist);
      // Soft inner fill
      const fill = (1 - smooth(rad * s - half - aa, rad * s - half + aa, d)) * 0.22;
      white = Math.max(white, ring, fill);
    }
    r = lerp(r, 255, white);
    g = lerp(g, 255, white);
    b = lerp(b, 255, white);
    return [Math.round(r), Math.round(g), Math.round(b), 255];
  });
}

const out = path.join(__dirname, "..", "public");
fs.mkdirSync(out, { recursive: true });
for (const size of [512, 192, 180]) {
  fs.writeFileSync(path.join(out, `icon-${size}.png`), makeIcon(size));
  console.log(`wrote public/icon-${size}.png`);
}
