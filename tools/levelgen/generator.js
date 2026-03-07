const { getTemplateCells } = require('./templates');

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

function buildTypeSequence(rng, countsByType) {
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

  function trayAdd(type) {
    trayCounts[type] = (trayCounts[type] || 0) + 1;
    traySize += 1;
    if (trayCounts[type] >= 3) {
      trayCounts[type] -= 3;
      traySize -= 3;
    }
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

function generateLayoutFromSequence(rng, templateCells, seq, gridSize, layering) {
  const { minZ, maxZ, overlap, maxStackPerCell } = layering;
  const minLayer = Number.isInteger(minZ) ? minZ : 0;
  const maxLayer = Number.isInteger(maxZ) ? maxZ : 1;
  if (maxLayer < minLayer) throw new Error('layering.maxZ must be >= minZ');

  const layers = maxLayer - minLayer + 1;
  const tilesPerLayer = Math.ceil(seq.length / layers);

  let stackCap = Math.max(1, maxStackPerCell || 2);
  // Ensure the silhouette can physically hold all tiles.
  // If config underestimates capacity, increase stacking up to a reasonable cap.
  const neededCap = Math.ceil(seq.length / Math.max(1, templateCells.length));
  if (neededCap > stackCap) {
    stackCap = Math.min(6, neededCap);
  }
  const stackCount = new Map(); // "x,y" -> count
  const usedPositions = new Set(); // "x,y,z" -> at most one tile per position
  const posKey = (cx, cy, cz) => `${cx},${cy},${cz}`;

  const bias = overlapBias(overlap);

  const layout = [];
  for (let i = 0; i < seq.length; i += 1) {
    const type = seq[i];
    const layerIdx = Math.floor(i / tilesPerLayer);
    const z = maxLayer - layerIdx;

    // Choose a cell from the template. With overlap bias, prefer reusing cells already stacked.
    // Only allow (x,y,z) that is not yet used — at most one tile per position.
    const canStack = [];
    const canUse = [];
    for (const c of templateCells) {
      const k = `${c.x},${c.y}`;
      if (usedPositions.has(posKey(c.x, c.y, z))) continue;
      const used = stackCount.get(k) || 0;
      if (used < stackCap) {
        canUse.push(c);
        if (used > 0) canStack.push(c);
      }
    }
    if (canUse.length === 0) {
      throw new Error(
        `no free (x,y,z) slot at z=${z} (template cells=${templateCells.length}, stackCap=${stackCap}); ` +
        'ensure (templateCells * layers) >= tile count or increase maxZ/minZ'
      );
    }

    let cell;
    if (canStack.length > 0 && rng() < bias) {
      cell = choice(rng, canStack);
    } else {
      cell = choice(rng, canUse);
    }

    const k = `${cell.x},${cell.y}`;
    stackCount.set(k, (stackCount.get(k) || 0) + 1);
    usedPositions.add(posKey(cell.x, cell.y, z));
    layout.push({ type, x: cell.x, y: cell.y, z });
  }

  // Ensure at least 2 layers are used (multi-layer) by force-placing a couple tiles at z>minZ if needed.
  // Only move a tile to maxLayer if that (x,y,maxLayer) slot is free to preserve one-tile-per-position.
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
  let seq = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      seq = buildTypeSequence(rng, countsByType);
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
  generateLevelsFromConfig
};

