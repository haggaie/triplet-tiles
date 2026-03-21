const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getTemplateCells } = require('../tools/levelgen/templates');
const { buildParamSweepLayerCells } = require('../tools/levelgen/generator');

function sortCells(cells) {
  return [...cells].sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));
}

test('paramSweep thickness: bottom matches getTemplateCells; top is minThickness', () => {
  const gw = 9;
  const gh = 9;
  const params = { radius: 4, thickness: 3 };
  const layers = buildParamSweepLayerCells('cross', params, gw, gh, 3, {
    sweep: 'thickness',
    minThickness: 1
  });
  assert.equal(layers.length, 3);
  const baseExpected = getTemplateCells('cross', params, gw, gh, { z: 0 });
  assert.deepEqual(sortCells(layers[0]), sortCells(baseExpected));
  const topExpected = getTemplateCells('cross', { ...params, thickness: 1 }, gw, gh, { z: 2 });
  assert.deepEqual(sortCells(layers[2]), sortCells(topExpected));
  const midExpected = getTemplateCells('cross', { ...params, thickness: 2 }, gw, gh, { z: 1 });
  assert.deepEqual(sortCells(layers[1]), sortCells(midExpected));
});

test('paramSweep rejects unsupported sweep', () => {
  assert.throws(
    () =>
      buildParamSweepLayerCells('cross', {}, 9, 9, 2, {
        sweep: 'radius'
      }),
    /unsupported sweep/
  );
});

test('paramSweep rejects template without thickness sweep support', () => {
  assert.throws(
    () =>
      buildParamSweepLayerCells('diamond', { radius: 3 }, 9, 9, 2, {
        sweep: 'thickness'
      }),
    /not supported for template/
  );
});

test('paramSweep thickness: 4→1 in 3 layers includes thickness 2 (no lerp skip)', () => {
  const gw = 9;
  const gh = 9;
  const layers = buildParamSweepLayerCells('cross', { radius: 4, thickness: 4 }, gw, gh, 3, {
    sweep: 'thickness',
    minThickness: 1,
    maxThickness: 4
  });
  const t2 = getTemplateCells('cross', { radius: 4, thickness: 2 }, gw, gh, { z: 1 });
  assert.deepEqual(sortCells(layers[1]), sortCells(t2));
});
