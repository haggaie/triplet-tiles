#!/usr/bin/env node
/** Copies deployable files to dist/ for deployment. Run after build. */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const deployables = [
  'index.html',
  'game.js',
  'tile-layering.js',
  'style.css',
  'levels.generated.js',
  'manifest.webmanifest',
  'icon.svg',
  'sw.js'
];
const deployLibDir = path.join(projectRoot, 'lib');

fs.mkdirSync(distDir, { recursive: true });
for (const name of deployables) {
  const src = path.join(projectRoot, name);
  if (!fs.existsSync(src)) {
    console.error(`Missing deployable file: ${name}. Run "npm run build" first.`);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(distDir, name));
}

const distLib = path.join(distDir, 'lib');
fs.mkdirSync(distLib, { recursive: true });
for (const name of fs.readdirSync(deployLibDir)) {
  const src = path.join(deployLibDir, name);
  if (!fs.statSync(src).isFile()) continue;
  fs.copyFileSync(src, path.join(distLib, name));
}

const assetsDir = path.join(projectRoot, 'assets');
const distAssets = path.join(distDir, 'assets');
if (fs.existsSync(assetsDir)) {
  fs.mkdirSync(distAssets, { recursive: true });
  fs.cpSync(assetsDir, distAssets, {
    recursive: true,
    /** WAV masters for `npm run optimize:audio` — not needed at runtime. */
    filter(src) {
      const rel = path.relative(assetsDir, src);
      return !(rel === 'audio/source' || rel.startsWith(`audio${path.sep}source${path.sep}`));
    }
  });
}

console.log(`Copied ${deployables.length} root files, lib/, and assets/ to dist/`);
