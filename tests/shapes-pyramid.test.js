const { test } = require('node:test');
const assert = require('node:assert/strict');
const { shrinkSilhouette, getLayerSilhouette } = require('../tools/levelgen/shapes');

test('shrinkSilhouette: default min 2 keeps spine of a 1-wide bar', () => {
  const gw = 8;
  const gh = 8;
  const bar = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 }
  ];
  const s2 = shrinkSilhouette(bar, gw, gh, 2);
  assert.deepEqual(s2, [
    { x: 1, y: 0 },
    { x: 2, y: 0 }
  ]);
});

test('shrinkSilhouette: min 4 removes entire 1-wide bar (strict interior)', () => {
  const gw = 8;
  const gh = 8;
  const bar = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 }
  ];
  const s4 = shrinkSilhouette(bar, gw, gh, 4);
  assert.equal(s4.length, 0);
});

test('getLayerSilhouette pyramid respects pyramidMinNeighbors option', () => {
  const base = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 }
  ];
  const gw = 8;
  const gh = 8;
  const layer1two = getLayerSilhouette(base, gw, gh, 'pyramid', 1, { pyramidMinNeighbors: 2 });
  assert.deepEqual(layer1two, [
    { x: 1, y: 0 },
    { x: 2, y: 0 }
  ]);
  const layer1four = getLayerSilhouette(base, gw, gh, 'pyramid', 1, { pyramidMinNeighbors: 4 });
  assert.equal(layer1four.length, 4);
  assert.deepEqual(layer1four, base);
});
