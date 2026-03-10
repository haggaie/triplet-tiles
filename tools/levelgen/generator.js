const { getTemplateCells } = require('./templates');
const { getFillOrder, getLayerSilhouette } = require('./shapes');

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
    const totalTriplets = distribution.totalTriplets;
    if (!Number.isInteger(totalTriplets) || totalTriplets <= 0) {
      throw new Error(`totalTriplets must be a positive integer (got ${totalTriplets})`);
    }
    const weights = distribution.weights || {};
    const wSum = tileTypes.reduce((sum, t) => sum + (weights[t] || 0), 0);
    if (wSum <= 0) throw new Error('weights must sum to > 0');

    // Allocate triplets then convert to tile counts.
    const triplets = {};
    tileTypes.forEach(t => {
      triplets[t] = 0;
    });

    // Initial proportional allocation.
    let allocated = 0;
    tileTypes.forEach(t => {
      const w = weights[t] || 0;
      const n = Math.floor((w / wSum) * totalTriplets);
      triplets[t] = n;
      allocated += n;
    });
    // Distribute remaining triplets by highest weight.
    const remaining = totalTriplets - allocated;
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

  throw new Error(`Unknown distribution mode "${distribution.mode}"`);
}

function buildTypeSequence(rng, countsByType, options = {}) {
  // Create an explicit multiset list of tile types.
  const bag = [];
  Object.entries(countsByType).forEach(([type, count]) => {
    for (let i = 0; i < count; i += 1) bag.push(type);
  });
  shuffleInPlace(rng, bag);

  // Produce a tray-feasible pick sequence using a greedy heuristic:
  // - Prefer picks that complete a triplet in the tray.
  // - Otherwise prefer types already in tray (to avoid too many distinct singles).
  // - Never allow tray size > 7.
  const seq = [];
  const trayCounts = {};
  let traySize = 0;
  let minSlack = 7;
  const requireMinSlackAtMost = Number.isInteger(options.requireMinSlackAtMost)
    ? options.requireMinSlackAtMost
    : null;
  if (requireMinSlackAtMost !== null && (requireMinSlackAtMost < 0 || requireMinSlackAtMost > 7)) {
    throw new Error(`requireMinSlackAtMost must be in [0..7] (got ${requireMinSlackAtMost})`);
  }

  function trayAdd(type) {
    trayCounts[type] = (trayCounts[type] || 0) + 1;
    traySize += 1;
    if (trayCounts[type] >= 3) {
      trayCounts[type] -= 3;
      traySize -= 3;
    }
    minSlack = Math.min(minSlack, 7 - traySize);
  }

  while (bag.length > 0) {
    if (traySize > 7) {
      throw new Error('internal error: tray overflow in sequence builder');
    }

    // Candidate selection: sample K items from bag and pick best by score.
    const K = Math.min(20, bag.length);
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let s = 0; s < K; s += 1) {
      const idx = Math.floor(rng() * bag.length);
      const type = bag[idx];
      const inTray = trayCounts[type] || 0;

      // Score higher if it completes a match or extends an existing pair.
      let score = 0;
      if (inTray === 2) score += 100; // completes triplet
      if (inTray === 1) score += 20;
      if (inTray === 0) score -= 5;

      // Penalize adding a new type when tray is tight.
      const distinct = Object.keys(trayCounts).filter(t => trayCounts[t] > 0).length;
      if (inTray === 0 && traySize >= 5) score -= 20;
      if (distinct >= 6 && inTray === 0) score -= 50;

      // Soft random tie-break.
      score += rng();

      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    }

    const chosen = bag.splice(bestIdx, 1)[0];
    // Ensure we never exceed tray capacity (should be true by construction unless bag is pathological).
    if (traySize >= 7 && (trayCounts[chosen] || 0) < 2) {
      // Try to find any type in bag that would immediately clear a triplet.
      const altIdx = bag.findIndex(t => (trayCounts[t] || 0) === 2);
      if (altIdx >= 0) {
        bag.push(chosen);
        const chosenAlt = bag.splice(altIdx, 1)[0];
        seq.push(chosenAlt);
        trayAdd(chosenAlt);
        continue;
      }
    }

    seq.push(chosen);
    trayAdd(chosen);
  }

  if (traySize > 0) {
    // If we end with leftovers, the bag/distribution is still valid (multiples of 3),
    // so this indicates a weakness in greedy ordering. Shuffle and retry should fix it.
    throw new Error('failed to build tray-feasible pick sequence (non-empty tray at end)');
  }

  if (requireMinSlackAtMost !== null && minSlack > requireMinSlackAtMost) {
    throw new Error(
      `failed to hit required tray tightness (minSlack=${minSlack}, requireMinSlackAtMost=${requireMinSlackAtMost})`
    );
  }

  return seq;
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
 * Base layer (layerIndex 0) gets nBase tiles; the rest are split across upper layers
 * respecting each layer's cell capacity.
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
    const want = k < layerCapacities.length - 1
      ? Math.min(cap, Math.ceil(remaining / (layerCapacities.length - k)))
      : remaining;
    const n = Math.min(cap, Math.max(0, want));
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
  const { minZ, maxZ, overlap, maxStackPerCell, fillBottom, layerShape, layerShapeOptions } = layering;
  const minLayer = Number.isInteger(minZ) ? minZ : 0;
  const maxLayer = Number.isInteger(maxZ) ? maxZ : 1;
  if (maxLayer < minLayer) throw new Error('layering.maxZ must be >= minZ');

  const numLayers = maxLayer - minLayer + 1;
  const useFillBottom = fillBottom === true;
  const shapeStrategy = layerShape || 'full';
  const shapeOpts = layerShapeOptions || {};

  // Per-layer silhouettes: layerIndex 0 = base (minZ), 1 = minZ+1, ...
  const layerCellsByIndex = [];
  for (let layerIdx = 0; layerIdx < numLayers; layerIdx += 1) {
    layerCellsByIndex.push(
      getLayerSilhouette(templateCells, gridSize, shapeStrategy, layerIdx, shapeOpts)
    );
  }

  const baseCells = layerCellsByIndex[0];
  const fillOrder = useFillBottom ? getFillOrder(baseCells) : null;

  let stackCap = Math.max(1, maxStackPerCell || 2);
  const neededCap = Math.ceil(seq.length / Math.max(1, templateCells.length));
  if (neededCap > stackCap) stackCap = Math.min(6, neededCap);

  const usedPositions = new Set();
  const posKey = (cx, cy, cz) => `${cx},${cy},${cz}`;
  const bias = overlapBias(overlap);

  let layerCounts;
  if (useFillBottom && numLayers >= 2) {
    const nBase = Math.min(seq.length, baseCells.length);
    const upperCaps = layerCellsByIndex.slice(1).map(cells => cells.length);
    layerCounts = partitionTilesToLayers(seq.length, nBase, upperCaps);
  } else if (useFillBottom && numLayers === 1) {
    layerCounts = [seq.length];
  } else {
    const caps = layerCellsByIndex.map(c => c.length);
    layerCounts = partitionTilesToLayers(seq.length, 0, caps);
    if (layerCounts[0] === 0 && seq.length > 0) {
      const totalCap = caps.reduce((a, b) => a + b, 0);
      throw new Error(
        `total layer capacity ${totalCap} < ${seq.length} tiles; ` +
        'use layerShape "full" or reduce tile count'
      );
    }
    const sum = layerCounts.reduce((a, b) => a + b, 0);
    if (sum < seq.length) {
      layerCounts[layerCounts.length - 1] += seq.length - sum;
    }
  }

  const stackCount = new Map();
  const layout = [];
  let seqIndex = 0;

  for (let layerIdx = 0; layerIdx < numLayers; layerIdx += 1) {
    const z = minLayer + layerIdx;
    const cells = layerCellsByIndex[layerIdx];
    const n = layerCounts[layerIdx] || 0;

    if (useFillBottom && layerIdx === 0 && fillOrder && n > 0) {
      for (let j = 0; j < n && seqIndex < seq.length; j += 1) {
        const type = seq[seqIndex++];
        const cell = fillOrder[j];
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

  // Retry sequence building a few times in case the greedy ordering fails.
  const seqConstraints = batch.sequenceConstraints || {};
  const maxAttempts = Number.isInteger(seqConstraints.maxAttempts) ? seqConstraints.maxAttempts : 80;
  let seq = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      seq = buildTypeSequence(rng, countsByType, seqConstraints);
      break;
    } catch {
      // re-shuffle via rng state and retry
    }
  }
  if (!seq) {
    throw new Error(`Failed to build pick sequence for template "${batch.templateId}"`);
  }

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

module.exports = {
  generateLevelsFromConfig,
  generateOneLevel,
  mulberry32
};

