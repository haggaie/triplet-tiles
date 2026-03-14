/**
 * Silhouette / shape utilities for level generation.
 * Used to derive fill order and per-layer silhouettes (pyramid, shift).
 */

function keyXY(x, y) {
  return `${x},${y}`;
}

function inBounds(x, y, gridSize) {
  return x >= 0 && y >= 0 && x < gridSize && y < gridSize;
}

/**
 * Returns a deterministic fill order for the given cells.
 * Order: row-by-row (y ascending, then x ascending) so the shape fills cleanly.
 * @param {Array<{x: number, y: number}>} cells
 * @returns {Array<{x: number, y: number}>} same cells, sorted for fill order
 */
function getFillOrder(cells) {
  return [...cells].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });
}

/**
 * Build a Set of "x,y" keys for fast membership.
 */
function cellSet(cells) {
  const set = new Set();
  for (const c of cells) set.add(keyXY(c.x, c.y));
  return set;
}

/**
 * Shrink the silhouette by one tile: keep only cells that have all four
 * cardinal neighbors (up, down, left, right) inside the silhouette.
 * Produces a "pyramid" inner layer.
 * @param {Array<{x: number, y: number}>} cells
 * @param {number} gridSize
 * @returns {Array<{x: number, y: number}>} interior cells only
 */
function shrinkSilhouette(cells, gridSize) {
  const set = cellSet(cells);
  const out = [];
  for (const { x, y } of cells) {
    if (!inBounds(x, y, gridSize)) continue;
    const hasL = set.has(keyXY(x - 1, y));
    const hasR = set.has(keyXY(x + 1, y));
    const hasU = set.has(keyXY(x, y - 1));
    const hasD = set.has(keyXY(x, y + 1));
    if (hasL && hasR && hasU && hasD) out.push({ x, y });
  }
  return out;
}

/**
 * Shrink the silhouette N times. Returns an array of silhouettes:
 * [base, shrunk once, shrunk twice, ...] up to N+1 levels, stopping when
 * a shrink yields no cells.
 * @param {Array<{x: number, y: number}>} cells
 * @param {number} gridSize
 * @param {number} steps max number of shrink steps
 * @returns {Array<Array<{x: number, y: number}>>}
 */
function pyramidSilhouettes(cells, gridSize, steps = 10) {
  const result = [cells];
  let current = cells;
  for (let i = 0; i < steps; i += 1) {
    const next = shrinkSilhouette(current, gridSize);
    if (next.length === 0) break;
    result.push(next);
    current = next;
  }
  return result;
}

/**
 * Shift the silhouette by (dx, dy) and clip to grid.
 * @param {Array<{x: number, y: number}>} cells
 * @param {number} dx
 * @param {number} dy
 * @param {number} gridSize
 * @returns {Array<{x: number, y: number}>}
 */
function shiftSilhouette(cells, dx, dy, gridSize) {
  const out = [];
  for (const { x, y } of cells) {
    const nx = x + dx;
    const ny = y + dy;
    if (inBounds(nx, ny, gridSize)) out.push({ x: nx, y: ny });
  }
  return out;
}

/**
 * Get the silhouette for a given layer index (0 = base) using the chosen strategy.
 * @param {Array<{x: number, y: number}>} baseCells
 * @param {number} gridSize
 * @param {string} layerShape 'full' | 'pyramid' | 'shift'
 * @param {number} layerIndex 0-based layer index (0 = bottom)
 * @param {{ shiftDx?: number, shiftDy?: number }} options for 'shift': per-layer delta (default 1,0 then 0,1 alternating)
 * @returns {Array<{x: number, y: number}>} cells allowed for that layer
 */
function getLayerSilhouette(baseCells, gridSize, layerShape, layerIndex, options = {}) {
  if (layerIndex === 0) return baseCells;

  switch (layerShape) {
    case 'full':
      return baseCells;

    case 'pyramid': {
      const pyramids = pyramidSilhouettes(baseCells, gridSize, layerIndex + 1);
      const idx = Math.min(layerIndex, pyramids.length - 1);
      return pyramids[idx].length > 0 ? pyramids[idx] : baseCells;
    }

    case 'shift': {
      const perLayerDx = options.shiftDx != null ? options.shiftDx : 1;
      const perLayerDy = options.shiftDy != null ? options.shiftDy : 0;
      const shifted = shiftSilhouette(baseCells, perLayerDx * layerIndex, perLayerDy * layerIndex, gridSize);
      return shifted.length > 0 ? shifted : baseCells;
    }

    default:
      return baseCells;
  }
}

module.exports = {
  getFillOrder,
  shrinkSilhouette,
  pyramidSilhouettes,
  shiftSilhouette,
  getLayerSilhouette,
  cellSet,
  keyXY,
  inBounds
};
