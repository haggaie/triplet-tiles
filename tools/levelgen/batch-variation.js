/**
 * Optional per-slot batch overrides for levelgen (sweep or deterministic random).
 */

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

/**
 * Deep merge plain objects; arrays and non-objects overwrite. First argument is mutated.
 * @param {object} target
 * @param {...object} sources
 * @returns {object}
 */
function deepMerge(target, ...sources) {
  for (const src of sources) {
    if (src == null || typeof src !== 'object' || Array.isArray(src)) continue;
    for (const key of Object.keys(src)) {
      const v = src[key];
      if (v != null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
        if (target[key] == null || typeof target[key] !== 'object' || Array.isArray(target[key])) {
          target[key] = {};
        }
        deepMerge(target[key], v);
      } else {
        target[key] = v;
      }
    }
  }
  return target;
}

function clonePlain(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Deterministic PRNG seed for structural params of a batch slot (retries use same seed).
 */
function paramSeedForSlot(globalSeed, batchIndex, slotIndex) {
  let s = (Number(globalSeed) || 0) >>> 0;
  s ^= (batchIndex * 0x9e3779b9) >>> 0;
  s ^= (slotIndex * 0x85ebca6b) >>> 0;
  return s >>> 0;
}

function isNumericRange(x) {
  return (
    x != null &&
    typeof x === 'object' &&
    !Array.isArray(x) &&
    typeof x.min === 'number' &&
    Number.isFinite(x.min) &&
    typeof x.max === 'number' &&
    Number.isFinite(x.max) &&
    x.min <= x.max
  );
}

function isDiscreteValues(x) {
  return (
    x != null &&
    typeof x === 'object' &&
    !Array.isArray(x) &&
    Array.isArray(x.values) &&
    x.values.length > 0
  );
}

/**
 * Turn a nested `ranges` spec into a nested patch object (sampled once).
 * Leaves: { min, max } (integers if both integral) or { values: [...] }.
 */
function sampleRangesTree(ranges, rng) {
  if (isDiscreteValues(ranges)) {
    const arr = ranges.values;
    return arr[Math.floor(rng() * arr.length)];
  }
  if (isNumericRange(ranges)) {
    const { min, max } = ranges;
    const intRange =
      Number.isInteger(min) && Number.isInteger(max) && Math.floor(min) === min && Math.floor(max) === max;
    if (intRange) {
      return Math.floor(rng() * (max - min + 1)) + min;
    }
    return min + rng() * (max - min);
  }
  if (ranges == null || typeof ranges !== 'object' || Array.isArray(ranges)) {
    return ranges;
  }
  const out = {};
  for (const key of Object.keys(ranges)) {
    out[key] = sampleRangesTree(ranges[key], rng);
  }
  return out;
}

function pathSet(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== 'object' || Array.isArray(cur[p])) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

/**
 * Collect leaf axes: nested objects with array leaves only.
 * Example: { gridHeight: [10, 11], layering: { maxZ: [2, 3] } } -> two axes.
 */
function collectLeafAxes(obj, prefix = '') {
  const out = [];
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const p = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      if (v.length === 0) throw new Error(`batchVariation.axes: empty array for "${p}"`);
      out.push({ path: p, values: v });
    } else if (v != null && typeof v === 'object' && !isNumericRange(v) && !isDiscreteValues(v)) {
      out.push(...collectLeafAxes(v, p));
    } else {
      throw new Error(`batchVariation.axes: expected array at leaf "${p}"`);
    }
  }
  return out;
}

/**
 * Cartesian product of axis arrays. Axes: { gridHeight: [10, 11], layering: { maxZ: [2, 3] } } -> 4 patches.
 */
function sweepPatchesFromAxes(axes) {
  const leafAxes = collectLeafAxes(axes);
  if (leafAxes.length === 0) return [];

  /** @type {Array<object>} */
  const flat = [];

  function product(idx, acc) {
    if (idx >= leafAxes.length) {
      flat.push(clonePlain(acc));
      return;
    }
    const { path, values } = leafAxes[idx];
    for (const val of values) {
      const next = clonePlain(acc);
      pathSet(next, path, val);
      product(idx + 1, next);
    }
  }

  product(0, {});
  return flat;
}

/**
 * Sweep patch list for a batch, or null if not sweep / no axes.
 * Empty `variants: []` falls through to `axes` when present.
 */
function getSweepPatches(batch) {
  const bv = batch.batchVariation;
  if (!bv || bv.mode !== 'sweep') return null;
  if (Array.isArray(bv.variants) && bv.variants.length > 0) {
    return bv.variants;
  }
  if (bv.axes != null && typeof bv.axes === 'object') {
    return sweepPatchesFromAxes(bv.axes);
  }
  if (Array.isArray(bv.variants)) {
    return bv.variants;
  }
  return null;
}

/**
 * Levels to generate for this batch. For `batchVariation.mode === 'sweep'`, default and `count: 'auto'`
 * use the number of sweep combinations (variants length or axes Cartesian size).
 * An explicit integer `count` still allows repeating / extra levels (slotIndex % patches).
 *
 * @param {object} batch
 * @returns {number}
 */
function resolveBatchLevelCount(batch) {
  const c = batch.count;
  const bv = batch.batchVariation;
  const isSweep = bv && bv.mode === 'sweep';

  if (isSweep) {
    const patches = getSweepPatches(batch);
    if (!patches || patches.length === 0) {
      throw new Error('batchVariation sweep requires non-empty `variants` or `axes`');
    }
    if (c === 'auto' || c == null || c === undefined) {
      return patches.length;
    }
    if (typeof c === 'number' && Number.isInteger(c) && c >= 1) {
      return c;
    }
    throw new Error(`batch.count must be a positive integer, "auto", or omitted for sweep batches (got ${c})`);
  }

  if (c === 'auto') {
    throw new Error('batch.count "auto" is only valid when batchVariation.mode is "sweep"');
  }
  if (c == null || c === undefined) {
    return Math.max(1, 1);
  }
  if (typeof c === 'number' && Number.isInteger(c) && c >= 1) {
    return c;
  }
  throw new Error(`batch.count must be a positive integer or omitted (got ${c})`);
}

/**
 * @param {object} batch — level batch from config (may include `batchVariation`)
 * @param {{ slotIndex: number, batchIndex: number, seed: number }} ctx — slotIndex = successful index (or sequential index when no retries)
 * @returns {object} resolved batch without `batchVariation`
 */
function resolveBatchVariation(batch, ctx) {
  const { slotIndex, batchIndex, seed } = ctx;
  const bv = batch.batchVariation;
  const base = clonePlain(batch);
  delete base.batchVariation;

  if (bv == null || typeof bv !== 'object') {
    return base;
  }

  const mode = bv.mode === 'random' ? 'random' : bv.mode === 'sweep' ? 'sweep' : null;
  if (mode == null) {
    throw new Error(`batchVariation.mode must be "sweep" or "random" (got ${bv.mode})`);
  }

  if (mode === 'sweep') {
    const patches = getSweepPatches(batch);
    if (!patches || patches.length === 0) {
      throw new Error('batchVariation sweep requires non-empty `variants` or `axes` with at least one combination');
    }
    const patch = patches[((slotIndex % patches.length) + patches.length) % patches.length];
    deepMerge(base, clonePlain(patch));
    return base;
  }

  /** random */
  const ranges = bv.ranges;
  if (ranges == null || typeof ranges !== 'object') {
    throw new Error('batchVariation random mode requires `ranges` object');
  }
  const pSeed = paramSeedForSlot(seed, batchIndex, slotIndex);
  const rng = mulberry32(pSeed);
  const sampled = sampleRangesTree(ranges, rng);
  if (sampled != null && typeof sampled === 'object' && !Array.isArray(sampled)) {
    deepMerge(base, sampled);
  }
  return base;
}

module.exports = {
  deepMerge,
  resolveBatchVariation,
  resolveBatchLevelCount,
  getSweepPatches,
  paramSeedForSlot,
  sampleRangesTree,
  sweepPatchesFromAxes
};
