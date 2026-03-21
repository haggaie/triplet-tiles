const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getTemplateCells } = require('../tools/levelgen/templates');
const { tileFootprintAabb } = require('../tools/levelgen/template-footprint.js');
const { tileCenterInCells } = require('../tile-layering.js');

function sortCells(cells) {
  return [...cells].sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));
}

test('getTemplateCells: omitting options matches explicit z=0', () => {
  const gw = 9;
  const gh = 9;
  const params = { radius: 4, thickness: 3 };
  const a = getTemplateCells('cross', params, gw, gh);
  const b = getTemplateCells('cross', params, gw, gh, { z: 0 });
  assert.deepEqual(sortCells(a), sortCells(b));
});

test('cross template: odd z shifts footprint vs even z (cell set can differ)', () => {
  const gw = 9;
  const gh = 9;
  const params = { radius: 4, thickness: 3 };
  const evenZ = getTemplateCells('cross', params, gw, gh, { z: 0 });
  const oddZ = getTemplateCells('cross', params, gw, gh, { z: 1 });
  assert.notDeepEqual(sortCells(evenZ), sortCells(oddZ));
});

test('tileFootprintAabb matches tileCenterInCells ± 0.5', () => {
  for (const z of [0, 1, -1]) {
    const tb = tileFootprintAabb(3, 4, z);
    const { cx, cy } = tileCenterInCells({ x: 3, y: 4, z });
    assert.equal(tb.minX, cx - 0.5);
    assert.equal(tb.maxX, cx + 0.5);
    assert.equal(tb.minY, cy - 0.5);
    assert.equal(tb.maxY, cy + 0.5);
  }
});
