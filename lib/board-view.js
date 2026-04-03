/**
 * Board layout math and DOM mounting — shared by `game.js` and the level designer.
 * Requires `tile-layering.js` first (sets `globalThis.TripletTileLayering`).
 */

import { mountTileFace } from './tile-types.js';

function getTL() {
  const TL = globalThis.TripletTileLayering;
  if (!TL) {
    throw new Error('TripletTileLayering not loaded; include tile-layering.js before board-view');
  }
  return TL;
}

/**
 * Pixel position of a tile's center on the board (before translate(-50%,-50%)).
 * Odd z shifts the footprint by half a cell along (+x,-y); without a Y inset, y=0 odd-z
 * tiles would be centered on the top edge and half the tile draws above the frame.
 */
export function boardTileCenterPx(tile, cellSize) {
  const TL = getTL();
  const frac = TL.layerDiagonalFraction(tile.z);
  const insetY = 0.5 * cellSize;
  const baseLeft = (tile.x + 0.5) * cellSize;
  const baseTop = (tile.y + 0.5) * cellSize;
  return {
    left: baseLeft + frac * cellSize,
    top: baseTop - frac * cellSize + insetY
  };
}

/** Shift so tile bounding boxes (axis-aligned squares of side 2*half) are centered in the board. */
export function computeBoardContentOffsetPx(boardW, boardH, cellSize, tiles, halfExtentPx) {
  const half = halfExtentPx ?? cellSize / 2;
  if (!tiles.length) return { x: 0, y: 0 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const t of tiles) {
    const { left: cx, top: cy } = boardTileCenterPx(t, cellSize);
    minX = Math.min(minX, cx - half);
    maxX = Math.max(maxX, cx + half);
    minY = Math.min(minY, cy - half);
    maxY = Math.max(maxY, cy + half);
  }
  const bw = maxX - minX;
  const bh = maxY - minY;
  return {
    x: (boardW - bw) / 2 - minX,
    y: (boardH - bh) / 2 - minY
  };
}

/**
 * Playfield size and cell size from grid dimensions (+2 margin cells).
 * Single cellSize so tiles stay square; board may be rectangular if gridWidth !== gridHeight.
 *
 * @param {number} gridWidth
 * @param {number} gridHeight
 * @param {{ maxW?: number, maxH?: number, cellMinPx?: number, preferWidthFill?: boolean }} [options]
 * @param [options.preferWidthFill] If true, cell size follows the width budget first so the mat spans
 *   `maxW` (extra height scrolls). If false, the smaller of width/height fit is used (classic “fit in box”).
 */
export function measureBoardLayoutFromFit(gridWidth, gridHeight, options = {}) {
  const gw = Math.max(1, gridWidth);
  const gh = Math.max(1, gridHeight);
  const maxW = options.maxW ?? 448;
  const maxH = options.maxH ?? 448;
  const cellMinPx = options.cellMinPx ?? 40;
  const cellBaseW = maxW / (gw + 2);
  const cellBaseH = maxH / (gh + 2);
  const preferWidthFill = options.preferWidthFill === true;
  const cellSize = preferWidthFill
    ? Math.max(cellBaseW, cellMinPx)
    : Math.max(Math.min(cellBaseW, cellBaseH), cellMinPx);
  const widthPx = cellSize * (gw + 2);
  const heightPx = cellSize * (gh + 2);
  return { cellSize, widthPx, heightPx };
}

/**
 * Replace `boardEl` contents with absolutely positioned `.tile` nodes (game-style).
 * Used by the level designer; the game keeps its own reconciliation loop but uses the same helpers above.
 */
export function mountBoardTilesFill(boardEl, options) {
  const {
    layout,
    cellSize,
    widthPx,
    heightPx,
    tileClassName = 'tile blocked',
    zIndexBase = 10
  } = options;

  boardEl.replaceChildren();

  const footprint = layout.map((t) => ({ x: t.x, y: t.y, z: t.z }));
  const layoutOffset = computeBoardContentOffsetPx(widthPx, heightPx, cellSize, footprint);
  const tilesToRender = layout.slice().sort((a, b) => a.z - b.z);

  for (const tile of tilesToRender) {
    const el = document.createElement('div');
    el.className = tileClassName;
    mountTileFace(el, tile.type);
    el.tabIndex = -1;
    const { left: layeredLeft, top: layeredTop } = boardTileCenterPx(tile, cellSize);
    const lx = layeredLeft + layoutOffset.x;
    const ly = layeredTop + layoutOffset.y;
    el.style.cssText = `left:${lx}px;top:${ly}px;transform:translate(-50%,-50%);z-index:${zIndexBase + tile.z}`;
    boardEl.appendChild(el);
  }
}
