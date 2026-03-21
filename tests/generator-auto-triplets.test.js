const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  mulberry32,
  buildLayerCellsByIndex,
  computeMaxTilesFromLayers,
  resolveTotalTripletsFromCapacity,
  generateOneLevel
} = require('../tools/levelgen/generator');
const { getTemplateCells } = require('../tools/levelgen/templates');

test('computeMaxTilesFromLayers sums layer sizes', () => {
  const layers = [[{ x: 0, y: 0 }], [{ x: 0, y: 0 }, { x: 1, y: 0 }]];
  assert.equal(computeMaxTilesFromLayers(layers), 3);
});

test('resolveTotalTripletsFromCapacity: floor fillRatio and respect maxTiles', () => {
  assert.equal(resolveTotalTripletsFromCapacity(30, {}), 10);
  assert.equal(resolveTotalTripletsFromCapacity(30, { fillRatio: 0.5 }), 5);
});

test('resolveTotalTripletsFromCapacity: clamps then fits to maxTiles', () => {
  assert.equal(resolveTotalTripletsFromCapacity(30, { clampMin: 15 }), 10);
  assert.equal(resolveTotalTripletsFromCapacity(100, { clampMax: 8 }), 8);
});

test('generateOneLevel with totalTriplets auto fills to derived triplet count (full layers)', () => {
  const rng = mulberry32(99_001);
  const batch = {
    templateId: 'rectangle',
    templateParams: { width: 5, height: 5 },
    gridWidth: 7,
    gridHeight: 7,
    tileTypeCount: 4,
    distribution: { mode: 'zipf', totalTriplets: 'auto', exponent: 0.5 },
    layering: {
      minZ: 0,
      maxZ: 1,
      overlap: 'light',
      maxStackPerCell: 3,
      full: true,
      layerShape: 'full'
    }
  };
  const templateCells = getTemplateCells(batch.templateId, batch.templateParams, batch.gridWidth, batch.gridHeight);
  const maxTiles = computeMaxTilesFromLayers(
    buildLayerCellsByIndex(templateCells, batch.gridWidth, batch.gridHeight, batch.layering, mulberry32(0))
  );
  const expectedTiles = resolveTotalTripletsFromCapacity(maxTiles, {}) * 3;
  const level = generateOneLevel(rng, batch, 1);
  assert.equal(level.layout.length, expectedTiles);
  assert.equal(level.layout.length % 3, 0);
});
