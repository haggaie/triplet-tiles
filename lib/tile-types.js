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
