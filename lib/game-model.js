/**
 * Pure game rules for the tray (shape-grouped insert, triple removal) and
 * committed vs projected tray occupancy. No DOM, no mutable globals.
 */

export const TRAY_MAX_TILES = 7;

/**
 * Slot index where a tile of `type` would be inserted (shape-grouped: after the
 * last existing tile of the same type, or at end if none).
 */
export function getTrayInsertIndexForType(trayTiles, type) {
  let insertIndex = trayTiles.length;
  for (let i = trayTiles.length - 1; i >= 0; i -= 1) {
    if (trayTiles[i].type === type) {
      insertIndex = i + 1;
      break;
    }
  }
  return insertIndex;
}

/**
 * Returns a new tray with `newTile` inserted by shape grouping. Does not mutate `trayTiles`.
 */
export function insertTrayTileByShape(trayTiles, newTile) {
  const insertIndex = getTrayInsertIndexForType(trayTiles, newTile.type);
  const next = trayTiles.map(t => ({ ...t }));
  next.splice(insertIndex, 0, { id: newTile.id, type: newTile.type });
  return next;
}

/**
 * One pass of triple removal: for each type that had count ≥ 3 in the tray at the
 * start of this round, remove the first three occurrences of that type in left-to-right
 * order (matches `handleMatchingInTray` in game.js). Multiple types are processed in
 * `Object.keys(counts)` order.
 *
 * @returns {{ trayTiles: Array<{id: string, type: string}>, scoreDelta: number, removedTypes: string[] }}
 */
export function removeMatchingTriplesOneRound(trayTiles) {
  const counts = {};
  for (const t of trayTiles) {
    counts[t.type] = (counts[t.type] || 0) + 1;
  }
  const toRemoveTypes = Object.keys(counts).filter(ty => counts[ty] >= 3);
  if (toRemoveTypes.length === 0) {
    return {
      trayTiles: trayTiles.map(t => ({ ...t })),
      scoreDelta: 0,
      removedTypes: []
    };
  }

  let tray = trayTiles.map(t => ({ ...t }));
  let scoreDelta = 0;
  const removedTypes = [];

  for (const type of toRemoveTypes) {
    let removedCount = 0;
    const newTray = [];
    for (let i = 0; i < tray.length; i += 1) {
      const t = tray[i];
      if (t.type === type && removedCount < 3) {
        removedCount += 1;
      } else {
        newTray.push(t);
      }
    }
    tray = newTray;
    const tilesMatched = 3;
    const baseScore = 10;
    scoreDelta += baseScore * tilesMatched;
    removedTypes.push(type);
  }

  return { trayTiles: tray, scoreDelta, removedTypes };
}

/**
 * Remove three tiles of each type in `typesInOrder`, processing types left-to-right on the tray
 * between removals (matches `handleMatchingInTrayAnimated` test/skip path for a subset of types).
 */
export function removeTriplesForTypesSequential(trayTiles, typesInOrder) {
  let tray = trayTiles.map(t => ({ ...t }));
  let scoreDelta = 0;
  const removedTypes = [];

  for (const type of typesInOrder) {
    let removedCount = 0;
    const newTray = [];
    for (let i = 0; i < tray.length; i += 1) {
      const t = tray[i];
      if (t.type === type && removedCount < 3) {
        removedCount += 1;
      } else {
        newTray.push(t);
      }
    }
    tray = newTray;
    const tilesMatched = 3;
    const baseScore = 10;
    scoreDelta += baseScore * tilesMatched;
    removedTypes.push(type);
  }

  return { trayTiles: tray, scoreDelta, removedTypes };
}

/**
 * Projected tray: committed tray plus a tile currently flying to the tray (not yet applied).
 * Does not mutate `committedTrayTiles`.
 * @param {Array<{id: string, type: string}>} committedTrayTiles
 * @param {{ id: string, type: string } | null | undefined} flyingTileRef
 * @returns {{ trayTiles: Array<{id: string, type: string}>, length: number }}
 */
export function getProjectedTray(committedTrayTiles, flyingTileRef) {
  let tray = committedTrayTiles.map(t => ({ ...t }));
  if (flyingTileRef) {
    tray = insertTrayTileByShape(tray, flyingTileRef);
  }
  return { trayTiles: tray, length: tray.length };
}

/**
 * Tray would overflow on this click: loss unless a combine animation will free a slot.
 * @param {number} combiningTypesCount — `_combiningTypes.length` in the live engine
 */
export function shouldTriggerTrayOverflowLoss(projectedLength, combiningTypesCount) {
  return projectedLength >= TRAY_MAX_TILES && combiningTypesCount === 0;
}

/**
 * Projected tray is full but at least one combine is in flight; click is queued (wait-for-room).
 */
export function shouldQueueWaitForRoom(projectedLength, combiningTypesCount) {
  return projectedLength >= TRAY_MAX_TILES && combiningTypesCount > 0;
}

/**
 * Skip-animation / instant-move path: pick from board into tray, run one triple-removal round.
 * Does not mutate inputs.
 *
 * @returns {{ ok: true, boardTiles, trayTiles, score, removedTypes, scoreDelta } | { ok: false, error: 'tray_full' | 'invalid_tile' }}
 */
export function applyCommittedPick({ boardTiles, trayTiles, score }, tileId) {
  if (trayTiles.length >= TRAY_MAX_TILES) {
    return { ok: false, error: 'tray_full' };
  }
  const tile = boardTiles.find(t => t.id === tileId);
  if (!tile || tile.removed) {
    return { ok: false, error: 'invalid_tile' };
  }

  const boardTilesNext = boardTiles.map(t =>
    t.id === tileId ? { ...t, removed: true } : { ...t }
  );
  const trayAfterInsert = insertTrayTileByShape(trayTiles, { id: tile.id, type: tile.type });
  const { trayTiles: trayAfterMatch, scoreDelta, removedTypes } = removeMatchingTriplesOneRound(trayAfterInsert);

  return {
    ok: true,
    boardTiles: boardTilesNext,
    trayTiles: trayAfterMatch,
    score: score + scoreDelta,
    removedTypes,
    scoreDelta
  };
}
