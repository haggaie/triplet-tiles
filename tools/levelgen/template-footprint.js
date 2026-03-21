/**
 * Footprint AABBs aligned with tile-layering.js (unit squares in cell space).
 */

const { tileCenterInCells } = require('../../tile-layering.js');

/**
 * Axis-aligned bounds of a tile footprint: center ± 0.5 in x and y (cell coordinates).
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {{ minX: number, maxX: number, minY: number, maxY: number }}
 */
function tileFootprintAabb(x, y, z) {
  const { cx, cy } = tileCenterInCells({ x, y, z });
  return {
    minX: cx - 0.5,
    maxX: cx + 0.5,
    minY: cy - 0.5,
    maxY: cy + 0.5
  };
}

/**
 * Unit cell [gx, gx+1] × [gy, gy+1] in continuous cell coordinates.
 */
function cellUnitSquareAabb(gx, gy) {
  return {
    minX: gx,
    maxX: gx + 1,
    minY: gy,
    maxY: gy + 1
  };
}

function aabbIntersects(a, b) {
  if (a.maxX <= b.minX || b.maxX <= a.minX) return false;
  if (a.maxY <= b.minY || b.maxY <= a.minY) return false;
  return true;
}

/**
 * True if tile footprint at (x,y,z) intersects any unit square of legacyCells.
 * @param {Array<{x:number,y:number}>} legacyCells
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
function footprintIntersectsLegacyUnion(legacyCells, x, y, z) {
  const F = tileFootprintAabb(x, y, z);
  for (const c of legacyCells) {
    if (aabbIntersects(F, cellUnitSquareAabb(c.x, c.y))) return true;
  }
  return false;
}

/**
 * Expand integer cell set by z-aware footprint: include any (gx, gy) in bounds whose footprint
 * intersects the union of unit squares of legacyCells.
 * @param {Array<{x:number,y:number}>} legacyCells
 * @param {number} z
 * @param {number} gridWidth
 * @param {number} gridHeight
 * @returns {Array<{x:number,y:number}>}
 */
function expandCellsByFootprintUnion(legacyCells, z, gridWidth, gridHeight) {
  if (legacyCells.length === 0) return [];
  let minGx = Infinity;
  let maxGx = -Infinity;
  let minGy = Infinity;
  let maxGy = -Infinity;
  for (const c of legacyCells) {
    minGx = Math.min(minGx, c.x);
    maxGx = Math.max(maxGx, c.x);
    minGy = Math.min(minGy, c.y);
    maxGy = Math.max(maxGy, c.y);
  }
  const pad = 3;
  const out = [];
  for (let gx = Math.max(0, minGx - pad); gx <= Math.min(gridWidth - 1, maxGx + pad); gx += 1) {
    for (let gy = Math.max(0, minGy - pad); gy <= Math.min(gridHeight - 1, maxGy + pad); gy += 1) {
      if (footprintIntersectsLegacyUnion(legacyCells, gx, gy, z)) {
        out.push({ x: gx, y: gy });
      }
    }
  }
  return out;
}

module.exports = {
  tileFootprintAabb,
  cellUnitSquareAabb,
  aabbIntersects,
  footprintIntersectsLegacyUnion,
  expandCellsByFootprintUnion
};
