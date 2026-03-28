const { getTemplateCells } = require('./templates');
const { getFillOrder, getLayerSilhouette, subsetFillOrderEvenly } = require('./shapes');
const {
  resolveBatchVariation,
  resolveBatchLevelCount,
  paramSeedForSlot
} = require('./batch-variation');

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

function weightedTripletsToCounts(totalTriplets, weights, typeIds, options = {}) {
  if (!Number.isInteger(totalTriplets) || totalTriplets <= 0) {
    throw new Error(`totalTriplets must be a positive integer (got ${totalTriplets})`);
  }
  const wSum = typeIds.reduce((sum, t) => sum + (weights[t] || 0), 0);
  if (wSum <= 0) throw new Error('weights must sum to > 0');

  const minTripletsPerType = Number.isInteger(options.minTripletsPerType) ? options.minTripletsPerType : 0;
  const minNeeded = minTripletsPerType * typeIds.length;
  if (minNeeded > totalTriplets) {
    throw new Error(`minTripletsPerType=${minTripletsPerType} is too high for totalTriplets=${totalTriplets}`);
  }

  const triplets = {};
  typeIds.forEach(t => {
    triplets[t] = minTripletsPerType;
  });

  let allocated = 0;
  const distributableTriplets = totalTriplets - minNeeded;
  typeIds.forEach(t => {
    const w = weights[t] || 0;
    const n = Math.floor((w / wSum) * distributableTriplets);
    triplets[t] += n;
    allocated += n;
  });

  const remaining = distributableTriplets - allocated;
  const ordered = typeIds
    .slice()
    .sort((a, b) => (weights[b] || 0) - (weights[a] || 0));
  for (let i = 0; i < remaining; i += 1) {
    triplets[ordered[i % ordered.length]] += 1;
  }

  const counts = {};
  typeIds.forEach(t => {
    counts[t] = triplets[t] * 3;
  });
  return counts;
}

function distributionToCounts(distribution, typeIds) {
  if (!distribution || typeof distribution !== 'object') {
    throw new Error('distribution is required');
  }

  if (distribution.mode === 'explicitCounts') {
    const counts = distribution.explicitCounts || {};
    const out = {};
    typeIds.forEach(t => {
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
    return weightedTripletsToCounts(distribution.totalTriplets, weights, typeIds);
  }

  if (distribution.mode === 'zipf') {
    const totalTriplets = distribution.totalTriplets;
    const exponent = typeof distribution.exponent === 'number' ? distribution.exponent : 1;
    if (!Number.isFinite(exponent) || exponent < 0) {
      throw new Error(`zipf.exponent must be a finite number >= 0 (got ${distribution.exponent})`);
    }
    const order = Array.isArray(distribution.order) && distribution.order.length > 0
      ? distribution.order
      : typeIds;
    const rankWeights = {};
    order.forEach((t, idx) => {
      if (!typeIds.includes(t)) return;
      rankWeights[t] = 1 / ((idx + 1) ** exponent);
    });
    typeIds.forEach(t => {
      if (rankWeights[t] == null) rankWeights[t] = 1e-9;
    });
    const minTripletsPerType = totalTriplets >= typeIds.length ? 1 : 0;
    return weightedTripletsToCounts(totalTriplets, rankWeights, typeIds, { minTripletsPerType });
  }

  throw new Error(`Unknown distribution mode "${distribution.mode}"`);
}

function coerceCountTypeKey(typeKey) {
  if (typeof typeKey === 'string' && /^\d+$/.test(typeKey)) {
    return parseInt(typeKey, 10);
  }
  return typeKey;
}

/**
 * Random permutation of tile types from `countsByType` (uniform multiset shuffle).
 * No tray-feasibility or difficulty shaping — solvability is left to generate-then-validate.
 * @param {object} [_options] Ignored; kept for backward-compatible call sites.
 */
function buildTypeSequence(rng, countsByType, _options = {}) {
  const bag = [];
  Object.entries(countsByType).forEach(([typeKey, count]) => {
    const type = coerceCountTypeKey(typeKey);
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

/** Templates that support `layerShape: 'paramSweep'` with `sweep: 'thickness'` (not needed for `sweep: 'footprintZ'` or `radius`). */
const THICKNESS_SWEEP_TEMPLATE_IDS = new Set([
  'cross',
  'ring',
  't',
  'u',
  'heart',
  'spiral',
  'letter'
]);

/** Symmetric `radius` sweep (pyramid from large bottom to small top). Not `rectangle` (uses width/height). */
const RADIUS_SWEEP_TEMPLATE_IDS = new Set([
  'diamond',
  'circle',
  'triangle',
  'hexagon',
  'cross',
  'ring',
  't',
  'u',
  'heart',
  'spiral',
  'letter'
]);

function defaultThicknessForTemplate(templateId) {
  const id = String(templateId || '').toLowerCase();
  if (id === 'heart' || id === 'spiral') return 1;
  return 2;
}

/**
 * Bottom layer (index 0) uses max thickness; top (last index) uses min.
 * @param {string} templateId
 * @param {object} templateParams
 * @param {number} gridWidth
 * @param {number} gridHeight
 * @param {number} numLayers
 * @param {{ sweep: string, minThickness?: number, maxThickness?: number, minRadius?: number, maxRadius?: number }} layerShapeOptions
 * @param {number} [minZ] absolute z of layer index 0 (for footprint alignment)
 * @returns {Array<Array<{x:number,y:number}>>}
 */
function buildParamSweepLayerCells(templateId, templateParams, gridWidth, gridHeight, numLayers, layerShapeOptions, minZ = 0) {
  const sweep = layerShapeOptions.sweep;
  if (sweep === 'footprintZ') {
    const id = String(templateId || '').toLowerCase();
    const layers = [];
    for (let layerIdx = 0; layerIdx < numLayers; layerIdx += 1) {
      layers.push(
        getTemplateCells(id, templateParams, gridWidth, gridHeight, { z: minZ + layerIdx })
      );
    }
    return layers;
  }
  if (sweep === 'radius') {
    const id = String(templateId || '').toLowerCase();
    if (!RADIUS_SWEEP_TEMPLATE_IDS.has(id)) {
      throw new Error(
        `paramSweep radius sweep is not supported for template "${templateId}" (supported: ${[...RADIUS_SWEEP_TEMPLATE_IDS].join(', ')})`
      );
    }
    const p = templateParams || {};
    const symmetric =
      p.radius != null && p.radiusX == null && p.radiusY == null;
    const asymmetric =
      p.radius == null &&
      p.radiusX != null &&
      p.radiusY != null &&
      Number.isFinite(Number(p.radiusX)) &&
      Number.isFinite(Number(p.radiusY));

    if (!symmetric && !asymmetric) {
      throw new Error(
        'paramSweep radius sweep requires templateParams.radius (symmetric), or both radiusX and radiusY (asymmetric Manhattan ellipse)'
      );
    }

    const minR0 = layerShapeOptions.minRadius != null ? layerShapeOptions.minRadius : 1;
    let lo = Math.max(1, Math.floor(Number(minR0)));
    let hi;

    if (symmetric) {
      const maxR0 =
        layerShapeOptions.maxRadius != null
          ? layerShapeOptions.maxRadius
          : p.radius != null
            ? p.radius
            : null;
      if (maxR0 == null) {
        throw new Error(
          'paramSweep radius sweep requires templateParams.radius or layerShapeOptions.maxRadius'
        );
      }
      hi = Math.max(1, Math.floor(Number(maxR0)));
    } else {
      hi =
        layerShapeOptions.maxRadius != null
          ? layerShapeOptions.maxRadius
          : Math.floor(Number(p.radiusX));
      hi = Math.max(1, Math.floor(Number(hi)));
    }

    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      throw new Error('paramSweep: minRadius and maxRadius must be finite numbers');
    }
    if (lo > hi) {
      const tmp = lo;
      lo = hi;
      hi = tmp;
    }
    const radiusLadder = [];
    for (let v = hi; v >= lo; v -= 1) {
      radiusLadder.push(v);
    }
    if (radiusLadder.length === 0) {
      throw new Error('paramSweep: empty radius range after clamp');
    }

    const aspect = asymmetric ? Number(p.radiusY) / Math.max(1e-9, Number(p.radiusX)) : 1;

    const layers = [];
    for (let layerIdx = 0; layerIdx < numLayers; layerIdx += 1) {
      const idx =
        numLayers <= 1
          ? 0
          : Math.round((layerIdx / (numLayers - 1)) * (radiusLadder.length - 1));
      const r = radiusLadder[idx];
      let merged;
      if (symmetric) {
        merged = { ...p, radius: r };
      } else {
        const rx = r;
        const ry = Math.max(1, Math.round(rx * aspect));
        merged = { ...p };
        delete merged.radius;
        merged.radiusX = rx;
        merged.radiusY = ry;
      }
      layers.push(getTemplateCells(id, merged, gridWidth, gridHeight, { z: minZ + layerIdx }));
    }
    return layers;
  }
  if (sweep !== 'thickness') {
    throw new Error(
      `paramSweep: unsupported sweep "${sweep}" (only "thickness", "footprintZ", and "radius" are implemented)`
    );
  }
  const id = String(templateId || '').toLowerCase();
  if (!THICKNESS_SWEEP_TEMPLATE_IDS.has(id)) {
    throw new Error(
      `paramSweep thickness sweep is not supported for template "${templateId}" (supported: ${[...THICKNESS_SWEEP_TEMPLATE_IDS].join(', ')})`
    );
  }
  const p = templateParams || {};
  const minT0 = layerShapeOptions.minThickness != null ? layerShapeOptions.minThickness : 1;
  const maxT0 =
    layerShapeOptions.maxThickness != null
      ? layerShapeOptions.maxThickness
      : p.thickness != null
        ? p.thickness
        : defaultThicknessForTemplate(id);
  let lo = Math.max(0, Math.floor(Number(minT0)));
  let hi = Math.max(0, Math.floor(Number(maxT0)));
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    throw new Error('paramSweep: minThickness and maxThickness must be finite numbers');
  }
  if (lo > hi) {
    const tmp = lo;
    lo = hi;
    hi = tmp;
  }
  /** Descending integers hi..lo; avoids skipping middle values when rounding linear lerp (e.g. 4→1 in 3 layers). */
  const thicknessLadder = [];
  for (let v = hi; v >= lo; v -= 1) thicknessLadder.push(v);
  if (thicknessLadder.length === 0) {
    throw new Error('paramSweep: empty thickness range after clamp');
  }
  const layers = [];
  for (let layerIdx = 0; layerIdx < numLayers; layerIdx += 1) {
    const idx =
      numLayers <= 1
        ? 0
        : Math.round((layerIdx / (numLayers - 1)) * (thicknessLadder.length - 1));
    const t = thicknessLadder[idx];
    const merged = { ...p, thickness: t };
    layers.push(getTemplateCells(id, merged, gridWidth, gridHeight, { z: minZ + layerIdx }));
  }
  return layers;
}

/**
 * Per-layer silhouettes (same construction as `generateLayoutFromSequence`).
 * @param {Array<{x:number,y:number}>} templateCells
 * @param {number} gridWidth
 * @param {number} gridHeight
 * @param {object} layering
 * @param {function} rng
 * @param {{ templateId: string, templateParams?: object } | null} [paramSweepContext] required when `layering.layerShape === 'paramSweep'`
 * @param {{ templateId: string, templateParams?: object, minZ: number } | null} [layerTemplateContext] when `layerShape === 'full'`, per-layer getTemplateCells with z
 * @returns {Array<Array<{x:number,y:number}>>}
 */
function buildLayerCellsByIndex(
  templateCells,
  gridWidth,
  gridHeight,
  layering,
  rng,
  paramSweepContext = null,
  layerTemplateContext = null
) {
  const { minZ, maxZ, layerShape, layerShapeOptions } = layering;
  const minLayer = Number.isInteger(minZ) ? minZ : 0;
  const maxLayer = Number.isInteger(maxZ) ? maxZ : 1;
  if (maxLayer < minLayer) throw new Error('layering.maxZ must be >= minZ');
  const numLayers = maxLayer - minLayer + 1;
  const shapeStrategy = layerShape || 'full';
  const shapeOpts = layerShapeOptions || {};
  if (shapeStrategy === 'paramSweep') {
    if (!paramSweepContext || paramSweepContext.templateId == null) {
      throw new Error(
        'layerShape "paramSweep" requires paramSweepContext { templateId, templateParams } (pass from batch when generating)'
      );
    }
    return buildParamSweepLayerCells(
      paramSweepContext.templateId,
      paramSweepContext.templateParams,
      gridWidth,
      gridHeight,
      numLayers,
      shapeOpts,
      minLayer
    );
  }
  if (shapeStrategy === 'full' && layerTemplateContext && layerTemplateContext.templateId != null) {
    const out = [];
    for (let layerIdx = 0; layerIdx < numLayers; layerIdx += 1) {
      out.push(
        getTemplateCells(
          layerTemplateContext.templateId,
          layerTemplateContext.templateParams,
          gridWidth,
          gridHeight,
          { z: minLayer + layerIdx }
        )
      );
    }
    return out;
  }
  const layerCellsByIndex = [];
  for (let layerIdx = 0; layerIdx < numLayers; layerIdx += 1) {
    layerCellsByIndex.push(
      getLayerSilhouette(templateCells, gridWidth, gridHeight, shapeStrategy, layerIdx, shapeOpts, rng)
    );
  }
  return layerCellsByIndex;
}

function computeMaxTilesFromLayers(layerCellsByIndex) {
  return layerCellsByIndex.reduce((sum, cells) => sum + cells.length, 0);
}

/**
 * @param {number} maxTiles — sum of per-layer silhouette sizes (one tile per cell per layer).
 * @param {{ fillRatio?: number, clampMin?: number, clampMax?: number }} [options]
 * @returns {number} total triplets
 */
function resolveTotalTripletsFromCapacity(maxTiles, options = {}) {
  if (!Number.isInteger(maxTiles) || maxTiles < 0) {
    throw new Error(`maxTiles must be a non-negative integer (got ${maxTiles})`);
  }
  if (maxTiles < 3) {
    throw new Error(`template capacity too small for any triplet (${maxTiles} tile slots)`);
  }
  const fillRatio =
    typeof options.fillRatio === 'number' && Number.isFinite(options.fillRatio)
      ? Math.max(0, Math.min(1, options.fillRatio))
      : 1;
  let t = Math.floor((maxTiles * fillRatio) / 3);
  const clampMin = typeof options.clampMin === 'number' ? options.clampMin : null;
  const clampMax = typeof options.clampMax === 'number' ? options.clampMax : null;
  if (clampMin != null) t = Math.max(t, Math.floor(clampMin));
  if (clampMax != null) t = Math.min(t, Math.floor(clampMax));
  while (t > 0 && 3 * t > maxTiles) t -= 1;
  if (t < 1) t = 1;
  while (3 * t > maxTiles) t -= 1;
  if (t < 1) {
    throw new Error(`cannot fit any triplet in maxTiles=${maxTiles}`);
  }
  return t;
}

function distributionUsesAutoTotalTriplets(distribution) {
  return (
    distribution &&
    typeof distribution === 'object' &&
    (distribution.totalTriplets === 'auto' || distribution.totalTriplets === true)
  );
}

function generateLayoutFromSequence(rng, templateCells, seq, gridWidth, gridHeight, layering, layoutOptions = {}) {
  const { minZ, maxZ, overlap, maxStackPerCell, full, layerShape, layerShapeOptions, interleavePlacement } = layering;
  const minLayer = Number.isInteger(minZ) ? minZ : 0;
  const maxLayer = Number.isInteger(maxZ) ? maxZ : 1;
  if (maxLayer < minLayer) throw new Error('layering.maxZ must be >= minZ');

  const numLayers = maxLayer - minLayer + 1;
  const useFullFill = full === true;
  const shapeStrategy = layerShape || 'full';
  const shapeOpts = layerShapeOptions || {};
  const paramSweepContext = layoutOptions.paramSweepContext || null;
  const layerTemplateContext = layoutOptions.layerTemplateContext || null;

  // Per-layer silhouettes: layerIndex 0 = base (minZ), 1 = minZ+1, ...
  const layerCellsByIndex =
    layoutOptions.precomputedLayerCellsByIndex != null
      ? layoutOptions.precomputedLayerCellsByIndex
      : [];
  if (layoutOptions.precomputedLayerCellsByIndex == null) {
    if (shapeStrategy === 'paramSweep') {
      if (!paramSweepContext || paramSweepContext.templateId == null) {
        throw new Error(
          'layerShape "paramSweep" requires layoutOptions.paramSweepContext { templateId, templateParams }'
        );
      }
      const swept = buildParamSweepLayerCells(
        paramSweepContext.templateId,
        paramSweepContext.templateParams,
        gridWidth,
        gridHeight,
        numLayers,
        shapeOpts,
        minLayer
      );
      for (let i = 0; i < swept.length; i += 1) layerCellsByIndex.push(swept[i]);
    } else if (shapeStrategy === 'full' && layerTemplateContext && layerTemplateContext.templateId != null) {
      for (let layerIdx = 0; layerIdx < numLayers; layerIdx += 1) {
        layerCellsByIndex.push(
          getTemplateCells(
            layerTemplateContext.templateId,
            layerTemplateContext.templateParams,
            gridWidth,
            gridHeight,
            { z: minLayer + layerIdx }
          )
        );
      }
    } else {
      for (let layerIdx = 0; layerIdx < numLayers; layerIdx += 1) {
        layerCellsByIndex.push(
          getLayerSilhouette(templateCells, gridWidth, gridHeight, shapeStrategy, layerIdx, shapeOpts, rng)
        );
      }
    }
  } else if (layerCellsByIndex.length !== numLayers) {
    throw new Error(
      `precomputedLayerCellsByIndex length ${layerCellsByIndex.length} !== numLayers ${numLayers}`
    );
  }

  const baseCells = layerCellsByIndex[0];
  // When full is true, we fill every layer in deterministic order.
  const fillOrdersByLayer = useFullFill
    ? layerCellsByIndex.map(cells => getFillOrder(cells))
    : null;

  let stackCap = Math.max(1, maxStackPerCell || 2);
  const neededCap = Math.ceil(seq.length / Math.max(1, baseCells.length));
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

  const layerSilhouettes = layerCellsByIndex.map((cells, idx) => ({
    z: minLayer + idx,
    cells
  }));

  return { layout, layerSilhouettes };
}

/** Large reference board for bbox-based grid inference (templates center shapes in-grid). */
const REF_GRID_FOR_INFERENCE = 256;

const DEFAULT_GRID_INFER_MARGIN = 0;

/** XOR mixed into `paramSeedForSlot` so grid-infer PRNG stream differs from batch-variation sampling. */
const GRID_INFER_SEED_XOR = 0x2f4a7c31;

const RESOLVE_RADII_TEMPLATE_IDS = new Set([
  'diamond',
  'circle',
  'triangle',
  'hexagon',
  'cross',
  'ring',
  't',
  'u',
  'spiral',
  'letter'
]);

/**
 * @param {Array<Array<{x:number,y:number}>>} layers
 * @returns {{ minX: number, maxX: number, minY: number, maxY: number } | null}
 */
function bboxOfLayers(layers) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const cells of layers) {
    for (const { x, y } of cells) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, maxX, minY, maxY };
}

function layersCellsInBounds(layers, W, H) {
  for (const cells of layers) {
    for (const { x, y } of cells) {
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= W || y >= H) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Templates that use `resolveRadii` must not rely on grid-sized defaults when inferring the board.
 * @param {{ templateId?: string, templateParams?: object }} batch
 */
function assertTemplateParamsAllowGridInference(batch) {
  const tid = String(batch.templateId || '').toLowerCase();
  const p = batch.templateParams || {};
  if (tid === 'heart') {
    const sym = p.radius != null && p.radiusX == null && p.radiusY == null;
    const asym = p.radiusX != null && p.radiusY != null;
    if (!sym && !asym) {
      throw new Error(
        'Grid inference: heart needs templateParams.radius or both radiusX and radiusY.'
      );
    }
    return;
  }
  if (tid === 'rectangle') {
    const w = p.width;
    const h = p.height;
    if (!Number.isInteger(w) || w < 1 || !Number.isInteger(h) || h < 1) {
      throw new Error(
        'Grid inference: rectangle requires integer templateParams.width and templateParams.height (>= 1).'
      );
    }
    return;
  }
  if (!RESOLVE_RADII_TEMPLATE_IDS.has(tid)) {
    return;
  }
  const sym = p.radius != null && p.radiusX == null && p.radiusY == null;
  const asym = p.radiusX != null && p.radiusY != null;
  if (!sym && !asym) {
    throw new Error(
      `Grid inference: template "${tid}" needs templateParams.radius (symmetric) or both radiusX and radiusY — ` +
        'omitted axes would otherwise default from grid size.'
    );
  }
}

/**
 * Deterministic PRNG for the reference- and verify passes only (re-seeded each full build).
 * Must not be the same stream as layout `rng` when layerShape uses randomness.
 * @param {{ seed: number, batchIndex: number, slotIndex: number }} ctx
 * @returns {function(): number}
 */
function inferRngFromCtx(ctx) {
  const s = (paramSeedForSlot(ctx.seed, ctx.batchIndex, ctx.slotIndex) ^ GRID_INFER_SEED_XOR) >>> 0;
  return mulberry32(s);
}

/**
 * @param {object} batch resolved batch (after batchVariation)
 * @param {{ seed: number, batchIndex: number, slotIndex: number, gridInferMargin?: number }} ctx
 * @returns {{ gridWidth: number, gridHeight: number }}
 */
function inferGridDimensions(batch, ctx) {
  assertTemplateParamsAllowGridInference(batch);
  const layeringBatch = batch.layering || {};
  const minZLayer = Number.isInteger(layeringBatch.minZ) ? layeringBatch.minZ : 0;
  const ref = REF_GRID_FOR_INFERENCE;
  const runInferLayers = (W, H) => {
    const rngI = inferRngFromCtx(ctx);
    const tc = getTemplateCells(batch.templateId, batch.templateParams, W, H, { z: minZLayer });
    const layerTemplateContext = {
      templateId: batch.templateId,
      templateParams: batch.templateParams || {},
      minZ: minZLayer
    };
    const paramSweepContext =
      (layeringBatch.layerShape || 'full') === 'paramSweep'
        ? { templateId: batch.templateId, templateParams: batch.templateParams || {} }
        : null;
    return buildLayerCellsByIndex(
      tc,
      W,
      H,
      batch.layering,
      rngI,
      paramSweepContext,
      layerTemplateContext
    );
  };

  const layersRef = runInferLayers(ref, ref);
  const bbox = bboxOfLayers(layersRef);
  if (bbox == null) {
    throw new Error('Grid inference: empty layer silhouettes on reference grid');
  }
  const rawW = bbox.maxX - bbox.minX + 1;
  const rawH = bbox.maxY - bbox.minY + 1;
  let margin =
    Number.isInteger(ctx.gridInferMargin) && ctx.gridInferMargin >= 0
      ? ctx.gridInferMargin
      : Number.isInteger(batch.gridInferMargin) && batch.gridInferMargin >= 0
        ? batch.gridInferMargin
        : DEFAULT_GRID_INFER_MARGIN;
  let W = Math.max(5, rawW + 2 * margin);
  let H = Math.max(5, rawH + 2 * margin);

  const cap = REF_GRID_FOR_INFERENCE;
  let lastW = W;
  let lastH = H;
  while (W <= cap && H <= cap) {
    const L = runInferLayers(W, H);
    if (layersCellsInBounds(L, W, H)) {
      return { gridWidth: W, gridHeight: H };
    }
    lastW = W;
    lastH = H;
    W += 1;
    H += 1;
  }
  throw new Error(
    `Grid inference: could not fit layer silhouettes (last attempt ${lastW}×${lastH}, cap ${cap})`
  );
}

function normalizeBatchGrid(batch) {
  const hasW = Number.isInteger(batch.gridWidth);
  const hasH = Number.isInteger(batch.gridHeight);
  if (hasW !== hasH) {
    throw new Error('Level batch must set both gridWidth and gridHeight, or omit both');
  }
  if (hasW && hasH) {
    return { gridWidth: batch.gridWidth, gridHeight: batch.gridHeight };
  }
  if (Number.isInteger(batch.gridSize)) {
    const g = batch.gridSize;
    return { gridWidth: g, gridHeight: g };
  }
  throw new Error('Level batch must specify gridWidth and gridHeight (or legacy gridSize)');
}

/**
 * @param {object} batch
 * @param {{ seed: number, batchIndex: number, slotIndex: number, gridInferMargin?: number } | null | undefined} inferCtx required when dimensions omitted and gridInfer is not false
 * @returns {{ gridWidth: number, gridHeight: number }}
 */
function resolveBatchGrid(batch, inferCtx) {
  const hasW = Number.isInteger(batch.gridWidth);
  const hasH = Number.isInteger(batch.gridHeight);
  if (hasW !== hasH) {
    throw new Error('Level batch must set both gridWidth and gridHeight, or omit both for grid inference');
  }
  if (hasW && hasH) {
    return { gridWidth: batch.gridWidth, gridHeight: batch.gridHeight };
  }
  if (Number.isInteger(batch.gridSize)) {
    const g = batch.gridSize;
    return { gridWidth: g, gridHeight: g };
  }
  if (batch.gridInfer === false) {
    throw new Error(
      'Level batch must specify gridWidth and gridHeight (or legacy gridSize) when gridInfer is false'
    );
  }
  if (
    inferCtx == null ||
    !Number.isFinite(inferCtx.seed) ||
    !Number.isInteger(inferCtx.batchIndex) ||
    !Number.isInteger(inferCtx.slotIndex)
  ) {
    throw new Error(
      'Grid inference requires inferCtx { seed, batchIndex, slotIndex } when gridWidth/gridHeight are omitted.'
    );
  }
  return inferGridDimensions(batch, inferCtx);
}

/** Abstract tile type indices `0 .. count - 1` (no dependency on game `TILE_TYPES` names). */
function rangeTileTypes(count) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`tileTypeCount must be a positive integer (got ${count})`);
  }
  return Array.from({ length: count }, (_, i) => i);
}

function generateOneLevel(rng, batch, levelId, inferCtx) {
  const { gridWidth, gridHeight } = resolveBatchGrid(batch, inferCtx);
  const layeringBatch = batch.layering || {};
  const minZLayer = Number.isInteger(layeringBatch.minZ) ? layeringBatch.minZ : 0;
  const templateCells = getTemplateCells(batch.templateId, batch.templateParams, gridWidth, gridHeight, {
    z: minZLayer
  });
  const layerTemplateContext = {
    templateId: batch.templateId,
    templateParams: batch.templateParams || {},
    minZ: minZLayer
  };
  const paramSweepContext =
    (layeringBatch.layerShape || 'full') === 'paramSweep'
      ? { templateId: batch.templateId, templateParams: batch.templateParams || {} }
      : null;
  const n = batch.tileTypeCount;
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Level batch must set tileTypeCount to a positive integer (got ${batch.tileTypeCount})`);
  }
  const typeIds = rangeTileTypes(n);
  const distIn = batch.distribution;
  let distribution = distIn;
  let layoutOpts = {};
  if (distributionUsesAutoTotalTriplets(distIn)) {
    if (distIn.mode !== 'zipf' && distIn.mode !== 'weightedTriplets') {
      throw new Error('distribution.totalTriplets "auto" is only valid for zipf or weightedTriplets');
    }
    const precomputedLayers = buildLayerCellsByIndex(
      templateCells,
      gridWidth,
      gridHeight,
      batch.layering,
      rng,
      paramSweepContext,
      layerTemplateContext
    );
    const maxTiles = computeMaxTilesFromLayers(precomputedLayers);
    const fillRatio =
      typeof batch.templateTripletFillRatio === 'number' ? batch.templateTripletFillRatio : 1;
    const clampMin = Number.isInteger(batch.totalTripletsMin) ? batch.totalTripletsMin : undefined;
    const clampMax = Number.isInteger(batch.totalTripletsMax) ? batch.totalTripletsMax : undefined;
    const totalTriplets = resolveTotalTripletsFromCapacity(maxTiles, { fillRatio, clampMin, clampMax });
    distribution = { ...distIn, totalTriplets };
    layoutOpts = { precomputedLayerCellsByIndex: precomputedLayers };
  }
  const countsByType = distributionToCounts(distribution, typeIds);
  const seq = buildTypeSequence(rng, countsByType);
  const { layout, layerSilhouettes } = generateLayoutFromSequence(
    rng,
    templateCells,
    seq,
    gridWidth,
    gridHeight,
    batch.layering,
    { ...layoutOpts, paramSweepContext, layerTemplateContext }
  );
  return {
    id: levelId,
    name: `${String(batch.templateId).toUpperCase()} ${levelId}`,
    gridWidth,
    gridHeight,
    difficultyScore: 0,
    layout,
    layerSilhouettes
  };
}

function generateLevelsFromConfig(config) {
  const seed = Number.isFinite(config.seed) ? config.seed : 1;
  const rng = mulberry32(seed);

  const levels = [];
  let nextId = 1;
  let batchIdx = 0;
  for (const batch of config.levels) {
    const count = resolveBatchLevelCount(batch);
    for (let i = 0; i < count; i += 1) {
      const resolvedBatch = resolveBatchVariation(batch, {
        slotIndex: i,
        batchIndex: batchIdx,
        seed
      });
      // Per-level RNG fork for reproducibility while keeping batches stable.
      const levelSeed = Math.floor(rng() * 2 ** 31) ^ (nextId * 2654435761);
      const levelRng = mulberry32(levelSeed);
      levels.push(
        generateOneLevel(levelRng, resolvedBatch, nextId, { seed, batchIndex: batchIdx, slotIndex: i })
      );
      nextId += 1;
    }
    batchIdx += 1;
  }

  return { levels, meta: { seed } };
}

const DEFAULT_POOL_PARAM_RANGES = {
  templateIds: ['rectangle', 'diamond', 'heart', 'letter', 'circle', 'triangle', 'hexagon', 'cross', 'ring', 't', 'u'],
  /** Pool of abstract ids `0 .. tileTypePoolSize - 1` for random sampling before each level. */
  tileTypePoolSize: 12,
  /** @type {Array<[number, number]>} [gridWidth, gridHeight] pairs (width capped at 8) */
  gridDimensions: [
    [7, 7],
    [8, 8],
    [7, 10],
    [8, 11],
    [8, 12]
  ],
  numTypesMin: 6,
  numTypesMax: 12,
  totalTripletsMin: 15,
  totalTripletsMax: 45,
  maxZMin: 3,
  maxZMax: 9,
  overlaps: ['medium', 'heavy'],
  layerShapes: ['full', 'pyramid', 'shift'],
  maxStackPerCellMin: 3,
  maxStackPerCellMax: 6,
  zipfExponentMin: 0.3,
  zipfExponentMax: 2
};

/**
 * @param {string} templateId
 * @param {number|function():number} gridSizeOrRng min(gridW, gridH) for rectangle sizing, or rng when second form
 * @param {function():number} [rng] when first arg is grid size
 */
function sampleTemplateParams(templateId, gridSizeOrRng, rng) {
  const id = String(templateId).toLowerCase();
  let g;
  let rand;
  if (typeof gridSizeOrRng === 'function') {
    rand = gridSizeOrRng;
    g = 8;
  } else {
    g = Number.isInteger(gridSizeOrRng) ? gridSizeOrRng : 11;
    rand = rng;
    if (typeof rand !== 'function') {
      throw new Error('sampleTemplateParams: rng is required when grid size is passed');
    }
  }
  switch (id) {
    case 'rectangle': {
      const w = Math.max(3, Math.floor(g * 0.5) + Math.floor(rand() * Math.floor(g * 0.3)));
      const h = Math.max(3, Math.floor(g * 0.5) + Math.floor(rand() * Math.floor(g * 0.3)));
      return { width: w, height: h };
    }
    case 'diamond':
      return { radius: 3 + Math.floor(rand() * 3) };
    case 'heart':
      return { radius: 3 + Math.floor(rand() * 2), thickness: 1 + Math.floor(rand() * 2) };
    case 'spiral':
      return { radius: 3 + Math.floor(rand() * 2), thickness: 1 + Math.floor(rand() * 2) };
    case 'circle':
      return { radius: 3 + Math.floor(rand() * 3) };
    case 'triangle':
      return { radius: 3 + Math.floor(rand() * 3) };
    case 'hexagon':
      return { radius: 3 + Math.floor(rand() * 2) };
    case 'cross':
      return { radius: 3 + Math.floor(rand() * 3), thickness: 1 + Math.floor(rand() * 3) };
    case 'ring':
      return { radius: 4 + Math.floor(rand() * 2), thickness: 1 + Math.floor(rand() * 2) };
    case 't':
      return { radius: 4 + Math.floor(rand() * 2), thickness: 1 + Math.floor(rand() * 2) };
    case 'u':
      return { radius: 4 + Math.floor(rand() * 2), thickness: 1 + Math.floor(rand() * 2) };
    case 'letter':
      return {
        letter: rand() < 0.5 ? 'S' : 'C',
        radius: 4 + Math.floor(rand() * 2),
        thickness: 1 + Math.floor(rand() * 2)
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
  const poolSize = ranges.tileTypePoolSize;
  if (!Number.isInteger(poolSize) || poolSize < 3) {
    throw new Error('paramRanges.tileTypePoolSize must be an integer >= 3');
  }
  const poolIds = rangeTileTypes(poolSize);

  const templateId = choice(rng, ranges.templateIds);
  const useLegacyPoolGrid = ranges.useLegacyPoolGrid === true;
  const gridDimensions = ranges.gridDimensions || ranges.gridSizes?.map((g) => [g, g]) || [
    [7, 7],
    [8, 8],
    [7, 10],
    [8, 11],
    [8, 12]
  ];
  const poolInferSeed = Number.isFinite(ranges.poolInferSeed) ? ranges.poolInferSeed : 1337;

  const numTypesMin = Math.max(2, ranges.numTypesMin ?? 4);
  const numTypesMax = Math.min(poolIds.length, ranges.numTypesMax ?? 12);
  const numTypes = numTypesMin + Math.floor(rng() * (numTypesMax - numTypesMin + 1));
  const shuffled = poolIds.slice();
  shuffleInPlace(rng, shuffled);
  const typeIds = shuffled.slice(0, numTypes);

  const zipfExponentMin = ranges.zipfExponentMin ?? 0.3;
  const zipfExponentMax = ranges.zipfExponentMax ?? 2.0;
  const exponent = zipfExponentMin + (rng() * (zipfExponentMax - zipfExponentMin));
  const order = typeIds.slice();
  shuffleInPlace(rng, order);

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
    layerShapeOptions: {}
  };

  let gridWidth;
  let gridHeight;
  let templateParams;
  const tid = String(templateId).toLowerCase();
  if (useLegacyPoolGrid) {
    const [gw, gh] = choice(rng, gridDimensions);
    gridWidth = gw;
    gridHeight = gh;
    const gMin = Math.min(gridWidth, gridHeight);
    templateParams = sampleTemplateParams(templateId, gMin, rng);
  } else {
    templateParams = sampleTemplateParams(templateId, rng);
    const inferred = inferGridDimensions(
      {
        templateId,
        templateParams,
        layering,
        gridInferMargin: ranges.poolGridInferMargin
      },
      {
        seed: poolInferSeed,
        batchIndex: 0,
        slotIndex: Number.isInteger(levelId) ? levelId : 0,
        gridInferMargin: ranges.poolGridInferMargin
      }
    );
    gridWidth = inferred.gridWidth;
    gridHeight = inferred.gridHeight;
  }

  const tripletsMin = Math.max(5, ranges.totalTripletsMin ?? 15);
  const tripletsMax = Math.min(50, ranges.totalTripletsMax ?? 40);
  const deriveFromTemplate = ranges.deriveTotalTripletsFromTemplate !== false;

  try {
    const templateCells = getTemplateCells(templateId, templateParams, gridWidth, gridHeight, { z: 0 });
    const layerTemplateContext = { templateId, templateParams, minZ: 0 };
    let distribution;
    let layoutOpts = {};
    if (deriveFromTemplate) {
      const precomputedLayers = buildLayerCellsByIndex(
        templateCells,
        gridWidth,
        gridHeight,
        layering,
        rng,
        null,
        layerTemplateContext
      );
      const maxTiles = computeMaxTilesFromLayers(precomputedLayers);
      const fillRatio =
        typeof ranges.templateTripletFillRatio === 'number' ? ranges.templateTripletFillRatio : 1;
      const totalTriplets = resolveTotalTripletsFromCapacity(maxTiles, {
        fillRatio,
        clampMin: tripletsMin,
        clampMax: tripletsMax
      });
      distribution = { mode: 'zipf', totalTriplets, exponent, order };
      layoutOpts = { precomputedLayerCellsByIndex: precomputedLayers };
    } else {
      const totalTriplets = tripletsMin + Math.floor(rng() * (tripletsMax - tripletsMin + 1));
      distribution = { mode: 'zipf', totalTriplets, exponent, order };
    }
    const countsByType = distributionToCounts(distribution, typeIds);
    const seq = buildTypeSequence(rng, countsByType);
    const { layout, layerSilhouettes } = generateLayoutFromSequence(
      rng,
      templateCells,
      seq,
      gridWidth,
      gridHeight,
      layering,
      { ...layoutOpts, layerTemplateContext }
    );
    return {
      id: levelId,
      name: `${String(templateId).toUpperCase()} ${levelId}`,
      gridWidth,
      gridHeight,
      difficultyScore: 0,
      layout,
      layerSilhouettes
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
  resolveBatchVariation,
  resolveBatchLevelCount,
  DEFAULT_POOL_PARAM_RANGES,
  normalizeBatchGrid,
  resolveBatchGrid,
  inferGridDimensions,
  rangeTileTypes,
  buildLayerCellsByIndex,
  buildParamSweepLayerCells,
  computeMaxTilesFromLayers,
  resolveTotalTripletsFromCapacity,
  distributionUsesAutoTotalTriplets,
  THICKNESS_SWEEP_TEMPLATE_IDS
};

