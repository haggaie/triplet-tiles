#!/usr/bin/env node
/** Copies deployable files to dist/ for deployment. Run after build. */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const deployables = ['index.html', 'game.js', 'style.css', 'levels.generated.js'];

fs.mkdirSync(distDir, { recursive: true });
for (const name of deployables) {
  const src = path.join(projectRoot, name);
  if (!fs.existsSync(src)) {
    console.error(`Missing deployable file: ${name}. Run "npm run build" first.`);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(distDir, name));
}
console.log(`Copied ${deployables.length} files to dist/`);
