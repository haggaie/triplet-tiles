const { getTemplateCells } = require('./templates');
const { getFillOrder, getLayerSilhouette, subsetFillOrderEvenly } = require('./shapes');

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function choice(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffleInPlace(rng, arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function weightedTripletsToCounts(totalTriplets, weights, tileTypes, options = {}) {
  if (!Number.isInteger(totalTriplets) || totalTriplets <= 0) {
    throw new Error(`totalTriplets must be a positive integer (got ${totalTriplets})`);
  }
  const wSum = tileTypes.reduce((sum, t) => sum + (weights[t] || 0), 0);
  if (wSum <= 0) throw new Error('weights must sum to > 0');

  const minTripletsPerType = Number.isInteger(options.minTripletsPerType) ? options.minTripletsPerType : 0;
  const minNeeded = minTripletsPerType * tileTypes.length;
  if (minNeeded > totalTriplets) {
    throw new Error(`minTripletsPerType=${minTripletsPerType} is too high for totalTriplets=${totalTriplets}`);
  }

  const triplets = {};
  tileTypes.forEach(t => {
    triplets[t] = minTripletsPerType;
  });

  let allocated = 0;
  const distributableTriplets = totalTriplets - minNeeded;
  tileTypes.forEach(t => {
    const w = weights[t] || 0;
    const n = Math.floor((w / wSum) * distributableTriplets);
    triplets[t] += n;
    allocated += n;
  });

  const remaining = distributableTriplets - allocated;
  const ordered = tileTypes
    .slice()
    .sort((a, b) => (weights[b] || 0) - (weights[a] || 0));
  for (let i = 0; i < remaining; i += 1) {
    triplets[ordered[i % ordered.length]] += 1;
  }

  const counts = {};
  tileTypes.forEach(t => {
    counts[t] = triplets[t] * 3;
  });
  return counts;
}

function distributionToCounts(distribution, tileTypes) {
  if (!distribution || typeof distribution !== 'object') {
    throw new Error('distribution is required');
  }

  if (distribution.mode === 'explicitCounts') {
    const counts = distribution.explicitCounts || {};
    const out = {};
    tileTypes.forEach(t => {
      const n = counts[t] || 0;
      if (n % 3 !== 0) {
        throw new Error(`explicitCounts for "${t}" must be multiple of 3 (got ${n})`);
      }
      out[t] = n;
    });
    const total = Object.values(out).reduce((a, b) => a + b, 0);
    if (total === 0) throw new Error('explicitCounts produced 0 tiles');
    return out;
  }

  if (distribution.mode === 'weightedTriplets') {
    const weights = distribution.weights || {};
    return weightedTripletsToCounts(distribution.totalTriplets, weights, tileTypes);
  }

  if (distribution.mode === 'zipf') {
    const totalTriplets = distribution.totalTriplets;
    const exponent = typeof distribution.exponent === 'number' ? distribution.exponent : 1;
    if (!Number.isFinite(exponent) || exponent < 0) {
      throw new Error(`zipf.exponent must be a finite number >= 0 (got ${distribution.exponent})`);
    }
    const order = Array.isArray(distribution.order) && distribution.order.length > 0
      ? distribution.order
      : tileTypes;
    const rankWeights = {};
    order.forEach((t, idx) => {
      if (!tileTypes.includes(t)) return;
      rankWeights[t] = 1 / ((idx + 1) ** exponent);
    });
    tileTypes.forEach(t => {
      if (rankWeights[t] == null) rankWeights[t] = 1e-9;
    });
    const minTripletsPerType = totalTriplets >= tileTypes.length ? 1 : 0;
    return weightedTripletsToCounts(totalTriplets, rankWeights, tileTypes, { minTripletsPerType });
  }

  throw new Error(`Unknown distribution mode "${distribution.mode}"`);
}

/**
 * Random permutation of tile types from `countsByType` (uniform multiset shuffle).
 * No tray-feasibility or difficulty shaping — solvability is left to generate-then-validate.
 * @param {object} [_options] Ignored; kept for backward-compatible call sites.
 */
function buildTypeSequence(rng, countsByType, _options = {}) {
  const bag = [];
  Object.entries(countsByType).forEach(([type, count]) => {
    for (let i = 0; i < count; i += 1) bag.push(type);
  });
  if (bag.length === 0) {
    throw new Error('buildTypeSequence: empty tile counts');
  }
  shuffleInPlace(rng, bag);
  return bag;
}

function overlapBias(overlap) {
  switch (overlap) {
    case 'heavy':
      return 0.75;
    case 'medium':
      return 0.45;
    case 'light':
    default:
      return 0.2;
  }
}

/**
 * Distribute tile indices to layers when using fill-bottom + per-layer silhouettes.
 * Base layer (layerIndex 0) gets nBase tiles; remaining tiles fill upper layers in order
 * (lower z first): each layer is filled up to its capacity before any tiles go to the next.
 */
function partitionTilesToLayers(seqLength, nBase, layerCapacities) {
  const rest = seqLength - nBase;
  if (rest <= 0) {
    return [nBase].concat(layerCapacities.map(() => 0));
  }
  const counts = [];
  let remaining = rest;
  for (let k = 0; k < layerCapacities.length; k += 1) {
    const cap = layerCapacities[k];
    const n = Math.min(cap, remaining);
    counts.push(n);
    remaining -= n;
  }
  if (remaining > 0) {
    for (let k = 0; k < counts.length && remaining > 0; k += 1) {
      const extra = Math.min(remaining, layerCapacities[k] - counts[k]);
      if (extra > 0) {
        counts[k] += extra;
        remaining -= extra;
      }
    }
  }
  return [nBase, ...counts];
}

function generateLayoutFromSequence(rng, templateCells, seq, gridSize, layering) {
  const { minZ, maxZ, overlap, maxStackPerCell, full, layerShape, layerShapeOptions, interleavePlacement } = layering;
  const minLayer = Number.isInteger(minZ) ? minZ : 0;
  const maxLayer = Number.isInteger(maxZ) ? maxZ : 1;
  if (maxLayer < minLayer) throw new Error('layering.maxZ must be >= minZ');

  const numLayers = maxLayer - minLayer + 1;
  const useFullFill = full === true;
  const shapeStrategy = layerShape || 'full';
  const shapeOpts = layerShapeOptions || {};

  // Per-layer silhouettes: layerIndex 0 = base (minZ), 1 = minZ+1, ...
  const layerCellsByIndex = [];
  for (let layerIdx = 0; layerIdx < numLayers; layerIdx += 1) {
    layerCellsByIndex.push(
      getLayerSilhouette(templateCells, gridSize, shapeStrategy, layerIdx, shapeOpts, rng)
    );
  }

  const baseCells = layerCellsByIndex[0];
  // When full is true, we fill every layer in deterministic order.
  const fillOrdersByLayer = useFullFill
    ? layerCellsByIndex.map(cells => getFillOrder(cells))
    : null;

  let stackCap = Math.max(1, maxStackPerCell || 2);
  const neededCap = Math.ceil(seq.length / Math.max(1, templateCells.length));
  if (neededCap > stackCap) stackCap = Math.min(6, neededCap);

  const usedPositions = new Set();
  const posKey = (cx, cy, cz) => `${cx},${cy},${cz}`;
  const bias = overlapBias(overlap);

  let layerCounts;
  if (useFullFill && numLayers >= 2) {
    const nBase = Math.min(seq.length, baseCells.length);
    const upperCaps = layerCellsByIndex.slice(1).map(cells => cells.length);
    layerCounts = partitionTilesToLayers(seq.length, nBase, upperCaps);
  } else if (useFullFill && numLayers === 1) {
    layerCounts = [seq.length];
  } else {
    const caps = layerCellsByIndex.map(c => c.length);
    let left = seq.length;
    layerCounts = [];
    for (let k = 0; k < numLayers; k += 1) {
      const cap = caps[k];
      const n = Math.min(cap, left);
      layerCounts.push(n);
      left -= n;
    }
    if (left > 0) {
      for (let k = 0; k < numLayers && left > 0; k += 1) {
        const extra = Math.min(left, caps[k] - layerCounts[k]);
        if (extra > 0) {
          layerCounts[k] += extra;
          left -= extra;
        }
      }
    }
    if (left > 0) {
      throw new Error(
        `total layer capacity ${caps.reduce((a, b) => a + b, 0)} < ${seq.length} tiles; ` +
        'use layerShape "full" or reduce tile count'
      );
    }
  }

  const stackCount = new Map();
  const layout = [];
  let seqIndex = 0;
  const useInterleave = interleavePlacement === true && useFullFill;

  for (let layerIdx = 0; layerIdx < numLayers; layerIdx += 1) {
    const z = minLayer + layerIdx;
    const cells = layerCellsByIndex[layerIdx];
    const n = layerCounts[layerIdx] || 0;
    const fillOrder = fillOrdersByLayer ? fillOrdersByLayer[layerIdx] : null;

    if (useFullFill && fillOrder && n > 0) {
      const baseSeqIndex = seqIndex;
      seqIndex += n;
      const placedCells = n >= fillOrder.length
        ? fillOrder
        : subsetFillOrderEvenly(fillOrder, n);
      let positionToSeqIndex;
      if (useInterleave && n > 1) {
        const indices = Array.from({ length: n }, (_, i) => i);
        shuffleInPlace(rng, indices);
        positionToSeqIndex = (j) => baseSeqIndex + indices[j];
      } else {
        positionToSeqIndex = (j) => baseSeqIndex + j;
      }
      for (let j = 0; j < n; j += 1) {
        const seqIdx = positionToSeqIndex(j);
        const type = seq[seqIdx];
        const cell = placedCells[j];
        usedPositions.add(posKey(cell.x, cell.y, z));
        const k = `${cell.x},${cell.y}`;
        stackCount.set(k, (stackCount.get(k) || 0) + 1);
        layout.push({ type, x: cell.x, y: cell.y, z });
      }
      continue;
    }

    for (let j = 0; j < n && seqIndex < seq.length; j += 1) {
      const type = seq[seqIndex++];
      const canStack = [];
      const canUse = [];
      for (const c of cells) {
        if (usedPositions.has(posKey(c.x, c.y, z))) continue;
        const used = stackCount.get(`${c.x},${c.y}`) || 0;
        if (used < stackCap) {
          canUse.push(c);
          if (used > 0) canStack.push(c);
        }
      }
      if (canUse.length === 0) {
        throw new Error(
          `no free (x,y,z) slot at z=${z} (layer cells=${cells.length}, stackCap=${stackCap}); ` +
          'try layerShape "full" or fewer tiles'
        );
      }
      const cell = (canStack.length > 0 && rng() < bias)
        ? choice(rng, canStack)
        : choice(rng, canUse);
      const k = `${cell.x},${cell.y}`;
      stackCount.set(k, (stackCount.get(k) || 0) + 1);
      usedPositions.add(posKey(cell.x, cell.y, z));
      layout.push({ type, x: cell.x, y: cell.y, z });
    }
  }

  if (layout.length < seq.length) {
    throw new Error(
      `layout placed ${layout.length} tiles but sequence has ${seq.length}; ` +
      'layer capacities may be too small'
    );
  }

  const usedZ = new Set(layout.map(t => t.z));
  if (usedZ.size < 2 && maxLayer > minLayer) {
    let moved = 0;
    for (let i = 0; i < layout.length && moved < 3; i += 1) {
      const t = layout[i];
      if (t.z === maxLayer) continue;
      const key = posKey(t.x, t.y, maxLayer);
      if (usedPositions.has(key)) continue;
      usedPositions.delete(posKey(t.x, t.y, t.z));
      usedPositions.add(key);
      t.z = maxLayer;
      moved += 1;
    }
  }

  return layout;
}

function generateOneLevel(rng, batch, levelId) {
  const templateCells = getTemplateCells(batch.templateId, batch.templateParams, batch.gridSize);
  const countsByType = distributionToCounts(batch.distribution, batch.tileTypes);
  const seq = buildTypeSequence(rng, countsByType);
  const layout = generateLayoutFromSequence(rng, templateCells, seq, batch.gridSize, batch.layering);
  return {
    id: levelId,
    name: `${String(batch.templateId).toUpperCase()} ${levelId}`,
    gridSize: batch.gridSize,
    difficultyScore: 0,
    layout
  };
}

function generateLevelsFromConfig(config) {
  const seed = Number.isFinite(config.seed) ? config.seed : 1;
  const rng = mulberry32(seed);

  const levels = [];
  let nextId = 1;
  for (const batch of config.levels) {
    const count = Math.max(1, batch.count || 1);
    for (let i = 0; i < count; i += 1) {
      // Per-level RNG fork for reproducibility while keeping batches stable.
      const levelSeed = Math.floor(rng() * 2 ** 31) ^ (nextId * 2654435761);
      const levelRng = mulberry32(levelSeed);
      levels.push(generateOneLevel(levelRng, batch, nextId));
      nextId += 1;
    }
  }

  return { levels, meta: { seed } };
}

const DEFAULT_POOL_PARAM_RANGES = {
  templateIds: ['rectangle', 'diamond', 'heart', 'spiral', 'letter', 'circle', 'triangle', 'hexagon', 'cross', 'ring', 't', 'u'],
  gridSizes: [7, 8, 9, 10],
  numTypesMin: 6,
  numTypesMax: 12,
  totalTripletsMin: 15,
  totalTripletsMax: 45,
  maxZMin: 3,
  maxZMax: 9,
  overlaps: ['medium', 'heavy'],
  layerShapes: ['full', 'pyramid', 'shift', 'randomErosion'],
  maxStackPerCellMin: 3,
  maxStackPerCellMax: 6,
  zipfExponentMin: 0.3,
  zipfExponentMax: 2
};

function sampleTemplateParams(templateId, gridSize, rng) {
  const id = String(templateId).toLowerCase();
  const g = Number.isInteger(gridSize) ? gridSize : 11;
  switch (id) {
    case 'rectangle': {
      const w = Math.max(3, Math.floor(g * 0.5) + Math.floor(rng() * Math.floor(g * 0.3)));
      const h = Math.max(3, Math.floor(g * 0.5) + Math.floor(rng() * Math.floor(g * 0.3)));
      return { width: w, height: h };
    }
    case 'diamond':
      return { radius: 3 + Math.floor(rng() * 3) };
    case 'heart':
      return { radius: 3 + Math.floor(rng() * 2), thickness: 1 + Math.floor(rng() * 2) };
    case 'spiral':
      return { radius: 3 + Math.floor(rng() * 2), thickness: 1 + Math.floor(rng() * 2) };
    case 'circle':
      return { radius: 3 + Math.floor(rng() * 3) };
    case 'triangle':
      return { radius: 3 + Math.floor(rng() * 3) };
    case 'hexagon':
      return { radius: 3 + Math.floor(rng() * 2) };
    case 'cross':
      return { radius: 3 + Math.floor(rng() * 3), thickness: 1 + Math.floor(rng() * 3) };
    case 'ring':
      return { radius: 4 + Math.floor(rng() * 2), thickness: 1 + Math.floor(rng() * 2) };
    case 't':
      return { radius: 4 + Math.floor(rng() * 2), thickness: 1 + Math.floor(rng() * 2) };
    case 'u':
      return { radius: 4 + Math.floor(rng() * 2), thickness: 1 + Math.floor(rng() * 2) };
    case 'letter':
      return {
        letter: rng() < 0.5 ? 'S' : 'C',
        radius: 4 + Math.floor(rng() * 2),
        thickness: 1 + Math.floor(rng() * 2)
      };
    default:
      return { radius: 4 };
  }
}

/**
 * Generate one level by sampling from param ranges. Returns null if layout generation throws.
 */
function generateOneRandomLevel(rng, levelId, paramRanges = {}) {
  const ranges = { ...DEFAULT_POOL_PARAM_RANGES, ...paramRanges };
  const tileTypesPool = ranges.tileTypesPool;
  if (!Array.isArray(tileTypesPool) || tileTypesPool.length < 3) {
    throw new Error('paramRanges.tileTypesPool must be an array of at least 3 tile type ids');
  }

  const templateId = choice(rng, ranges.templateIds);
  const gridSize = choice(rng, ranges.gridSizes);
  const templateParams = sampleTemplateParams(templateId, gridSize, rng);

  const numTypesMin = Math.max(2, ranges.numTypesMin ?? 4);
  const numTypesMax = Math.min(tileTypesPool.length, ranges.numTypesMax ?? 12);
  const numTypes = numTypesMin + Math.floor(rng() * (numTypesMax - numTypesMin + 1));
  const shuffled = tileTypesPool.slice();
  shuffleInPlace(rng, shuffled);
  const tileTypes = shuffled.slice(0, numTypes);

  const tripletsMin = Math.max(5, ranges.totalTripletsMin ?? 15);
  const tripletsMax = Math.min(50, ranges.totalTripletsMax ?? 40);
  const totalTriplets = tripletsMin + Math.floor(rng() * (tripletsMax - tripletsMin + 1));

  const zipfExponentMin = ranges.zipfExponentMin ?? 0.3;
  const zipfExponentMax = ranges.zipfExponentMax ?? 2.0;
  const exponent = zipfExponentMin + (rng() * (zipfExponentMax - zipfExponentMin));
  const order = tileTypes.slice();
  shuffleInPlace(rng, order);
  const distribution = {
    mode: 'zipf',
    totalTriplets,
    exponent,
    order
  };

  const maxZMin = Math.max(1, ranges.maxZMin ?? 2);
  const maxZMax = Math.min(4, ranges.maxZMax ?? 3);
  const maxZ = maxZMin + Math.floor(rng() * (maxZMax - maxZMin + 1));
  const overlap = choice(rng, ranges.overlaps);
  const layerShape = choice(rng, ranges.layerShapes);
  const mscMin = ranges.maxStackPerCellMin ?? 3;
  const mscMax = ranges.maxStackPerCellMax ?? 4;
  const maxStackPerCell = mscMin + Math.floor(rng() * (mscMax - mscMin + 1));

  const layering = {
    minZ: 0,
    maxZ,
    overlap,
    maxStackPerCell,
    full: true,
    layerShape,
    layerShapeOptions: {
      erosionRate: 0.15 + rng() * 0.2,
      minCellFraction: 0.08 + rng() * 0.1,
      allowShift: rng() < 0.65
    }
  };

  try {
    const templateCells = getTemplateCells(templateId, templateParams, gridSize);
    const countsByType = distributionToCounts(distribution, tileTypes);
    const seq = buildTypeSequence(rng, countsByType);
    const layout = generateLayoutFromSequence(rng, templateCells, seq, gridSize, layering);
    return {
      id: levelId,
      name: `${String(templateId).toUpperCase()} ${levelId}`,
      gridSize,
      difficultyScore: 0,
      layout
    };
  } catch {
    return null;
  }
}

module.exports = {
  generateLevelsFromConfig,
  generateOneLevel,
  generateOneRandomLevel,
  mulberry32,
  DEFAULT_POOL_PARAM_RANGES
};

