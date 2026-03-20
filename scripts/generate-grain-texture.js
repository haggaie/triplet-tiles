#!/usr/bin/env node
/**
 * Writes assets/wood-grain-noise.webp — seamless 256×256 neutral grain for tile backgrounds.
 * Toroidal bilinear value noise tiles with no visible seam.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const W = 256;
const H = 256;
const GW = 48;
const GH = 48;

function rand01(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const grid = new Float32Array(GW * GH);
for (let i = 0; i < GW * GH; i++) grid[i] = rand01(i * 7919 + 104729);

function sample(gx, gy) {
  const ix = ((gx % GW) + GW) % GW;
  const iy = ((gy % GH) + GH) % GH;
  return grid[iy * GW + ix];
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function noiseAt(nx, ny) {
  const x = nx * GW;
  const y = ny * GH;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const v00 = sample(x0, y0);
  const v10 = sample(x0 + 1, y0);
  const v01 = sample(x0, y0 + 1);
  const v11 = sample(x0 + 1, y0 + 1);
  const a = v00 + fx * (v10 - v00);
  const b = v01 + fx * (v11 - v01);
  return a + fy * (b - a);
}

const buf = Buffer.alloc(W * H * 4);
let i = 0;
for (let py = 0; py < H; py++) {
  for (let px = 0; px < W; px++) {
    const nx = px / W;
    const ny = py / H;
    let v = noiseAt(nx, ny);
    v += 0.35 * noiseAt(nx * 2.3 + 0.1, ny * 2.3 + 0.2);
    v += 0.18 * noiseAt(nx * 5.1, ny * 5.1);
    v /= 1 + 0.35 + 0.18;
    const t = v * 2 - 1;
    const amp = 22;
    const g = Math.round(Math.min(255, Math.max(0, 128 + t * amp)));
    buf[i++] = g;
    buf[i++] = g;
    buf[i++] = g;
    buf[i++] = 255;
  }
}

const outDir = path.join(__dirname, '..', 'assets');
const outFile = path.join(outDir, 'wood-grain-noise.webp');
fs.mkdirSync(outDir, { recursive: true });

sharp(buf, { raw: { width: W, height: H, channels: 4 } })
  .webp({ quality: 82, effort: 6, smartSubsample: true })
  .toFile(outFile)
  .then((info) => {
    console.log(`Wrote ${outFile} (${info.size} bytes)`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
