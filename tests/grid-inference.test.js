'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  inferGridDimensions,
  resolveBatchGrid,
  generateOneLevel,
  mulberry32
} = require('../tools/levelgen/generator');

const inferCtx = { seed: 42, batchIndex: 0, slotIndex: 0 };

test('inferGridDimensions: diamond + paramSweep yields tight portrait board', () => {
  const { gridWidth, gridHeight } = inferGridDimensions(
    {
      templateId: 'diamond',
      templateParams: { radiusX: 3, radiusY: 4 },
      layering: {
        minZ: 0,
        maxZ: 2,
        maxStackPerCell: 3,
        layerShape: 'paramSweep',
        layerShapeOptions: { sweep: 'radius', minRadius: 1, maxRadius: null }
      }
    },
    inferCtx
  );
  assert.equal(gridWidth, 7);
  assert.equal(gridHeight, 9);
});

test('inferGridDimensions: symmetric circle', () => {
  const { gridWidth, gridHeight } = inferGridDimensions(
    {
      templateId: 'circle',
      templateParams: { radius: 4 },
      layering: { minZ: 0, maxZ: 1, maxStackPerCell: 3, layerShape: 'full' }
    },
    inferCtx
  );
  assert.ok(gridWidth >= 5 && gridHeight >=5);
  assert.ok(gridWidth <= 15 && gridHeight <= 15);
});

test('inferGridDimensions: rectangle with explicit width/height', () => {
  const { gridWidth, gridHeight } = inferGridDimensions(
    {
      templateId: 'rectangle',
      templateParams: { width: 5, height: 7 },
      layering: { minZ: 0, maxZ: 1, maxStackPerCell: 2, layerShape: 'full' }
    },
    inferCtx
  );
  assert.ok(gridWidth >= 5);
  assert.ok(gridHeight >= 7);
});

test('inferGridDimensions: heart from param footprint', () => {
  const { gridWidth, gridHeight } = inferGridDimensions(
    {
      templateId: 'heart',
      templateParams: { radius: 4, thickness: 1 },
      layering: {
        minZ: 0,
        maxZ: 1,
        maxStackPerCell: 3,
        layerShape: 'full'
      }
    },
    inferCtx
  );
  assert.equal(gridWidth, 8);
  assert.equal(gridHeight, 9);
});

test('inferGridDimensions: heart needs radius or both radii', () => {
  assert.throws(
    () =>
      inferGridDimensions(
        {
          templateId: 'heart',
          templateParams: { radiusX: 4, thickness: 1 },
          layering: {
            minZ: 0,
            maxZ: 1,
            maxStackPerCell: 3,
            layerShape: 'full'
          }
        },
        inferCtx
      ),
    /radius/
  );
});

test('inferGridDimensions: circle with only radiusY throws', () => {
  assert.throws(
    () =>
      inferGridDimensions(
        {
          templateId: 'circle',
          templateParams: { radiusY: 4 },
          layering: { minZ: 0, maxZ: 1, maxStackPerCell: 3, layerShape: 'full' }
        },
        inferCtx
      ),
    /radius/
  );
});

test('resolveBatchGrid: explicit grid unchanged', () => {
  assert.deepEqual(resolveBatchGrid({ gridWidth: 8, gridHeight: 10 }, null), { gridWidth: 8, gridHeight: 10 });
});

test('resolveBatchGrid: omitted grid requires inferCtx', () => {
  assert.throws(() => resolveBatchGrid({ templateId: 'diamond', templateParams: { radius: 3 } }, null), /inferCtx/);
});

test('generateOneLevel infers grid when ctx provided', () => {
  const rng = mulberry32(99);
  const level = generateOneLevel(
    rng,
    {
      templateId: 'hexagon',
      templateParams: { radius: 4 },
      tileTypeCount: 6,
      distribution: { mode: 'zipf', totalTriplets: 8, exponent: 0.5 },
      layering: { minZ: 0, maxZ: 2, maxStackPerCell: 3, layerShape: 'full' }
    },
    422,
    { seed: 1, batchIndex: 2, slotIndex: 3 }
  );
  assert.ok(Number.isInteger(level.gridWidth));
  assert.ok(Number.isInteger(level.gridHeight));
  assert.ok(level.layout.length > 0);
});
