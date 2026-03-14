#!/usr/bin/env node
/**
 * Build the Rust levelgen-solver addon and copy to levelgen_solver.node
 * so Node can require it. Run from project root.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const crateDir = path.join(__dirname, '..', 'crates', 'levelgen-solver');
const targetDir = path.join(crateDir, 'target', 'release');
const outName = 'levelgen_solver.node';

const libNames = {
  darwin: 'liblevelgen_solver.dylib',
  linux: 'liblevelgen_solver.so',
  win32: 'levelgen_solver.dll'
};

const platform = os.platform();
const libName = libNames[platform];
if (!libName) {
  console.error('Unsupported platform:', platform);
  process.exit(1);
}

const src = path.join(targetDir, libName);
const dst = path.join(targetDir, outName);

console.log('Building levelgen-solver (release)...');
execSync('cargo build --release', {
  cwd: crateDir,
  stdio: 'inherit',
  env: { ...process.env, CARGO_TARGET_DIR: path.join(crateDir, 'target') }
});

if (!fs.existsSync(src)) {
  console.error('Build artifact not found:', src);
  process.exit(1);
}

fs.copyFileSync(src, dst);
console.log('Copied to', dst);
