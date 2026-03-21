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

test('paramSweep radius: shrinking diamond + z matches getTemplateCells per layer', () => {
  const gw = 9;
  const gh = 9;
  const params = { radius: 3 };
  const layers = buildParamSweepLayerCells('diamond', params, gw, gh, 4, {
    sweep: 'radius',
    minRadius: 1,
    maxRadius: 3
  });
  assert.equal(layers.length, 4);
  // Same ladder + index mapping as generator: [3,2,1] spread across 4 layers → 3,2,2,1
  const expectedRadii = [3, 2, 2, 1];
  for (let i = 0; i < 4; i += 1) {
    const merged = { ...params, radius: expectedRadii[i] };
    assert.deepEqual(
      sortCells(layers[i]),
      sortCells(getTemplateCells('diamond', merged, gw, gh, { z: i }))
    );
  }
});

test('paramSweep radius: asymmetric diamond keeps aspect (radiusY/radiusX) per ladder step', () => {
  const gw = 9;
  const gh = 9;
  const params = { radiusX: 3, radiusY: 5 };
  const aspect = params.radiusY / params.radiusX;
  const layers = buildParamSweepLayerCells('diamond', params, gw, gh, 4, {
    sweep: 'radius',
    minRadius: 1,
    maxRadius: null
  });
  assert.equal(layers.length, 4);
  const expectedRx = [3, 2, 2, 1];
  for (let i = 0; i < 4; i += 1) {
    const rx = expectedRx[i];
    const ry = Math.max(1, Math.round(rx * aspect));
    assert.deepEqual(
      sortCells(layers[i]),
      sortCells(getTemplateCells('diamond', { radiusX: rx, radiusY: ry }, gw, gh, { z: i }))
    );
  }
});

test('paramSweep footprintZ: per-layer cells match getTemplateCells with z', () => {
  const gw = 9;
  const gh = 9;
  const params = { radius: 3 };
  const layers = buildParamSweepLayerCells('diamond', params, gw, gh, 4, {
    sweep: 'footprintZ'
  });
  assert.equal(layers.length, 4);
  for (let z = 0; z < 4; z += 1) {
    assert.deepEqual(
      sortCells(layers[z]),
      sortCells(getTemplateCells('diamond', params, gw, gh, { z }))
    );
  }
});

test('paramSweep rejects unsupported sweep', () => {
  assert.throws(
    () =>
      buildParamSweepLayerCells('cross', { radius: 4, thickness: 2 }, 9, 9, 2, {
        sweep: 'bogusSweep'
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
