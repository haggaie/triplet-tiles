/**
 * Runtime tile kinds (emoji + id). Shared by game and level designer preview.
 * OpenMoji color SVGs in `assets/openmoji/{hex}.svg` — see assets/openmoji/ATTRIBUTION.txt.
 */

const OPENMOJI_BASE = new URL('../assets/openmoji/', import.meta.url).href;

export const TILE_TYPES = [
  { id: 'evergreen-tree', emoji: '🌲', openmojiHex: '1F332' },
  { id: 'flower', emoji: '🌸', openmojiHex: '1F338' },
  { id: 'grapes', emoji: '🍇', openmojiHex: '1F347' },
  { id: 'star', emoji: '⭐', openmojiHex: '2B50' },
  { id: 'acorn', emoji: '🌰', openmojiHex: '1F330' },
  { id: 'mushroom', emoji: '🍄', openmojiHex: '1F344' },
  { id: 'cherry', emoji: '🍒', openmojiHex: '1F352' },
  { id: 'butterfly', emoji: '🦋', openmojiHex: '1F98B' },
  { id: 'sunflower', emoji: '🌻', openmojiHex: '1F33B' },
  { id: 'apple', emoji: '🍎', openmojiHex: '1F34E' },
  { id: 'carrot', emoji: '🥕', openmojiHex: '1F955' },
  { id: 'lady-beetle', emoji: '🐞', openmojiHex: '1F41E' }
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

function resolveTileTypeIndex(typeId) {
  if (typeof typeId === 'number' && Number.isInteger(typeId) && typeId >= 0 && typeId < TILE_TYPES.length) {
    return typeId;
  }
  if (typeof typeId === 'string' && /^\d+$/.test(typeId)) {
    const idx = parseInt(typeId, 10);
    if (idx >= 0 && idx < TILE_TYPES.length) return idx;
  }
  return null;
}

/** Absolute URL to OpenMoji color SVG for a tile type, or null if unknown. */
export function getOpenMojiIconUrl(typeId) {
  const idx = resolveTileTypeIndex(typeId);
  if (idx == null) return null;
  return `${OPENMOJI_BASE}${TILE_TYPES[idx].openmojiHex}.svg`;
}

export function mountTileFace(el, typeId) {
  el.replaceChildren();
  const idx = resolveTileTypeIndex(typeId);
  if (idx == null) {
    el.textContent = '?';
    return;
  }
  const img = document.createElement('img');
  img.className = 'tile-icon';
  img.src = `${OPENMOJI_BASE}${TILE_TYPES[idx].openmojiHex}.svg`;
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.draggable = false;
  img.decoding = 'async';
  el.appendChild(img);
}

/** HTML for `<img>` inside `.tile` / `.tray-tile` (same sources as `mountTileFace`). */
export function getTileFaceInnerHtml(typeId) {
  const idx = resolveTileTypeIndex(typeId);
  if (idx == null) return '?';
  const src = `${OPENMOJI_BASE}${TILE_TYPES[idx].openmojiHex}.svg`;
  return `<img class="tile-icon" src="${src}" alt="" aria-hidden="true" draggable="false" decoding="async" />`;
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
