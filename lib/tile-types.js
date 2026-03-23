/**
 * Runtime tile kinds (emoji + id). Shared by game and level designer preview.
 */

export const TILE_TYPES = [
  { id: 'leaf', emoji: '🍃' },
  { id: 'flower', emoji: '🌸' },
  { id: 'grapes', emoji: '🍇' },
  { id: 'star', emoji: '⭐' },
  { id: 'acorn', emoji: '🌰' },
  { id: 'mushroom', emoji: '🍄' },
  { id: 'cherry', emoji: '🍒' },
  { id: 'butterfly', emoji: '🦋' },
  { id: 'sunflower', emoji: '🌻' },
  { id: 'apple', emoji: '🍎' },
  { id: 'carrot', emoji: '🥕' },
  { id: 'bee', emoji: '🐝' }
];

export const TILE_TYPE_COUNT = TILE_TYPES.length;

function shuffleIndexArrayInPlace(arr, random01) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random01() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Builds a random bijection from abstract `type` indices used in `layout` to distinct
 * indices into `TILE_TYPES`. Preserves which symbols are common vs rare for the level
 * while varying which emoji plays each role each time the level starts.
 *
 * @param {Array<{ type: unknown }>} layout
 * @param {() => number} random01 returns values in [0, 1)
 * @returns {Map<number, number>}
 */
export function buildTileTypeRemapForLayout(layout, random01 = Math.random) {
  const used = new Set();
  for (const tile of layout) {
    const t = normalizeLevelTileType(tile.type);
    if (typeof t === 'number' && Number.isInteger(t) && t >= 0 && t < TILE_TYPES.length) {
      used.add(t);
    }
  }
  const sorted = [...used].sort((a, b) => a - b);
  const k = sorted.length;
  if (k === 0) return new Map();

  const pool = TILE_TYPES.map((_, i) => i);
  shuffleIndexArrayInPlace(pool, random01);
  const chosen = pool.slice(0, k);

  const map = new Map();
  for (let i = 0; i < k; i += 1) {
    map.set(sorted[i], chosen[i]);
  }
  return map;
}

/**
 * Maps level layout `type` to runtime tile kind: **integer indices** into `TILE_TYPES`, or digit strings
 * from JSON; other strings (e.g. overflow test types) pass through unchanged.
 */
export function normalizeLevelTileType(type) {
  if (typeof type === 'number' && Number.isInteger(type) && type >= 0 && type < TILE_TYPES.length) {
    return type;
  }
  if (typeof type === 'string' && /^\d+$/.test(type)) {
    const idx = parseInt(type, 10);
    if (idx >= 0 && idx < TILE_TYPES.length) return idx;
  }
  return type;
}

export function getTileVisual(typeId) {
  if (typeof typeId === 'number' && typeId >= 0 && typeId < TILE_TYPES.length) {
    return TILE_TYPES[typeId].emoji;
  }
  if (typeof typeId === 'string' && /^\d+$/.test(typeId)) {
    const idx = parseInt(typeId, 10);
    return TILE_TYPES[idx]?.emoji ?? '?';
  }
  return '?';
}

/** Readable tile type for ARIA labels (English id from data). */
export function getTileTypeLabel(typeId) {
  if (typeof typeId === 'number' && typeId >= 0 && typeId < TILE_TYPES.length) {
    return TILE_TYPES[typeId].id;
  }
  if (typeof typeId === 'string' && /^\d+$/.test(typeId)) {
    return TILE_TYPES[parseInt(typeId, 10)]?.id ?? 'tile';
  }
  return 'tile';
}
