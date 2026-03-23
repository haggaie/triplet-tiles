/**
 * Regression: gameplay `.tile.blocked` must not use opacity (peek-through to lower layers).
 * Level designer preview keeps `opacity: 0.8` on `.leveldesign-preview-board .tile.blocked`.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');

test('style.css: .tile.blocked does not set opacity', () => {
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  const m = css.match(/\.tile\.blocked\s*\{([^}]*)\}/);
  assert.ok(m, 'expected .tile.blocked { ... } in style.css');
  assert.ok(
    !/\bopacity\s*:/.test(m[1]),
    'gameplay blocked tiles must stay opaque — remove opacity from .tile.blocked'
  );
});

test('leveldesigner.css: preview .tile.blocked keeps translucent opacity', () => {
  const css = fs.readFileSync(path.join(root, 'tools/leveldesigner/leveldesigner.css'), 'utf8');
  const m = css.match(/\.leveldesign-preview-board\s+\.tile\.blocked\s*\{([^}]*)\}/);
  assert.ok(m, 'expected .leveldesign-preview-board .tile.blocked { ... }');
  assert.ok(
    /\bopacity\s*:\s*0\.8\b/.test(m[1]),
    'level designer preview should set opacity: 0.8 on blocked tiles'
  );
});
