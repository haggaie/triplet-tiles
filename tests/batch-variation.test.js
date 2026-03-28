const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  deepMerge,
  resolveBatchVariation,
  resolveBatchLevelCount,
  paramSeedForSlot,
  sampleRangesTree,
  sweepPatchesFromAxes
} = require('../tools/levelgen/batch-variation');

test('resolveBatchLevelCount: sweep without count uses variants length', () => {
  assert.equal(
    resolveBatchLevelCount({
      templateId: 'cross',
      batchVariation: { mode: 'sweep', variants: [{}, {}, {}] }
    }),
    3
  );
  assert.equal(
    resolveBatchLevelCount({
      templateId: 'cross',
      count: 'auto',
      batchVariation: { mode: 'sweep', variants: [{ a: 1 }, { a: 2 }] }
    }),
    2
  );
});

test('resolveBatchLevelCount: non-sweep defaults to 1 when count omitted', () => {
  assert.equal(resolveBatchLevelCount({ templateId: 'diamond' }), 1);
  assert.equal(resolveBatchLevelCount({ templateId: 'diamond', count: 5 }), 5);
});

test('resolveBatchLevelCount: count auto without sweep throws', () => {
  assert.throws(() => resolveBatchLevelCount({ templateId: 'x', count: 'auto' }), /only valid when/);
});

test('deepMerge merges nested objects', () => {
  const a = { layering: { maxZ: 2, maxStackPerCell: 3 }, x: 1 };
  deepMerge(a, { layering: { maxZ: 5 }, templateParams: { radius: 3 } });
  assert.equal(a.layering.maxZ, 5);
  assert.equal(a.layering.maxStackPerCell, 3);
  assert.equal(a.templateParams.radius, 3);
});

test('sweepPatchesFromAxes: Cartesian product', () => {
  const patches = sweepPatchesFromAxes({
    gridHeight: [10, 11],
    layering: { maxZ: [2, 3] }
  });
  assert.equal(patches.length, 4);
});

test('resolveBatchVariation sweep: variants cycle by slotIndex', () => {
  const batch = {
    templateId: 'cross',
    gridWidth: 8,
    gridHeight: 12,
    batchVariation: {
      mode: 'sweep',
      variants: [{ gridHeight: 10 }, { gridHeight: 11 }, { gridHeight: 12 }]
    }
  };
  assert.equal(resolveBatchVariation(batch, { slotIndex: 0, batchIndex: 0, seed: 1 }).gridHeight, 10);
  assert.equal(resolveBatchVariation(batch, { slotIndex: 1, batchIndex: 0, seed: 1 }).gridHeight, 11);
  assert.equal(resolveBatchVariation(batch, { slotIndex: 5, batchIndex: 0, seed: 1 }).gridHeight, 12);
});

test('resolveBatchVariation random: same seed+slot+batchIndex yields same result', () => {
  const batch = {
    templateId: 'cross',
    gridWidth: 8,
    gridHeight: 12,
    batchVariation: {
      mode: 'random',
      ranges: {
        gridHeight: { min: 10, max: 12 },
        layering: { maxZ: { min: 2, max: 5 } },
        distribution: { exponent: { min: 0.9, max: 1.2 } }
      }
    }
  };
  const a = resolveBatchVariation(batch, { slotIndex: 2, batchIndex: 1, seed: 1337 });
  const b = resolveBatchVariation(batch, { slotIndex: 2, batchIndex: 1, seed: 1337 });
  assert.deepEqual(a.gridHeight, b.gridHeight);
  assert.deepEqual(a.layering.maxZ, b.layering.maxZ);
  assert.equal(a.distribution.exponent, b.distribution.exponent);
});

test('resolveBatchVariation: absent batchVariation returns clone without batchVariation key', () => {
  const batch = { templateId: 'cross', gridWidth: 8, gridHeight: 10 };
  const r = resolveBatchVariation(batch, { slotIndex: 0, batchIndex: 0, seed: 1 });
  assert.equal(r.batchVariation, undefined);
  assert.equal(r.templateId, 'cross');
});

test('paramSeedForSlot is deterministic', () => {
  assert.equal(paramSeedForSlot(1337, 0, 0), paramSeedForSlot(1337, 0, 0));
  assert.notEqual(paramSeedForSlot(1337, 0, 0), paramSeedForSlot(1337, 0, 1));
});

test('sampleRangesTree: integer range', () => {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function rand() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(42);
  const v = sampleRangesTree({ min: 1, max: 3 }, rng);
  assert.ok(v >= 1 && v <= 3 && Number.isInteger(v));
});
