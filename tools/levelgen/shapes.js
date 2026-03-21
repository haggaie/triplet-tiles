/**
 * Silhouette / shape utilities for level generation.
 * Used to derive fill order and per-layer silhouettes (pyramid, shift).
 */

function keyXY(x, y) {
  return `${x},${y}`;
}

function inBounds(x, y, gridWidth, gridHeight) {
  return x >= 0 && y >= 0 && x < gridWidth && y < gridHeight;
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
 * When only n &lt; m cells are placed, using the first n entries of row-major fill order
 * clumps tiles at low y. Pick n indices spread along the sorted order instead.
 * @param {Array<{x: number, y: number}>} sortedFillOrder result of {@link getFillOrder}
 * @param {number} n how many cells to use (≤ sortedFillOrder.length)
 */
function subsetFillOrderEvenly(sortedFillOrder, n) {
  const m = sortedFillOrder.length;
  if (n <= 0) return [];
  if (n >= m) return [...sortedFillOrder];
  const out = [];
  for (let j = 0; j < n; j += 1) {
    const idx = Math.floor((j + 0.5) * m / n);
    out.push(sortedFillOrder[idx]);
  }
  return out;
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
 * Shrink the silhouette by one step: keep cells that have at least
 * `minCardinalNeighbors` of their four cardinal neighbors inside the silhouette.
 * Default 2 works well for thin shapes (e.g. cross arms); use 4 for strict interior
 * (all four neighbors in-set), matching the original pyramid behavior.
 * @param {Array<{x: number, y: number}>} cells
 * @param {number} gridWidth
 * @param {number} gridHeight
 * @param {number} [minCardinalNeighbors=2] clamped to 1..4
 * @returns {Array<{x: number, y: number}>}
 */
function shrinkSilhouette(cells, gridWidth, gridHeight, minCardinalNeighbors = 2) {
  const k = Math.max(1, Math.min(4, Number(minCardinalNeighbors) || 2));
  const set = cellSet(cells);
  const out = [];
  for (const { x, y } of cells) {
    if (!inBounds(x, y, gridWidth, gridHeight)) continue;
    let n = 0;
    if (set.has(keyXY(x - 1, y))) n += 1;
    if (set.has(keyXY(x + 1, y))) n += 1;
    if (set.has(keyXY(x, y - 1))) n += 1;
    if (set.has(keyXY(x, y + 1))) n += 1;
    if (n >= k) out.push({ x, y });
  }
  return out;
}

/**
 * Shrink the silhouette N times. Returns an array of silhouettes:
 * [base, shrunk once, shrunk twice, ...] up to N+1 levels, stopping when
 * a shrink yields no cells.
 * @param {Array<{x: number, y: number}>} cells
 * @param {number} gridWidth
 * @param {number} gridHeight
 * @param {number} steps max number of shrink steps
 * @param {number} [minCardinalNeighbors=2] passed to {@link shrinkSilhouette}
 * @returns {Array<Array<{x: number, y: number}>>}
 */
function pyramidSilhouettes(cells, gridWidth, gridHeight, steps = 10, minCardinalNeighbors = 2) {
  const result = [cells];
  let current = cells;
  for (let i = 0; i < steps; i += 1) {
    const next = shrinkSilhouette(current, gridWidth, gridHeight, minCardinalNeighbors);
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
 * @param {number} gridWidth
 * @param {number} gridHeight
 * @returns {Array<{x: number, y: number}>}
 */
function shiftSilhouette(cells, dx, dy, gridWidth, gridHeight) {
  const out = [];
  for (const { x, y } of cells) {
    const nx = x + dx;
    const ny = y + dy;
    if (inBounds(nx, ny, gridWidth, gridHeight)) out.push({ x: nx, y: ny });
  }
  return out;
}

function randomInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function isConnected(cells) {
  if (cells.length <= 1) return true;
  const set = cellSet(cells);
  const q = [cells[0]];
  const visited = new Set([keyXY(cells[0].x, cells[0].y)]);
  while (q.length > 0) {
    const cur = q.pop();
    const nbrs = [
      { x: cur.x + 1, y: cur.y },
      { x: cur.x - 1, y: cur.y },
      { x: cur.x, y: cur.y + 1 },
      { x: cur.x, y: cur.y - 1 }
    ];
    for (const n of nbrs) {
      const k = keyXY(n.x, n.y);
      if (!set.has(k) || visited.has(k)) continue;
      visited.add(k);
      q.push(n);
    }
  }
  return visited.size === cells.length;
}

function edgeCells(cells) {
  const set = cellSet(cells);
  const out = [];
  for (const c of cells) {
    const hasL = set.has(keyXY(c.x - 1, c.y));
    const hasR = set.has(keyXY(c.x + 1, c.y));
    const hasU = set.has(keyXY(c.x, c.y - 1));
    const hasD = set.has(keyXY(c.x, c.y + 1));
    if (!(hasL && hasR && hasU && hasD)) out.push(c);
  }
  return out;
}

function randomErosionSilhouette(baseCells, gridWidth, gridHeight, layerIndex, options = {}, rng) {
  const random = typeof rng === 'function' ? rng : Math.random;
  if (layerIndex <= 0) return baseCells;

  const baseCount = Math.max(1, baseCells.length);
  const erosionRate = Math.max(0, Math.min(1, options.erosionRate == null ? 0.2 : options.erosionRate));
  const minCellFraction = Math.max(0.05, Math.min(1, options.minCellFraction == null ? 0.1 : options.minCellFraction));
  const minCells = Math.max(1, Math.floor(baseCount * minCellFraction));
  const allowShift = options.allowShift === true;
  let current = [...baseCells];

  for (let step = 0; step < layerIndex; step += 1) {
    if (current.length <= minCells) break;
    const boundary = edgeCells(current);
    if (boundary.length === 0) break;
    const removeCount = Math.max(1, Math.min(boundary.length, Math.floor(boundary.length * erosionRate)));
    const order = [...boundary];
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }

    const removeKeys = new Set();
    for (const c of order) {
      if (removeKeys.size >= removeCount) break;
      if (current.length - removeKeys.size - 1 < minCells) break;
      removeKeys.add(keyXY(c.x, c.y));
      const candidate = current.filter(p => !removeKeys.has(keyXY(p.x, p.y)));
      if (!isConnected(candidate)) {
        removeKeys.delete(keyXY(c.x, c.y));
      }
    }
    const next = current.filter(c => !removeKeys.has(keyXY(c.x, c.y)));
    if (next.length < minCells || next.length === 0) break;
    current = next;
  }

  if (allowShift && layerIndex > 0) {
    const dx = randomInt(random, -1, 1);
    const dy = randomInt(random, -1, 1);
    const shifted = shiftSilhouette(current, dx, dy, gridWidth, gridHeight);
    if (shifted.length >= minCells) current = shifted;
  }

  return current.length > 0 ? current : baseCells;
}

/**
 * Get the silhouette for a given layer index (0 = base) using the chosen strategy.
 * @param {Array<{x: number, y: number}>} baseCells
 * @param {number} gridWidth
 * @param {number} gridHeight
 * @param {string} layerShape 'full' | 'pyramid' | 'shift'
 * @param {number} layerIndex 0-based layer index (0 = bottom)
 * @param {{ shiftDx?: number, shiftDy?: number, erosionRate?: number, minCellFraction?: number, allowShift?: boolean, pyramidMinNeighbors?: number }} options
 * @param {Function} [rng]
 * @returns {Array<{x: number, y: number}>} cells allowed for that layer
 */
function getLayerSilhouette(baseCells, gridWidth, gridHeight, layerShape, layerIndex, options = {}, rng) {
  if (layerIndex === 0) return baseCells;

  switch (layerShape) {
    case 'full':
      return baseCells;

    case 'pyramid': {
      const minN = options.pyramidMinNeighbors != null ? options.pyramidMinNeighbors : 2;
      const pyramids = pyramidSilhouettes(baseCells, gridWidth, gridHeight, layerIndex + 1, minN);
      const idx = Math.min(layerIndex, pyramids.length - 1);
      return pyramids[idx].length > 0 ? pyramids[idx] : baseCells;
    }

    case 'shift': {
      const perLayerDx = options.shiftDx != null ? options.shiftDx : 1;
      const perLayerDy = options.shiftDy != null ? options.shiftDy : 0;
      const shifted = shiftSilhouette(
        baseCells,
        perLayerDx * layerIndex,
        perLayerDy * layerIndex,
        gridWidth,
        gridHeight
      );
      return shifted.length > 0 ? shifted : baseCells;
    }

    case 'randomErosion':
      return randomErosionSilhouette(baseCells, gridWidth, gridHeight, layerIndex, options, rng);

    default:
      return baseCells;
  }
}

module.exports = {
  getFillOrder,
  subsetFillOrderEvenly,
  shrinkSilhouette,
  pyramidSilhouettes,
  shiftSilhouette,
  getLayerSilhouette,
  cellSet,
  keyXY,
  inBounds
};
