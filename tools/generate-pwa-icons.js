#!/usr/bin/env node
/** Rasterize icon.svg into PNGs for PWA install and Apple home screen. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '..');
const svgPath = path.join(projectRoot, 'icon.svg');

const outputs = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 }
];

async function main() {
  if (!fs.existsSync(svgPath)) {
    console.error(`Missing ${svgPath}`);
    process.exit(1);
  }

  const svgBuf = fs.readFileSync(svgPath);

  for (const { name, size } of outputs) {
    const outPath = path.join(projectRoot, name);
    try {
      await sharp(svgBuf).resize(size, size).png().toFile(outPath);
      console.log(`Wrote ${name} (${size}×${size})`);
    } catch (e) {
      console.error(`Failed to write ${name}:`, e);
      process.exit(1);
    }
  }
}

main();
