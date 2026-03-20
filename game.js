import {
  TRAY_MAX_TILES,
  getTrayInsertIndexForType,
  insertTrayTileByShape,
  removeMatchingTriplesOneRound,
  removeTriplesForTypesSequential,
  getProjectedTray,
  shouldQueueWaitForRoom,
  shouldTriggerTrayOverflowLoss,
  applyCommittedPick
} from './lib/game-model.js';

const TL = globalThis.TripletTileLayering;
if (!TL) throw new Error('TripletTileLayering not loaded; include tile-layering.js before game.js');

const TILE_TYPES = [
  { id: 'leaf', emoji: '🍃' },
  { id: 'flower', emoji: '🌸' },
  { id: 'clover', emoji: '🍀' },
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

/** Two fixed tutorial levels: short and simple, always first so players learn mechanics before harder levels. */
const TUTORIAL_LEVELS = [
  {
    id: 1,
    name: 'First Steps',
    gridSize: 6,
    layout: [
      { type: 'flower', x: 1, y: 2, z: 1 },
      { type: 'flower', x: 2, y: 2, z: 1 },
      { type: 'flower', x: 3, y: 2, z: 1 },
      { type: 'leaf', x: 1, y: 1, z: 0 },
      { type: 'leaf', x: 2, y: 1, z: 0 },
      { type: 'leaf', x: 3, y: 1, z: 0 }
    ]
  },
  {
    id: 2,
    name: 'Getting the Hang of It',
    gridSize: 6,
    layout: [
      { type: 'leaf', x: 1, y: 1, z: 0 },
      { type: 'leaf', x: 2, y: 1, z: 0 },
      { type: 'leaf', x: 3, y: 1, z: 0 },
      { type: 'flower', x: 1, y: 2, z: 0 },
      { type: 'flower', x: 2, y: 2, z: 0 },
      { type: 'flower', x: 3, y: 2, z: 0 },
      { type: 'flower', x: 1, y: 2, z: 1 },
      { type: 'flower', x: 2, y: 2, z: 1 },
      { type: 'flower', x: 3, y: 2, z: 1 }
    ]
  }
];

const FALLBACK_LEVELS = [
  ...TUTORIAL_LEVELS,
  {
    id: 3,
    name: 'Gentle Grove (Fallback)',
    gridSize: 6,
    layout: [
      { type: 'leaf', x: 1, y: 1, z: 1 },
      { type: 'leaf', x: 2, y: 1, z: 1 },
      { type: 'leaf', x: 3, y: 1, z: 1 },
      { type: 'flower', x: 1, y: 2, z: 0 },
      { type: 'flower', x: 2, y: 2, z: 0 },
      { type: 'flower', x: 3, y: 2, z: 0 },
      { type: 'clover', x: 1, y: 3, z: 0 },
      { type: 'clover', x: 2, y: 3, z: 0 },
      { type: 'clover', x: 3, y: 3, z: 0 }
    ]
  }
];

function buildLevelsArray() {
  const generated = typeof window !== 'undefined' && Array.isArray(window.__TRIPLET_GENERATED_LEVELS__)
    ? window.__TRIPLET_GENERATED_LEVELS__
    : null;
  if (!generated || generated.length === 0) return FALLBACK_LEVELS;
  const renumbered = generated.map((level, i) => ({
    ...level,
    id: i + 3,
    name: level.name.replace(/\s+\d+$/, '') + ` ${i + 3}`
  }));
  return [...TUTORIAL_LEVELS, ...renumbered];
}

const LEVELS = typeof window !== 'undefined' ? buildLevelsArray() : FALLBACK_LEVELS;

const STORAGE_KEYS = {
  PROGRESSION: 'triplet_tiles_progression',
  STATS: 'triplet_tiles_stats',
  POWERUPS: 'triplet_tiles_powerups'
};

const TRAY_ARIA_LABEL_DEFAULT = 'Tray';

/**
 * Pixel position of a tile's center on the board (before translate(-50%,-50%)).
 * Odd z shifts the footprint by half a cell along (+x,-y); without a Y inset, y=0 odd-z
 * tiles would be centered on the top edge and half the tile draws above the frame.
 */
function boardTileCenterPx(tile, cellSize) {
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
function computeBoardContentOffsetPx(boardW, boardH, cellSize, tiles, halfExtentPx) {
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

function rootRemToPx(rem) {
  const fs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return rem * fs;
}

/** Matches `.board-scroll-align` horizontal + vertical padding (12px × 2). */
const BOARD_SCROLL_ALIGN_PAD_PX = 24;

/**
 * Largest square side for the “comfortable” cap: min(448px, 92vw, scrollport inner square).
 * Uses #board-scroll’s box so the fit cap matches the real playfield (not a coarse vh − chrome guess).
 * Fallback ~matches tightened `.board` CSS (100dvh − ~14.25rem) when scrollport isn’t ready.
 */
function getBoardFitSquareSidePx() {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  let cap = Math.min(448, vw * 0.92);
  const scroll = ui.boardScroll;
  if (scroll && scroll.clientWidth > 0 && scroll.clientHeight > 0) {
    const innerW = scroll.clientWidth - BOARD_SCROLL_ALIGN_PAD_PX;
    const innerH = scroll.clientHeight - BOARD_SCROLL_ALIGN_PAD_PX;
    if (innerW > 0 && innerH > 0) {
      cap = Math.min(cap, innerW, innerH);
    } else {
      cap = Math.min(cap, vh - rootRemToPx(14.25));
    }
  } else {
    cap = Math.min(cap, vh - rootRemToPx(14.25));
  }
  return Math.max(120, cap);
}

function readBoardCellMinPx() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--board-cell-min').trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 40;
}

/**
 * Square playfield side and cell size for gridSize (cell = side / (gridSize + 2), floored by --board-cell-min).
 */
function measureBoardLayout(gridSize) {
  const g = Math.max(1, gridSize);
  const fitSide = getBoardFitSquareSidePx();
  const cellBase = fitSide / (g + 2);
  const cellSize = Math.max(cellBase, readBoardCellMinPx());
  const sidePx = cellSize * (g + 2);
  return { cellSize, sidePx };
}

function getTileVisual(typeId) {
  if (typeof typeId === 'number' && typeId >= 0 && typeId < TILE_TYPES.length) {
    return TILE_TYPES[typeId].emoji;
  }
  if (typeof typeId === 'string' && /^\d+$/.test(typeId)) {
    const idx = parseInt(typeId, 10);
    return TILE_TYPES[idx]?.emoji ?? '?';
  }
  const found = TILE_TYPES.find(t => t.id === typeId);
  return found ? found.emoji : '?';
}

const scoreFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

function formatScore(n) {
  return scoreFormatter.format(Number(n) || 0);
}

/** Readable tile type for ARIA labels (English id from data). */
function getTileTypeLabel(typeId) {
  if (typeof typeId === 'number' && typeId >= 0 && typeId < TILE_TYPES.length) {
    return TILE_TYPES[typeId].id;
  }
  if (typeof typeId === 'string' && /^\d+$/.test(typeId)) {
    return TILE_TYPES[parseInt(typeId, 10)]?.id ?? 'tile';
  }
  const found = TILE_TYPES.find(t => t.id === typeId);
  return found ? found.id : 'tile';
}

function focusElementIfStillMounted(el) {
  if (el && typeof el.focus === 'function' && el.isConnected) {
    try {
      el.focus({ preventScroll: true });
    } catch {
      // Some browsers reject preventScroll in edge cases
      try {
        el.focus();
      } catch {
        /* ignore */
      }
    }
  }
}

let _focusBeforeLevelSelect = null;
let _focusBeforeGameOverlay = null;
/** Set while #overlay is open so primary action matches copy (win = advance, loss = retry same level). */
let _gameOverlayOutcome = null;

/**
 * Keeps focus inside open dialogs: background is non-interactive (inert) per modality.
 * @param {'none' | 'game' | 'level-select'} mode
 */
function setModalBackdropInert(mode) {
  const header = ui.appHeader;
  const main = ui.appMain;
  const gameOverlay = ui.overlay;
  const apply = (el, on) => {
    if (!el) return;
    try {
      if ('inert' in el) el.inert = !!on;
    } catch {
      /* ignore */
    }
  };
  if (mode === 'none') {
    apply(header, false);
    apply(main, false);
    apply(gameOverlay, false);
    return;
  }
  if (mode === 'game') {
    apply(header, true);
    apply(main, true);
    apply(gameOverlay, false);
    return;
  }
  if (mode === 'level-select') {
    apply(header, true);
    apply(main, true);
    apply(gameOverlay, true);
  }
}

function loadLocal(key, defaultValue) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function saveLocal(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota or private mode errors
  }
}

const defaultStats = {
  levelsCompleted: 0,
  tilesClearedTotal: 0,
  bestWinStreak: 0,
  currentWinStreak: 0,
  sessionsPlayed: 0
};

const defaultPowerups = {
  undo: 1,
  shuffle: 1,
  removeType: 1
};

const state = {
  currentLevelIndex: 0,
  boardTiles: [],
  trayTiles: [],
  score: 0,
  stats: { ...defaultStats },
  powerups: { ...defaultPowerups },
  isLevelOver: false,
  isRemoveTypeMode: false,
  lastSnapshot: null
};

/** Used by E2E tests: promise resolved when the current move's animations (fly + any match-3) have finished. */
let _actionCompletePromise = null;
let _actionCompleteResolve = null;

/** When true, tile fly/combine/compact animations are skipped (used only by tests that play a full level). */
let skipAnimationsForTests = false;

/** Optional `() => number in [0,1)` for deterministic shuffle in tests; otherwise `Math.random`. */
let _shuffleRandom = null;
function shuffle01() {
  const fn = _shuffleRandom;
  return fn ? fn() : Math.random();
}

function shuffleArrayInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(shuffle01() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function isShuffleInteractionBlocked() {
  return (
    _currentFly != null ||
    _applyRunning ||
    _combiningTypes.length > 0 ||
    _isMoveAnimating
  );
}

/** Randomly permutes types among non-removed board tiles; positions and ids unchanged. */
function shuffleBoardTileTypesInPlace() {
  const active = state.boardTiles.filter(t => !t.removed);
  if (active.length < 2) return;
  const types = active.map(t => t.type);
  shuffleArrayInPlace(types);
  active.forEach((t, i) => {
    t.type = types[i];
  });
}

/** Queue of tile IDs to process when a click happens during an ongoing move animation. Ensures moves apply in click order. */
let _moveQueue = [];
let _isMoveAnimating = false;

/** Current fly in progress (snap approach: at most one). When user starts a new fly, we snap this one to target first. */
let _currentFly = null;
/** Queue of apply thunks; processed one at a time so fly completions don't race. */
let _applyQueue = [];
let _applyRunning = false;
/** Types currently being combined (in-flight combine animations). Blocks checkAllIdle until visuals finish. */
let _combiningTypes = [];
/** Pending tile IDs to start flying when tray has room (after a combine frees space). */
let _waitingForRoom = [];

const ui = {};

function initDomRefs() {
  ui.boardScroll = document.getElementById('board-scroll');
  ui.board = document.getElementById('board');
  ui.tray = document.getElementById('tray');
  ui.levelLabel = document.getElementById('level-label');
  ui.scoreValue = document.getElementById('score-value');
  ui.restartButton = document.getElementById('restart-button');
  ui.undoButton = document.getElementById('undo-button');
  ui.shuffleButton = document.getElementById('shuffle-button');
  ui.removeTypeButton = document.getElementById('remove-type-button');
  ui.undoCount = document.getElementById('undo-count');
  ui.shuffleCount = document.getElementById('shuffle-count');
  ui.removeTypeCount = document.getElementById('remove-type-count');

  ui.overlay = document.getElementById('overlay');
  ui.overlayTitle = document.getElementById('overlay-title');
  ui.overlayMessage = document.getElementById('overlay-message');
  ui.overlayPrimary = document.getElementById('overlay-primary');
  ui.overlaySecondary = document.getElementById('overlay-secondary');

  ui.levelSelectButton = document.getElementById('level-select-button');
  ui.levelSelectOverlay = document.getElementById('level-select-overlay');
  ui.levelSelectClose = document.getElementById('level-select-close');
  ui.levelSelectCarousel = document.getElementById('level-select-carousel');
  ui.levelSelectPrev = document.getElementById('level-select-prev');
  ui.levelSelectNext = document.getElementById('level-select-next');
  ui.levelSelectEasy = document.getElementById('level-select-easy');
  ui.levelSelectMedium = document.getElementById('level-select-medium');
  ui.levelSelectHard = document.getElementById('level-select-hard');
  ui.levelSelectHint = document.getElementById('level-select-hint');

  const app = document.getElementById('app');
  ui.appHeader = app?.querySelector(':scope > header') ?? null;
  ui.appMain = app?.querySelector(':scope > main') ?? null;
}

function bindEvents() {
  ui.restartButton.addEventListener('click', () => {
    startLevel(state.currentLevelIndex);
  });

  ui.overlayPrimary.addEventListener('click', () => {
    if (_gameOverlayOutcome === 'loss') {
      startLevel(state.currentLevelIndex);
    } else {
      if (state.currentLevelIndex < LEVELS.length - 1) {
        startLevel(state.currentLevelIndex + 1);
      } else {
        startLevel(0);
      }
    }
    hideOverlay();
  });

  ui.overlaySecondary.addEventListener('click', () => {
    startLevel(state.currentLevelIndex);
    hideOverlay();
  });

  ui.undoButton.addEventListener('click', () => {
    if (state.powerups.undo > 0 && state.lastSnapshot && !state.isLevelOver) {
      restoreSnapshot();
      state.powerups.undo -= 1;
      savePowerups();
      renderHud();
    }
  });

  ui.shuffleButton.addEventListener('click', () => {
    const onBoard = state.boardTiles.filter(t => !t.removed).length;
    if (
      state.powerups.shuffle > 0 &&
      onBoard >= 2 &&
      !state.isLevelOver &&
      !isShuffleInteractionBlocked()
    ) {
      shuffleBoardTileTypesInPlace();
      state.powerups.shuffle -= 1;
      savePowerups();
      renderBoard();
      renderHud();
    }
  });

  ui.removeTypeButton.addEventListener('click', () => {
    if (state.powerups.removeType > 0 && !state.isLevelOver) {
      state.isRemoveTypeMode = true;
      highlightTraySelectableTypes();
    }
  });

  if (ui.levelSelectButton) {
    ui.levelSelectButton.addEventListener('click', () => {
      showLevelSelect();
    });
  }
  if (ui.levelSelectClose) {
    ui.levelSelectClose.addEventListener('click', () => hideLevelSelect());
  }
  if (ui.levelSelectOverlay) {
    ui.levelSelectOverlay.addEventListener('click', (e) => {
      if (e.target === ui.levelSelectOverlay) hideLevelSelect();
    });
  }
  if (ui.levelSelectPrev) {
    ui.levelSelectPrev.addEventListener('click', () => levelSelectCarouselPrev());
  }
  if (ui.levelSelectNext) {
    ui.levelSelectNext.addEventListener('click', () => levelSelectCarouselNext());
  }
  if (ui.levelSelectEasy) {
    ui.levelSelectEasy.addEventListener('click', () => levelSelectGoToDifficulty('easy'));
  }
  if (ui.levelSelectMedium) {
    ui.levelSelectMedium.addEventListener('click', () => levelSelectGoToDifficulty('medium'));
  }
  if (ui.levelSelectHard) {
    ui.levelSelectHard.addEventListener('click', () => levelSelectGoToDifficulty('hard'));
  }

  ui.board.addEventListener('click', onBoardClick);
  ui.board.addEventListener('keydown', onBoardKeydown);
  ui.board.addEventListener('focusin', onBoardFocusIn);
  ui.board.addEventListener('focusout', onBoardFocusOut);

  if (ui.boardScroll) {
    ui.boardScroll.addEventListener('focusin', onBoardScrollRegionFocusIn);
  }

  ui.tray.addEventListener('click', onTrayClick);
  ui.tray.addEventListener('keydown', onTrayKeydown);
  ui.tray.addEventListener('focusin', onTrayFocusIn);
  ui.tray.addEventListener('focusout', onTrayFocusOut);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (ui.levelSelectOverlay && !ui.levelSelectOverlay.classList.contains('hidden')) {
      e.preventDefault();
      hideLevelSelect();
      return;
    }
    if (ui.overlay && !ui.overlay.classList.contains('hidden')) {
      e.preventDefault();
      ui.overlayPrimary?.click();
      return;
    }
    if (state.isRemoveTypeMode) {
      e.preventDefault();
      state.isRemoveTypeMode = false;
      clearRemoveTypeTrayUi();
      renderBoard();
    }
  });
}

function takeSnapshot() {
  state.lastSnapshot = {
    boardTiles: state.boardTiles.map(t => ({ ...t })),
    trayTiles: state.trayTiles.map(t => ({ ...t })),
    score: state.score
  };
}

function restoreSnapshot() {
  const snap = state.lastSnapshot;
  if (!snap) return;
  state.boardTiles = snap.boardTiles.map(t => ({ ...t }));
  state.trayTiles = snap.trayTiles.map(t => ({ ...t }));
  state.score = snap.score;
  state.isLevelOver = false;
  state.isRemoveTypeMode = false;
  state.lastSnapshot = null;
  _boardKeyboardPickAnchor = null;
  renderBoard();
  renderTray();
  renderHud();
}

function loadProgression() {
  const progression = loadLocal(STORAGE_KEYS.PROGRESSION, { highestLevelIndex: 0 });
  const savedIndex =
    progression && typeof progression.highestLevelIndex === 'number'
      ? progression.highestLevelIndex
      : 0;
  if (savedIndex >= 0 && savedIndex < LEVELS.length) {
    state.currentLevelIndex = savedIndex;
  } else {
    state.currentLevelIndex = 0;
  }

  const stats = loadLocal(STORAGE_KEYS.STATS, defaultStats);
  state.stats = { ...defaultStats, ...stats };

  const powerups = loadLocal(STORAGE_KEYS.POWERUPS, defaultPowerups);
  state.powerups = { ...defaultPowerups, ...powerups };
}

function saveProgression() {
  const highest = loadLocal(STORAGE_KEYS.PROGRESSION, { highestLevelIndex: 0 }).highestLevelIndex || 0;
  const highestLevelIndex = Math.max(highest, state.currentLevelIndex);
  saveLocal(STORAGE_KEYS.PROGRESSION, { highestLevelIndex });
}

function saveStats() {
  saveLocal(STORAGE_KEYS.STATS, state.stats);
}

function savePowerups() {
  saveLocal(STORAGE_KEYS.POWERUPS, state.powerups);
}

function startLevel(index) {
  const clampedIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
  state.currentLevelIndex = clampedIndex;
  _moveQueue = [];
  _isMoveAnimating = false;
  _currentFly = null;
  _applyQueue = [];
  _applyRunning = false;
  _combiningTypes = [];
  _waitingForRoom = [];
  const level = LEVELS[clampedIndex];
  state.boardTiles = level.layout.map((tile, i) => ({
    id: `t_${clampedIndex}_${i}`,
    type: typeof tile.type === 'number' ? String(tile.type) : tile.type,
    x: tile.x,
    y: tile.y,
    z: tile.z,
    removed: false
  }));
  _boardKeyboardFocusTileId = null;
  _boardKeyboardPickAnchor = null;
  state.trayTiles = [];
  state.score = 0;
  state.isLevelOver = false;
  state.isRemoveTypeMode = false;
  state.lastSnapshot = null;

  state.powerups = { ...defaultPowerups };
  savePowerups();

  if (ui.board) {
    ui.board.classList.remove('board-win');
    ui.board.classList.remove('board-loss');
  }

  state.stats.sessionsPlayed += 1;
  saveStats();

  renderHud();
  renderBoard();
  renderTray();
  tryFocusBoardOnLevelStart();
}

function isTileCovered(tile, ignoreTileId = null) {
  return state.boardTiles.some(
    other => other.id !== ignoreTileId && !other.removed && TL.tileCovers(other, tile)
  );
}

/** If ignoreTileId is set, tappable tiles are computed as if that tile were already removed (for early clickability during fly). */
function getTappableTiles(ignoreTileId = null) {
  return state.boardTiles.filter(
    tile => !tile.removed && tile.id !== ignoreTileId && !isTileCovered(tile, ignoreTileId)
  );
}

/**
 * Reading-order list of exposed tiles for keyboard navigation (top-to-bottom, left-to-right, then lower z first).
 * Matches visual grid order more closely than stacking (z-index) paint order.
 */
function getTappableTilesSortedForKeyboard(ignoreTileId = null) {
  const tap = getTappableTiles(ignoreTileId);
  return tap.slice().sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    if (a.x !== b.x) return a.x - b.x;
    return a.z - b.z;
  });
}

function boardTileActiveDescendantId(tileId) {
  return `board-tile-${tileId}`;
}

/** Roving tabindex: one logical focus on #board; this id is the active tile for arrows / Enter. */
let _boardKeyboardFocusTileId = null;

/** After a pick, `{ x, y, z }` of the removed tile — used once in the next `renderBoard` to place focus near/below. */
let _boardKeyboardPickAnchor = null;

/** Remove-type mode: focused tray slot index (left-to-right among occupied slots). */
let _trayRemoveTypeFocusSlotIndex = -1;

function getBoardKeyboardLayoutMetrics() {
  const level = LEVELS[state.currentLevelIndex];
  const { cellSize, sidePx } = measureBoardLayout(level.gridSize);
  const layoutFootprint = level.layout.map((t) => ({ x: t.x, y: t.y, z: t.z }));
  const layoutOffset = computeBoardContentOffsetPx(sidePx, sidePx, cellSize, layoutFootprint);
  return { cellSize, layoutOffset };
}

function boardTileCenterInBoardSpace(tile, cellSize, layoutOffset) {
  const { left, top } = boardTileCenterPx(tile, cellSize);
  return { cx: left + layoutOffset.x, cy: top + layoutOffset.y };
}

/**
 * Tappable tiles as if `removeId` were already gone (excluded from covering others).
 * Used to place keyboard focus immediately when a pick starts animating, before `renderBoard`.
 */
function getTappableTilesAsIfTileRemoved(removeId) {
  return state.boardTiles.filter(tile => {
    if (tile.removed || tile.id === removeId) return false;
    return !state.boardTiles.some(
      other =>
        other.id !== removeId &&
        other.id !== tile.id &&
        !other.removed &&
        TL.tileCovers(other, tile)
    );
  });
}

/**
 * Board pixel space (down = +cy).
 * Forward: nearest tappable in the arrow half-plane.
 * Wrap: jump to the far edge of the opposite side (e.g. left from column 1 → rightmost column), then row/column alignment, then distance.
 * Side / fallback: perpendicular band, then nearest.
 */
function pickTappableByArrowKey(fromId, key, tappableList, cellSize, layoutOffset) {
  const vec =
    key === 'ArrowRight'
      ? { vx: 1, vy: 0 }
      : key === 'ArrowLeft'
        ? { vx: -1, vy: 0 }
        : key === 'ArrowDown'
          ? { vx: 0, vy: 1 }
          : key === 'ArrowUp'
            ? { vx: 0, vy: -1 }
            : null;
  if (!vec || tappableList.length === 0) return null;

  const fromTile =
    tappableList.find(t => t.id === fromId) ||
    state.boardTiles.find(t => t.id === fromId && !t.removed);
  if (!fromTile) return null;

  const { cx: fx, cy: fy } = boardTileCenterInBoardSpace(fromTile, cellSize, layoutOffset);
  const PLANE_EPS = 2;

  function bestInHalfPlane(pred) {
    let bestT = null;
    let bestD = Infinity;
    for (const t of tappableList) {
      if (t.id === fromId) continue;
      const { cx, cy } = boardTileCenterInBoardSpace(t, cellSize, layoutOffset);
      const wx = cx - fx;
      const wy = cy - fy;
      const dot = wx * vec.vx + wy * vec.vy;
      if (!pred(dot)) continue;
      const dist2 = wx * wx + wy * wy;
      if (dist2 < bestD) {
        bestD = dist2;
        bestT = t;
      }
    }
    return bestT;
  }

  const forward = bestInHalfPlane(dot => dot > PLANE_EPS);
  if (forward) return forward.id;

  const scored = tappableList
    .filter(t => t.id !== fromId)
    .map(t => {
      const { cx, cy } = boardTileCenterInBoardSpace(t, cellSize, layoutOffset);
      const wx = cx - fx;
      const wy = cy - fy;
      const dist2 = wx * wx + wy * wy;
      return { t, cx, cy, wx, wy, dist2 };
    });

  function compareRowsFirst(a, b) {
    const ay = Math.abs(a.cy - fy);
    const by = Math.abs(b.cy - fy);
    if (ay !== by) return ay - by;
    return a.dist2 - b.dist2;
  }

  function compareColsFirst(a, b) {
    const ax = Math.abs(a.cx - fx);
    const bx = Math.abs(b.cx - fx);
    if (ax !== bx) return ax - bx;
    return a.dist2 - b.dist2;
  }

  let wrapCand = null;
  if (key === 'ArrowLeft') {
    const cands = scored.filter(s => s.cx > fx + PLANE_EPS);
    if (cands.length) {
      cands.sort((a, b) => {
        if (b.cx !== a.cx) return b.cx - a.cx;
        return compareRowsFirst(a, b);
      });
      wrapCand = cands[0].t;
    }
  } else if (key === 'ArrowRight') {
    const cands = scored.filter(s => s.cx < fx - PLANE_EPS);
    if (cands.length) {
      cands.sort((a, b) => {
        if (a.cx !== b.cx) return a.cx - b.cx;
        return compareRowsFirst(a, b);
      });
      wrapCand = cands[0].t;
    }
  } else if (key === 'ArrowUp') {
    const cands = scored.filter(s => s.cy > fy + PLANE_EPS);
    if (cands.length) {
      cands.sort((a, b) => {
        if (b.cy !== a.cy) return b.cy - a.cy;
        return compareColsFirst(a, b);
      });
      wrapCand = cands[0].t;
    }
  } else if (key === 'ArrowDown') {
    const cands = scored.filter(s => s.cy < fy - PLANE_EPS);
    if (cands.length) {
      cands.sort((a, b) => {
        if (a.cy !== b.cy) return a.cy - b.cy;
        return compareColsFirst(a, b);
      });
      wrapCand = cands[0].t;
    }
  }
  if (wrapCand) return wrapCand.id;

  const side = bestInHalfPlane(dot => Math.abs(dot) <= PLANE_EPS);
  if (side) return side.id;

  let best = null;
  let bestDist = Infinity;
  for (const t of tappableList) {
    if (t.id === fromId) continue;
    const { cx, cy } = boardTileCenterInBoardSpace(t, cellSize, layoutOffset);
    const wx = cx - fx;
    const wy = cy - fy;
    const dist2 = wx * wx + wy * wy;
    if (dist2 < bestDist) {
      bestDist = dist2;
      best = t;
    }
  }
  return best ? best.id : null;
}

/** Prefer tappable tiles visually below the anchor, else nearest by pixel distance. */
function pickNearestTappableAfterPick(anchor, cellSize, layoutOffset, tappableList) {
  if (!anchor || tappableList.length === 0) return null;
  const anchorTile = { x: anchor.x, y: anchor.y, z: anchor.z };
  const { cx: acx, cy: acy } = boardTileCenterInBoardSpace(anchorTile, cellSize, layoutOffset);
  const BELOW_EPS = 2;

  const scored = tappableList.map(t => {
    const { cx, cy } = boardTileCenterInBoardSpace(t, cellSize, layoutOffset);
    const dist2 = (cx - acx) ** 2 + (cy - acy) ** 2;
    return { t, cx, cy, dist2, below: cy > acy + BELOW_EPS };
  });

  const below = scored.filter(s => s.below).sort((a, b) => a.dist2 - b.dist2);
  if (below.length) return below[0].t.id;

  scored.sort((a, b) => a.dist2 - b.dist2);
  return scored[0].t.id;
}

function finalizeBoardKeyboardFocusAfterRender(cellSize, layoutOffset) {
  const tappable = getTappableTiles();
  if (_boardKeyboardPickAnchor && tappable.length > 0) {
    const pickedId = pickNearestTappableAfterPick(
      _boardKeyboardPickAnchor,
      cellSize,
      layoutOffset,
      tappable
    );
    _boardKeyboardPickAnchor = null;
    if (pickedId && tappable.some(t => t.id === pickedId)) {
      _boardKeyboardFocusTileId = pickedId;
      syncBoardKeyboardFocusVisual();
      scrollKeyboardFocusedTileIntoView();
      return;
    }
  }
  _boardKeyboardPickAnchor = null;
  ensureBoardKeyboardFocusTileId();
  syncBoardKeyboardFocusVisual();
}

function tryFocusBoardOnLevelStart() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!ui.board) return;
      if (state.isLevelOver || state.isRemoveTypeMode) return;
      if (ui.levelSelectOverlay && !ui.levelSelectOverlay.classList.contains('hidden')) return;
      if (ui.overlay && !ui.overlay.classList.contains('hidden')) return;
      if (getTappableTiles().length === 0) return;
      if (ui.board.tabIndex !== 0) return;
      ui.board.focus({ preventScroll: true });
    });
  });
}

function ensureBoardKeyboardFocusTileId(ignoreTileId = null) {
  const sorted = getTappableTilesSortedForKeyboard(ignoreTileId);
  if (sorted.length === 0) {
    _boardKeyboardFocusTileId = null;
    return;
  }
  const stillOk =
    _boardKeyboardFocusTileId && sorted.some(t => t.id === _boardKeyboardFocusTileId);
  if (!stillOk) {
    _boardKeyboardFocusTileId = sorted[0].id;
  }
}

function syncBoardKeyboardFocusVisual() {
  if (!ui.board) return;
  for (const child of ui.board.children) {
    if (!child.dataset.tileId) continue;
    const isKb =
      child.dataset.tileId === _boardKeyboardFocusTileId && child.classList.contains('tappable');
    child.classList.toggle('tile-keyboard-focus', isKb);
  }
  const boardFocused = document.activeElement === ui.board;
  const activeEl =
    _boardKeyboardFocusTileId &&
    ui.board.querySelector(`[data-tile-id="${_boardKeyboardFocusTileId}"]`);
  const showDesc =
    boardFocused &&
    activeEl &&
    activeEl.classList.contains('tappable') &&
    activeEl.id;
  if (showDesc) {
    ui.board.setAttribute('aria-activedescendant', activeEl.id);
  } else if (boardFocused) {
    ui.board.removeAttribute('aria-activedescendant');
  }
}

function clearBoardKeyboardFocusVisual() {
  if (!ui.board) return;
  ui.board.removeAttribute('aria-activedescendant');
  for (const child of ui.board.children) {
    child.classList.remove('tile-keyboard-focus');
  }
}

function scrollKeyboardFocusedTileIntoView() {
  if (!ui.board || !_boardKeyboardFocusTileId) return;
  const el = ui.board.querySelector(`[data-tile-id="${_boardKeyboardFocusTileId}"]`);
  el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function onBoardKeydown(e) {
  if (!ui.board || e.target !== ui.board) return;

  const arrowKeys = new Set(['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']);
  if (arrowKeys.has(e.key)) {
    e.preventDefault();
    const tappable = getTappableTilesSortedForKeyboard();
    if (tappable.length === 0) return;
    ensureBoardKeyboardFocusTileId();
    const { cellSize, layoutOffset } = getBoardKeyboardLayoutMetrics();
    const nextId = pickTappableByArrowKey(
      _boardKeyboardFocusTileId,
      e.key,
      tappable,
      cellSize,
      layoutOffset
    );
    if (nextId) {
      _boardKeyboardFocusTileId = nextId;
      syncBoardKeyboardFocusVisual();
      scrollKeyboardFocusedTileIntoView();
    }
    return;
  }

  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    ensureBoardKeyboardFocusTileId();
    if (_boardKeyboardFocusTileId) {
      handleBoardTileClick(_boardKeyboardFocusTileId);
    }
  }
}

function onBoardFocusIn(e) {
  if (!ui.board || e.target !== ui.board) return;
  ensureBoardKeyboardFocusTileId();
  syncBoardKeyboardFocusVisual();
}

function onBoardFocusOut(e) {
  if (!ui.board) return;
  const next = e.relatedTarget;
  if (next && ui.board.contains(next)) return;
  clearBoardKeyboardFocusVisual();
}

/** `.board-scroll-align` / `#board-scroll` must not hold focus; padding uses pointer-events: none, this catches stragglers. */
function onBoardScrollRegionFocusIn(e) {
  if (!ui.boardScroll) return;
  const t = e.target;
  if (t !== ui.boardScroll && !t.classList?.contains('board-scroll-align')) return;
  requestAnimationFrame(() => {
    if (state.isRemoveTypeMode && ui.tray && ui.tray.tabIndex === 0) {
      focusElementIfStillMounted(ui.tray);
      return;
    }
    if (ui.board && ui.board.tabIndex === 0) {
      focusElementIfStillMounted(ui.board);
    }
  });
}

function onBoardClick(e) {
  if (!ui.board) return;
  const t = e.target.closest('.tile');
  if (!t || !ui.board.contains(t) || !t.classList.contains('tappable')) return;
  const id = t.dataset.tileId;
  if (!id) return;
  _boardKeyboardFocusTileId = id;
  syncBoardKeyboardFocusVisual();
  handleBoardTileClick(id);
}

function getOccupiedTraySlotIndices() {
  const out = [];
  for (let i = 0; i < TRAY_MAX_TILES; i += 1) {
    if (state.trayTiles[i]) out.push(i);
  }
  return out;
}

function trayPickDomId(slotIndex) {
  return `tray-pick-slot-${slotIndex}`;
}

function clearRemoveTypeTrayUi() {
  if (!ui.tray) return;
  ui.tray.tabIndex = -1;
  ui.tray.removeAttribute('aria-activedescendant');
  ui.tray.setAttribute('aria-label', TRAY_ARIA_LABEL_DEFAULT);
  for (const slot of ui.tray.children) {
    const t = slot.querySelector?.('.tray-tile');
    if (!t) continue;
    t.classList.remove('selectable-type', 'tray-keyboard-focus');
    t.removeAttribute('id');
    t.removeAttribute('role');
    t.removeAttribute('aria-label');
    t.tabIndex = -1;
  }
  _trayRemoveTypeFocusSlotIndex = -1;
}

function ensureTrayRemoveTypeFocusSlot() {
  const occ = getOccupiedTraySlotIndices();
  if (occ.length === 0) {
    _trayRemoveTypeFocusSlotIndex = -1;
    return;
  }
  if (_trayRemoveTypeFocusSlotIndex < 0 || !occ.includes(_trayRemoveTypeFocusSlotIndex)) {
    _trayRemoveTypeFocusSlotIndex = occ[0];
  }
}

function syncTrayRemoveTypeVisual() {
  if (!ui.tray) return;
  for (const slot of ui.tray.children) {
    const t = slot.querySelector?.('.tray-tile');
    if (t) t.classList.remove('tray-keyboard-focus');
  }
  const slotEl = ui.tray.children[_trayRemoveTypeFocusSlotIndex];
  const el = slotEl?.querySelector?.('.tray-tile');
  const valid =
    el &&
    el.classList.contains('selectable-type') &&
    state.trayTiles[_trayRemoveTypeFocusSlotIndex];
  if (valid) {
    el.classList.add('tray-keyboard-focus');
  }
  const trayFocused = document.activeElement === ui.tray;
  if (trayFocused && valid && el.id) {
    ui.tray.setAttribute('aria-activedescendant', el.id);
  } else if (trayFocused) {
    ui.tray.removeAttribute('aria-activedescendant');
  }
}

function applyRemoveTypeTrayUi() {
  if (!ui.tray || !state.isRemoveTypeMode) return;
  const occ = getOccupiedTraySlotIndices();
  if (occ.length === 0) {
    state.isRemoveTypeMode = false;
    clearRemoveTypeTrayUi();
    return;
  }
  ui.tray.setAttribute(
    'aria-label',
    'Choose a tile type to remove from the board and tray. Arrow keys to move, Enter or Space to confirm, Escape to cancel.'
  );
  ui.tray.tabIndex = 0;
  for (let i = 0; i < ui.tray.children.length; i += 1) {
    const tileEl = ui.tray.children[i].querySelector?.('.tray-tile');
    const tile = state.trayTiles[i];
    if (!tileEl || !tile) {
      if (tileEl) {
        tileEl.classList.remove('selectable-type', 'tray-keyboard-focus');
        tileEl.removeAttribute('id');
        tileEl.removeAttribute('role');
        tileEl.removeAttribute('aria-label');
        tileEl.tabIndex = -1;
      }
      continue;
    }
    tileEl.id = trayPickDomId(i);
    tileEl.classList.add('selectable-type');
    tileEl.tabIndex = -1;
    tileEl.setAttribute('role', 'button');
    tileEl.setAttribute(
      'aria-label',
      `${getTileTypeLabel(tile.type)} in tray — remove this type from board and tray`
    );
  }
  ensureTrayRemoveTypeFocusSlot();
  syncTrayRemoveTypeVisual();
}

function onTrayClick(e) {
  if (!state.isRemoveTypeMode || state.powerups.removeType <= 0) return;
  const t = e.target.closest('.tray-tile');
  if (!t || !ui.tray.contains(t) || !t.classList.contains('selectable-type')) return;
  const slot = t.closest('.tray-slot');
  if (!slot) return;
  const slotIndex = Array.from(ui.tray.children).indexOf(slot);
  if (slotIndex < 0 || !state.trayTiles[slotIndex]) return;
  _trayRemoveTypeFocusSlotIndex = slotIndex;
  syncTrayRemoveTypeVisual();
  performRemoveType(state.trayTiles[slotIndex].type);
}

function onTrayKeydown(e) {
  if (!ui.tray || e.target !== ui.tray || !state.isRemoveTypeMode) return;
  const occ = getOccupiedTraySlotIndices();
  if (occ.length === 0) return;

  const nextKeys = new Set(['ArrowRight', 'ArrowDown']);
  const prevKeys = new Set(['ArrowLeft', 'ArrowUp']);
  if (nextKeys.has(e.key) || prevKeys.has(e.key)) {
    e.preventDefault();
    ensureTrayRemoveTypeFocusSlot();
    let idx = occ.indexOf(_trayRemoveTypeFocusSlotIndex);
    if (idx < 0) idx = 0;
    const delta = nextKeys.has(e.key) ? 1 : -1;
    idx = (idx + delta + occ.length) % occ.length;
    _trayRemoveTypeFocusSlotIndex = occ[idx];
    syncTrayRemoveTypeVisual();
    const inner = ui.tray.children[_trayRemoveTypeFocusSlotIndex]?.querySelector('.tray-tile');
    inner?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return;
  }

  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    ensureTrayRemoveTypeFocusSlot();
    const tile = state.trayTiles[_trayRemoveTypeFocusSlotIndex];
    if (tile) performRemoveType(tile.type);
  }
}

function onTrayFocusIn(e) {
  if (!ui.tray || e.target !== ui.tray || !state.isRemoveTypeMode) return;
  ensureTrayRemoveTypeFocusSlot();
  syncTrayRemoveTypeVisual();
}

function onTrayFocusOut(e) {
  if (!ui.tray) return;
  const next = e.relatedTarget;
  if (next && ui.tray.contains(next)) return;
  ui.tray.removeAttribute('aria-activedescendant');
  for (const slot of ui.tray.children) {
    const t = slot.querySelector?.('.tray-tile');
    t?.classList.remove('tray-keyboard-focus');
  }
}

/** Updates only tappable/blocked classes on board tiles (e.g. during fly so newly uncovered tiles become clickable). */
function updateBoardTappableState(ignoreTileId = null) {
  if (!ui.board) return;
  const tappableIds = new Set(getTappableTiles(ignoreTileId).map(t => t.id));
  for (const child of ui.board.children) {
    const id = child.dataset.tileId;
    if (!id) continue;
    const tappable = tappableIds.has(id);
    const hasSettle = child.classList.contains('tile-settle-in');
    child.className = 'tile' + (hasSettle ? ' tile-settle-in' : '') + (tappable ? ' tappable' : ' blocked');
    const tile = state.boardTiles.find(t => t.id === id);
    if (tappable && tile) {
      child.tabIndex = -1;
      child.setAttribute('role', 'button');
      child.setAttribute('aria-label', `${getTileTypeLabel(tile.type)}, exposed tile`);
    } else {
      child.tabIndex = -1;
      child.removeAttribute('role');
      child.removeAttribute('aria-label');
    }
  }

  if (_boardKeyboardPickAnchor != null && ignoreTileId != null) {
    const { cellSize, layoutOffset } = getBoardKeyboardLayoutMetrics();
    const hypothetical = getTappableTilesAsIfTileRemoved(ignoreTileId);
    const nextId = pickNearestTappableAfterPick(
      _boardKeyboardPickAnchor,
      cellSize,
      layoutOffset,
      hypothetical
    );
    _boardKeyboardPickAnchor = null;
    if (nextId && hypothetical.some(t => t.id === nextId)) {
      _boardKeyboardFocusTileId = nextId;
    } else {
      ensureBoardKeyboardFocusTileId(ignoreTileId);
    }
    syncBoardKeyboardFocusVisual();
    return;
  }

  ensureBoardKeyboardFocusTileId(ignoreTileId);
  syncBoardKeyboardFocusVisual();
}

/** Committed tray plus in-flight fly tile (if any). Matched triples leave committed tray when combine animations start. */
function getProjectedTrayLive() {
  const flying = _currentFly ? { id: _currentFly.tile.id, type: _currentFly.type } : null;
  return getProjectedTray(state.trayTiles, flying);
}

/** Called when one apply (including its handleMatchingInTrayAnimated) is fully done. Process next or mark idle. */
function applyQueueNext() {
  if (_applyQueue.length > 0) {
    const thunk = _applyQueue.shift();
    thunk();
  } else {
    _applyRunning = false;
    checkAllIdle();
  }
}

/** When no apply is running and queue is empty: mark not animating, resolve test promise, start any waiting-for-room fly. */
function checkAllIdle() {
  if (_applyRunning || _currentFly || _combiningTypes.length > 0) return;
  _isMoveAnimating = false;
  if (_actionCompleteResolve) {
    _actionCompleteResolve();
    _actionCompleteResolve = null;
    _actionCompletePromise = null;
  }
  if (_waitingForRoom.length > 0) {
    const nextId = _waitingForRoom.shift();
    setTimeout(() => handleBoardTileClick(nextId), 0);
  }
}

function enqueueApply(thunk) {
  _applyQueue.push(thunk);
  if (!_applyRunning) {
    _applyRunning = true;
    applyQueueNext();
  }
}

function handleBoardTileClick(tileId) {
  if (state.isLevelOver) return;

  let tile = state.boardTiles.find(t => t.id === tileId);
  if (!tile || tile.removed) return;
  // Ignore the flying tile when checking coverage (early clickability during fly; see getTappableTiles).
  const ignoreFlyingId = _currentFly ? _currentFly.tile.id : null;
  if (isTileCovered(tile, ignoreFlyingId)) {
    // FIFO: first blocked tap should retry first when the board updates (matches solver order under rapid clicks).
    _waitingForRoom.push(tileId);
    return;
  }

  if (skipAnimationsForTests) {
    const pick = applyCommittedPick(
      { boardTiles: state.boardTiles, trayTiles: state.trayTiles, score: state.score },
      tileId
    );
    if (!pick.ok) {
      if (pick.error === 'tray_full') {
        triggerLoss('The tray is full. Try managing your tiles more carefully next time.');
      }
      return;
    }
    _boardKeyboardPickAnchor = { x: tile.x, y: tile.y, z: tile.z };
    takeSnapshot();
    state.boardTiles = pick.boardTiles;
    state.trayTiles = pick.trayTiles;
    state.score = pick.score;
    state.stats.tilesClearedTotal += pick.removedTypes.length * 3;
    saveStats();
    renderBoard(true);
    renderTray();
    renderHud();
    checkWinCondition();
    return;
  }

  // Snap current fly to target so the new fly has a defined target (plan: option a)
  if (_currentFly) {
    clearTrayMakeRoomAnimation();
    _currentFly.cancelSnap();
  }

  // Re-resolve tile (unchanged; we're still processing this click)
  tile = state.boardTiles.find(t => t.id === tileId);
  if (!tile || tile.removed) return;

  const projected = getProjectedTrayLive();
  if (shouldQueueWaitForRoom(projected.length, _combiningTypes.length)) {
    _waitingForRoom.push(tileId);
    return;
  }
  if (shouldTriggerTrayOverflowLoss(projected.length, _combiningTypes.length)) {
    triggerLoss('The tray is full. Try managing your tiles more carefully next time.');
    return;
  }

  _boardKeyboardPickAnchor = { x: tile.x, y: tile.y, z: tile.z };
  takeSnapshot();

  const tileEl = ui.board.querySelector(`[data-tile-id="${tileId}"]`);
  const insertIndex = getTrayInsertIndexForType(state.trayTiles, tile.type);

  function applyMove(onMatchingDone) {
    tile.removed = true;
    state.trayTiles = insertTrayTileByShape(state.trayTiles, { id: tile.id, type: tile.type });
    renderBoard(true);
    renderTray();
    handleMatchingInTrayAnimated(() => {
      renderHud();
      checkWinCondition();
      onMatchingDone();
    });
  }

  _isMoveAnimating = true;
  if (typeof window !== 'undefined' && window.__tripletTestHooks) {
    _actionCompletePromise = new Promise(r => { _actionCompleteResolve = r; });
  }

  updateBoardTappableState(tile.id);
  // Capture fly target before shifting slots (make-room), so we animate to where the tile will land.
  const slotEl = ui.tray && ui.tray.children[insertIndex];
  const slotRect = slotEl ? slotEl.getBoundingClientRect() : null;
  const flyTargetX = slotRect ? slotRect.left + slotRect.width / 2 : null;
  const flyTargetY = slotRect ? slotRect.top + slotRect.height / 2 : null;
  startTrayMakeRoomAnimation(insertIndex);

  const handle = animateTileToTray(tile, tileEl, insertIndex, flyTargetX, flyTargetY, (isSnap) => {
    clearTrayMakeRoomAnimation();
    _currentFly = null;
    if (isSnap) {
      // Must chain applyQueueNext like the non-snap path; otherwise onMatchingDone is empty,
      // checkAllIdle never runs, and _isMoveAnimating stays true after snap + tray animations.
      applyMove(applyQueueNext);
    } else {
      enqueueApply(() => {
        applyMove(applyQueueNext);
      });
    }
  });
  _currentFly = handle;
}

function handleMatchingInTray() {
  const { trayTiles, scoreDelta, removedTypes } = removeMatchingTriplesOneRound(state.trayTiles);
  if (removedTypes.length === 0) return;
  state.trayTiles = trayTiles;
  state.score += scoreDelta;
  state.stats.tilesClearedTotal += removedTypes.length * 3;
  saveStats();
}

/** Returns types that currently have 3+ in tray (for animation). */
function getMatchingTypesInTray() {
  const counts = {};
  state.trayTiles.forEach(t => {
    counts[t.type] = (counts[t.type] || 0) + 1;
  });
  return Object.keys(counts).filter(type => counts[type] >= 3);
}

const FLY_DURATION_MS = 450;
const TRAY_SHIFT_DURATION_MS = 320;
const COMBINE_DURATION_MS = 600;
const TRAY_COMPACT_DURATION_MS = 320;

function prefersReducedMotionUi() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Full animation delay/duration, or ~none when the user prefers reduced motion (see style.css). */
function motionMs(fullMs) {
  return prefersReducedMotionUi() ? 0 : fullMs;
}

function startTrayCompactAnimation(removedSlotIndices) {
  if (!ui.tray || !ui.tray.children.length || removedSlotIndices.length === 0) return;
  const firstRemoved = Math.min(...removedSlotIndices);
  const lastRemoved = Math.max(...removedSlotIndices);
  const count = removedSlotIndices.length;

  const firstSlot = ui.tray.children[0];
  const firstRect = firstSlot.getBoundingClientRect();
  let gapPx = 0;
  if (ui.tray.children[1]) {
    const secondRect = ui.tray.children[1].getBoundingClientRect();
    gapPx = secondRect.left - (firstRect.left + firstRect.width);
  }
  const shiftPerSlot = firstRect.width + Math.max(0, gapPx);
  const shiftLeft = -(count * shiftPerSlot);
  ui.tray.style.setProperty('--tray-shift-left', `${shiftLeft}px`);
  ui.tray.classList.add('tray-compacting');

  let z = 18;
  for (let i = lastRemoved + 1; i < ui.tray.children.length; i += 1) {
    const slot = ui.tray.children[i];
    if (slot.querySelector('.tray-tile')) {
      slot.classList.add('tray-slot-shift-left');
      slot.style.zIndex = String(z);
      z += 1;
    }
  }
}

function clearTrayCompactAnimation() {
  if (!ui.tray) return;
  ui.tray.classList.remove('tray-compacting');
  ui.tray.style.removeProperty('--tray-shift-left');
  for (let i = 0; i < ui.tray.children.length; i += 1) {
    const slot = ui.tray.children[i];
    slot.classList.remove('tray-slot-shift-left');
    slot.style.removeProperty('z-index');
  }
}

function startTrayMakeRoomAnimation(insertIndex) {
  if (!ui.tray || !ui.tray.children.length) return;
  const firstSlot = ui.tray.children[0];
  const firstRect = firstSlot.getBoundingClientRect();
  let gapPx = 0;
  if (ui.tray.children[1]) {
    const secondRect = ui.tray.children[1].getBoundingClientRect();
    gapPx = secondRect.left - (firstRect.left + firstRect.width);
  }
  const shiftX = firstRect.width + Math.max(0, gapPx);
  ui.tray.style.setProperty('--tray-shift-x', `${shiftX}px`);
  ui.tray.classList.add('tray-making-room');
  let z = 10;
  for (let i = insertIndex; i < ui.tray.children.length; i += 1) {
    const slot = ui.tray.children[i];
    if (slot.querySelector('.tray-tile')) {
      slot.classList.add('tray-slot-shift-right');
      slot.style.zIndex = String(z);
      z -= 1;
    }
  }
}

function clearTrayMakeRoomAnimation() {
  if (!ui.tray) return;
  ui.tray.classList.remove('tray-making-room');
  ui.tray.style.removeProperty('--tray-shift-x');
  for (let i = 0; i < ui.tray.children.length; i += 1) {
    const slot = ui.tray.children[i];
    slot.classList.remove('tray-slot-shift-right');
    slot.style.removeProperty('z-index');
  }
}

/**
 * Animates a tile flying to the tray. Returns a handle with cancelSnap() to snap to end and run onComplete.
 * onComplete(isSnap) is called when the fly ends: isSnap true when snapped, false when finished naturally.
 * flyTargetX, flyTargetY: optional precomputed target (e.g. slot center before make-room shift); if omitted, read from slot.
 */
function animateTileToTray(tile, tileEl, insertIndex, flyTargetX, flyTargetY, onComplete) {
  const level = LEVELS[state.currentLevelIndex];
  const size = level.gridSize;
  const { cellSize, sidePx } = measureBoardLayout(size);
  const layoutFootprint = level.layout.map((t) => ({ x: t.x, y: t.y, z: t.z }));
  const off = computeBoardContentOffsetPx(sidePx, sidePx, cellSize, layoutFootprint);
  const boardRect = ui.board.getBoundingClientRect();
  const { left: layeredLeft, top: layeredTop } = boardTileCenterPx(tile, cellSize);

  const tileCenterX = boardRect.left + layeredLeft + off.x;
  const tileCenterY = boardRect.top + layeredTop + off.y;

  let targetX = flyTargetX;
  let targetY = flyTargetY;
  if (targetX == null || targetY == null) {
    const slotEl = ui.tray.children[insertIndex];
    const slotRect = slotEl ? slotEl.getBoundingClientRect() : null;
    targetX = slotRect ? slotRect.left + slotRect.width / 2 : boardRect.left + boardRect.width / 2;
    targetY = slotRect ? slotRect.top + slotRect.height / 2 : boardRect.bottom + 40;
  }

  const tileRect = tileEl ? tileEl.getBoundingClientRect() : null;
  const boardVisualPx =
    tileRect && tileRect.width > 0 ? tileRect.width : cellSize;
  // Fly element uses the same layout box as tray tiles (cellSize) so the last keyframe matches
  // the committed .tray-tile exactly — no subpixel mix of "scaled arbitrary rect" vs CSS px tile.
  const trayTargetPx = cellSize;
  const startScale = boardVisualPx / trayTargetPx;

  const fly = document.createElement('div');
  fly.className = 'tray-tile tile-flying';
  fly.textContent = getTileVisual(tile.type);
  fly.style.cssText = `
    position: fixed;
    left: ${tileCenterX}px;
    top: ${tileCenterY}px;
    width: ${trayTargetPx}px;
    height: ${trayTargetPx}px;
    margin-left: -${trayTargetPx / 2}px;
    margin-top: -${trayTargetPx / 2}px;
    box-sizing: border-box;
    z-index: 100;
    pointer-events: none;
  `;
  document.body.appendChild(fly);

  // Defer hiding the board tile to the next frame so we don't get two style writes in one frame
  // (renderBoard may have just run in the same frame, e.g. after previous fly completed).
  if (tileEl) {
    requestAnimationFrame(() => {
      if (tileEl.isConnected) tileEl.style.visibility = 'hidden';
    });
  }

  const animation = fly.animate(
    [
      { transform: `translate(0, 0) scale(${startScale})`, opacity: 1 },
      {
        transform: `translate(${targetX - tileCenterX}px, ${targetY - tileCenterY}px) scale(1)`,
        opacity: 1
      }
    ],
    {
      duration: motionMs(FLY_DURATION_MS),
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      fill: 'forwards'
    }
  );

  function finishFly(isSnap) {
    fly.remove();
    // Do not restore tile visibility: applyMove -> renderBoard will remove the tile from the DOM.
    // Restoring it here would make it flash briefly in its original spot before removal.
    onComplete(isSnap);
  }

  animation.finished.then(() => {
    finishFly(false);
  });

  return {
    cancelSnap() {
      if (animation.playState === 'finished' || animation.playState === 'idle') return;
      animation.cancel();
      finishFly(true);
    },
    tile,
    type: tile.type
  };
}

function animateMatchCombine(type, onComplete) {
  const trayTiles = Array.from(ui.tray.querySelectorAll('.tray-tile'));
  const byType = trayTiles.filter(el => el.dataset.type === type);
  const toAnimate = byType.slice(0, 3);
  if (toAnimate.length < 3) {
    onComplete([]);
    return;
  }

  const getSlotIndex = (el) => {
    const slot = el.closest('.tray-slot');
    return slot ? Array.from(ui.tray.children).indexOf(slot) : -1;
  };
  const removedSlotIndices = toAnimate.map(getSlotIndex).sort((a, b) => a - b);

  const centerEl = toAnimate[1];
  const centerRect = centerEl.getBoundingClientRect();
  const targetX = centerRect.left + centerRect.width / 2;
  const targetY = centerRect.top + centerRect.height / 2;

  const startPositions = toAnimate.map((el, i) => {
    const r = el.getBoundingClientRect();
    return {
      el,
      startX: r.left + r.width / 2,
      startY: r.top + r.height / 2,
      zIndex: i === 1 ? 103 : 102
    };
  });

  startPositions.forEach(({ el, zIndex }) => {
    el.classList.add('tile-combining');
    el.style.zIndex = String(zIndex);
    // Detach from tray so a later renderTray() from another applyMove cannot strip these nodes mid-animation.
    document.body.appendChild(el);
  });

  const combinePromises = startPositions.map(({ el, startX, startY, zIndex }) => {
    const half = el.getBoundingClientRect().width / 2;
    el.style.cssText = `position:fixed;left:${startX}px;top:${startY}px;margin-left:-${half}px;margin-top:-${half}px;z-index:${zIndex}`;
    return el.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${targetX - startX}px, ${targetY - startY}px) scale(1.2)`, opacity: 1 },
        { transform: `translate(${targetX - startX}px, ${targetY - startY}px) scale(0)`, opacity: 0 }
      ],
      { duration: motionMs(COMBINE_DURATION_MS), easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' }
    ).finished;
  });

  Promise.all(combinePromises).then(() => {
    toAnimate.forEach(el => el.remove());
    onComplete(removedSlotIndices);
  });
}

function handleMatchingInTrayAnimated(onComplete) {
  // Types already animating: still exclude from a new combine batch, but if new triples of those types
  // formed while flags are stale, we must sync-remove (solver parity) — see matchingTypes.length === 0 branch.
  const rawMatching = getMatchingTypesInTray();
  const matchingTypes = rawMatching.filter(t => !_combiningTypes.includes(t));
  if (rawMatching.length === 0) {
    onComplete();
    return;
  }
  if (matchingTypes.length === 0) {
    handleMatchingInTray();
    renderHud();
    onComplete();
    return;
  }

  if (skipAnimationsForTests) {
    const { trayTiles, scoreDelta, removedTypes } = removeTriplesForTypesSequential(
      state.trayTiles,
      matchingTypes
    );
    state.trayTiles = trayTiles;
    state.score += scoreDelta;
    state.stats.tilesClearedTotal += removedTypes.length * 3;
    saveStats();
    renderTray();
    onComplete();
    return;
  }

  _combiningTypes.push(...matchingTypes);

  // Match solver/skip path: remove triples from state immediately (handleMatchingInTray), then animate
  // the tiles we already rendered; reparent in animateMatchCombine keeps renderTray from killing nodes.
  handleMatchingInTray();
  renderHud();

  const combinePromises = matchingTypes.map(type => new Promise((resolve) => {
    animateMatchCombine(type, (removedSlotIndices) => {
      resolve(removedSlotIndices);
    });
  }));

  Promise.all(combinePromises).then((arrayOfRemovedArrays) => {
    const allRemovedIndices = [...new Set(arrayOfRemovedArrays.flat())].sort((a, b) => a - b);

    if (allRemovedIndices.length > 0) {
      startTrayCompactAnimation(allRemovedIndices);
      setTimeout(() => {
        clearTrayCompactAnimation();
        renderTray(true);
        _combiningTypes = _combiningTypes.filter(t => !matchingTypes.includes(t));
        onComplete();
      }, motionMs(TRAY_COMPACT_DURATION_MS));
    } else {
      renderTray(true);
      _combiningTypes = _combiningTypes.filter(t => !matchingTypes.includes(t));
      onComplete();
    }
  });
}

function checkWinCondition() {
  const anyOnBoard = state.boardTiles.some(t => !t.removed);
  if (!anyOnBoard && state.trayTiles.length === 0) {
    triggerWin();
  }
}

function triggerWin() {
  state.isLevelOver = true;
  state.stats.levelsCompleted += 1;
  state.stats.currentWinStreak += 1;
  state.stats.bestWinStreak = Math.max(state.stats.bestWinStreak, state.stats.currentWinStreak);
  saveStats();
  saveProgression();

  const level = LEVELS[state.currentLevelIndex];
  ui.overlayTitle.textContent = 'Level Complete';
  ui.overlayMessage.textContent = `You cleared ${level.name} with a score of ${formatScore(state.score)}.`;
  ui.overlayPrimary.textContent =
    state.currentLevelIndex < LEVELS.length - 1 ? 'Next Level' : 'Restart from Level 1';
  _gameOverlayOutcome = 'win';
  _focusBeforeGameOverlay = document.activeElement;
  setModalBackdropInert('game');
  ui.overlay.classList.remove('hidden');
  requestAnimationFrame(() => focusElementIfStillMounted(ui.overlayPrimary));
}

function triggerLoss(reason) {
  state.isLevelOver = true;
  state.stats.currentWinStreak = 0;
  saveStats();

  ui.overlayTitle.textContent = 'Level Failed';
  ui.overlayMessage.textContent = reason || 'The tray overflowed.';
  ui.overlayPrimary.textContent = 'Try Again';
  _gameOverlayOutcome = 'loss';
  _focusBeforeGameOverlay = document.activeElement;
  setModalBackdropInert('game');
  ui.overlay.classList.remove('hidden');
  requestAnimationFrame(() => focusElementIfStillMounted(ui.overlayPrimary));
}

function hideOverlay() {
  ui.overlay.classList.add('hidden');
  setModalBackdropInert('none');
  _gameOverlayOutcome = null;
  focusElementIfStillMounted(_focusBeforeGameOverlay);
  _focusBeforeGameOverlay = null;
}

// --- Level selection carousel ---
const LEVEL_SELECT_CARD_WIDTH = 88;
const LEVEL_SELECT_GAP = 12;

function getLevelSelectVisibleCount() {
  if (!ui.levelSelectCarousel) return 4;
  const w = ui.levelSelectCarousel.clientWidth;
  if (w <= 0) return 4;
  const perCard = LEVEL_SELECT_CARD_WIDTH + LEVEL_SELECT_GAP;
  const count = Math.floor(w / perCard);
  return Math.max(3, Math.min(4, count));
}

let levelSelectCarouselIndex = 0;

function getDifficultyBands() {
  const n = LEVELS.length;
  if (n === 0) return { easy: [0, 0], medium: [0, 0], hard: [0, 0] };
  const third = Math.max(1, Math.floor(n / 3));
  return {
    easy: [0, third],
    medium: [third, 2 * third],
    hard: [2 * third, n]
  };
}

function getDifficultyForIndex(index) {
  const bands = getDifficultyBands();
  if (index < bands.easy[1]) return 'easy';
  if (index < bands.medium[1]) return 'medium';
  return 'hard';
}

function getFirstIndexForDifficulty(difficulty) {
  const bands = getDifficultyBands()[difficulty];
  return bands ? bands[0] : 0;
}

function renderMiniLevel(wrapEl, level, levelIndex) {
  if (!wrapEl || !level) return;
  const size = level.gridSize;
  const padding = 2;
  const total = size + padding;
  const miniSize = 80;
  const cellSize = miniSize / total;

  const tiles = (level.layout || [])
    .slice()
    .sort((a, b) => (a.z - b.z));

  wrapEl.innerHTML = '';
  wrapEl.className = 'level-select-mini-wrap';
  wrapEl.dataset.levelIndex = String(levelIndex);

  const board = document.createElement('div');
  board.className = 'level-select-mini-board';
  board.style.width = `${miniSize}px`;
  board.style.height = `${miniSize}px`;

  const miniTilePx = Math.max(6, cellSize * 0.7);
  const miniHalf = miniTilePx / 2;
  const tileModels = tiles.map((t) => ({ x: t.x, y: t.y, z: t.z || 0 }));
  const off = computeBoardContentOffsetPx(miniSize, miniSize, cellSize, tileModels, miniHalf);

  tiles.forEach((tile) => {
    const el = document.createElement('div');
    el.className = 'level-select-mini-tile';
    el.textContent = getTileVisual(tile.type);
    const { left: layeredLeft, top: layeredTop } = boardTileCenterPx(
      { x: tile.x, y: tile.y, z: tile.z || 0 },
      cellSize
    );
    el.style.width = `${miniTilePx}px`;
    el.style.height = `${miniTilePx}px`;
    el.style.left = `${layeredLeft + off.x}px`;
    el.style.top = `${layeredTop + off.y}px`;
    el.style.fontSize = `${Math.max(8, cellSize * 0.5)}px`;
    el.style.zIndex = String(10 + (tile.z || 0));
    board.appendChild(el);
  });
  wrapEl.appendChild(board);
}

function buildLevelSelectCarousel(enterDirection = null) {
  if (!ui.levelSelectCarousel) return;
  const visibleCount = getLevelSelectVisibleCount();
  ui.levelSelectCarousel.classList.remove('carousel-exit-next', 'carousel-exit-prev');
  ui.levelSelectCarousel.innerHTML = '';
  const start = Math.max(0, levelSelectCarouselIndex);
  const end = Math.min(LEVELS.length, start + visibleCount);

  for (let i = start; i < end; i += 1) {
    const level = LEVELS[i];
    const card = document.createElement('div');
    card.className = 'level-select-card';
    card.dataset.levelIndex = String(i);
    if (i === state.currentLevelIndex) card.classList.add('level-select-card-current');
    if (enterDirection === 'next') card.classList.add('carousel-enter-from-right');
    if (enterDirection === 'prev') card.classList.add('carousel-enter-from-left');

    const mini = document.createElement('div');
    mini.className = 'level-select-mini-wrap';
    renderMiniLevel(mini, level, i);
    card.appendChild(mini);

    const label = document.createElement('span');
    label.className = 'level-select-card-label';
    label.textContent = `${level.id}: ${level.name}`;
    card.appendChild(label);

    const diff = document.createElement('span');
    diff.className = 'level-select-card-difficulty';
    diff.textContent = getDifficultyForIndex(i);
    card.appendChild(diff);

    const pickLevel = () => {
      startLevel(i);
      hideLevelSelect();
    };
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute(
      'aria-label',
      `Level ${level.id}: ${level.name}, ${getDifficultyForIndex(i)} difficulty`
    );
    card.addEventListener('click', pickLevel);
    card.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      pickLevel();
    });
    ui.levelSelectCarousel.appendChild(card);
  }

  if (enterDirection) {
    requestAnimationFrame(() => {
      const cards = ui.levelSelectCarousel.querySelectorAll('.level-select-card');
      cards.forEach((c) => c.classList.remove('carousel-enter-from-right', 'carousel-enter-from-left'));
    });
  }

  if (ui.levelSelectPrev) ui.levelSelectPrev.disabled = levelSelectCarouselIndex <= 0;
  if (ui.levelSelectNext) ui.levelSelectNext.disabled = levelSelectCarouselIndex >= Math.max(0, LEVELS.length - visibleCount);
}

const CAROUSEL_ANIMATION_MS = 280;
const CAROUSEL_FALLBACK_MS = CAROUSEL_ANIMATION_MS + 50;

function levelSelectCarouselPrev() {
  if (levelSelectCarouselIndex <= 0) return;
  const carousel = ui.levelSelectCarousel;
  carousel.classList.add('carousel-exit-prev');

  let done = false;
  const onDone = () => {
    if (done) return;
    done = true;
    carousel.removeEventListener('transitionend', onTransitionEnd);
    carousel.classList.remove('carousel-exit-prev');
    levelSelectCarouselIndex = Math.max(0, levelSelectCarouselIndex - 1);
    buildLevelSelectCarousel('prev');
  };

  const onTransitionEnd = (e) => {
    if (e.target.classList.contains('level-select-card') && e.propertyName === 'transform') {
      onDone();
    }
  };
  carousel.addEventListener('transitionend', onTransitionEnd);
  setTimeout(onDone, motionMs(CAROUSEL_FALLBACK_MS));
}

function levelSelectCarouselNext() {
  const visibleCount = getLevelSelectVisibleCount();
  const maxIndex = Math.max(0, LEVELS.length - visibleCount);
  if (levelSelectCarouselIndex >= maxIndex) return;

  const carousel = ui.levelSelectCarousel;
  carousel.classList.add('carousel-exit-next');

  let done = false;
  const onDone = () => {
    if (done) return;
    done = true;
    carousel.removeEventListener('transitionend', onTransitionEnd);
    carousel.classList.remove('carousel-exit-next');
    levelSelectCarouselIndex = Math.min(maxIndex, levelSelectCarouselIndex + 1);
    buildLevelSelectCarousel('next');
  };

  const onTransitionEnd = (e) => {
    if (e.target.classList.contains('level-select-card') && e.propertyName === 'transform') {
      onDone();
    }
  };
  carousel.addEventListener('transitionend', onTransitionEnd);
  setTimeout(onDone, motionMs(CAROUSEL_FALLBACK_MS));
}

function levelSelectGoToDifficulty(difficulty) {
  const visibleCount = getLevelSelectVisibleCount();
  const idx = getFirstIndexForDifficulty(difficulty);
  levelSelectCarouselIndex = Math.min(idx, Math.max(0, LEVELS.length - visibleCount));
  buildLevelSelectCarousel();
}

function showLevelSelect() {
  if (!ui.levelSelectOverlay) return;
  _focusBeforeLevelSelect = document.activeElement;
  setModalBackdropInert('level-select');
  ui.levelSelectOverlay.classList.remove('hidden');
  requestAnimationFrame(() => {
    const visibleCount = getLevelSelectVisibleCount();
    levelSelectCarouselIndex = Math.min(
      state.currentLevelIndex,
      Math.max(0, LEVELS.length - visibleCount)
    );
    buildLevelSelectCarousel();
    requestAnimationFrame(() => focusElementIfStillMounted(ui.levelSelectClose));
  });
}

function hideLevelSelect() {
  if (ui.levelSelectOverlay) ui.levelSelectOverlay.classList.add('hidden');
  setModalBackdropInert('none');
  focusElementIfStillMounted(_focusBeforeLevelSelect);
  _focusBeforeLevelSelect = null;
}

function highlightTraySelectableTypes() {
  const occupied = getOccupiedTraySlotIndices();
  if (occupied.length === 0) {
    state.isRemoveTypeMode = false;
    clearRemoveTypeTrayUi();
    renderHud();
    return;
  }
  applyRemoveTypeTrayUi();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (state.isRemoveTypeMode && ui.tray) ui.tray.focus();
    });
  });
}

function performRemoveType(type) {
  state.isRemoveTypeMode = false;
  clearRemoveTypeTrayUi();
  state.trayTiles = state.trayTiles.filter(t => t.type !== type);
  state.boardTiles.forEach(tile => {
    if (!tile.removed && tile.type === type) {
      tile.removed = true;
      state.stats.tilesClearedTotal += 1;
    }
  });
  state.powerups.removeType -= 1;
  savePowerups();
  saveStats();
  renderBoard();
  renderTray();
  renderHud();
  checkWinCondition();
}

function renderHud() {
  const level = LEVELS[state.currentLevelIndex];
  ui.levelLabel.textContent = `Level ${level.id}: ${level.name}`;
  ui.scoreValue.textContent = formatScore(state.score);
  ui.undoCount.textContent = String(state.powerups.undo);
  ui.shuffleCount.textContent = String(state.powerups.shuffle);
  ui.removeTypeCount.textContent = String(state.powerups.removeType);

  ui.undoButton.disabled = state.powerups.undo <= 0 || !state.lastSnapshot || state.isLevelOver;
  const boardShuffleable = state.boardTiles.filter(t => !t.removed).length >= 2;
  ui.shuffleButton.disabled =
    state.powerups.shuffle <= 0 ||
    !boardShuffleable ||
    state.isLevelOver ||
    isShuffleInteractionBlocked();
  ui.removeTypeButton.disabled = state.powerups.removeType <= 0 || state.isLevelOver;
}

function renderBoard(withSettleAnimation = false) {
  if (withSettleAnimation) {
    ui.board.classList.add('board-settle');
    const removeSettle = () => {
      ui.board.classList.remove('board-settle');
      ui.board.removeEventListener('transitionend', removeSettle);
    };
    ui.board.addEventListener('transitionend', removeSettle);
  }

  const level = LEVELS[state.currentLevelIndex];
  const size = level.gridSize;
  const { cellSize, sidePx } = measureBoardLayout(size);
  ui.board.style.width = `${sidePx}px`;
  ui.board.style.height = `${sidePx}px`;
  document.documentElement.style.setProperty('--tile-size', `${cellSize}px`);

  const tappableIds = new Set(getTappableTiles().map(t => t.id));
  const boardCanFocus =
    !state.isLevelOver && tappableIds.size > 0 && !state.isRemoveTypeMode;
  ui.board.tabIndex = boardCanFocus ? 0 : -1;

  const tilesToRender = state.boardTiles
    .filter(tile => !tile.removed)
    .slice()
    .sort((a, b) => a.z - b.z);

  const layoutFootprint = level.layout.map((t) => ({ x: t.x, y: t.y, z: t.z }));
  const layoutOffset = computeBoardContentOffsetPx(sidePx, sidePx, cellSize, layoutFootprint);

  const existingById = new Map();
  for (const child of ui.board.children) {
    const id = child.dataset.tileId;
    if (id) existingById.set(id, child);
  }

  const orderedElements = [];
  for (const tile of tilesToRender) {
    let el = existingById.get(tile.id);
    if (!el) {
      el = document.createElement('div');
      el.dataset.tileId = tile.id;
    } else {
      existingById.delete(tile.id);
    }

    el.id = boardTileActiveDescendantId(tile.id);
    const tappable = tappableIds.has(tile.id);
    el.className = 'tile' + (withSettleAnimation ? ' tile-settle-in' : '') + (tappable ? ' tappable' : ' blocked');
    el.textContent = getTileVisual(tile.type);
    el.tabIndex = -1;
    if (tappable) {
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${getTileTypeLabel(tile.type)}, exposed tile`);
    } else {
      el.removeAttribute('role');
      el.removeAttribute('aria-label');
    }
    const { left: layeredLeft, top: layeredTop } = boardTileCenterPx(tile, cellSize);
    const lx = layeredLeft + layoutOffset.x;
    const ly = layeredTop + layoutOffset.y;
    el.style.cssText = `left:${lx}px;top:${ly}px;transform:translate(-50%,-50%);z-index:${10 + tile.z}`;
    orderedElements.push(el);
  }

  for (const el of existingById.values()) el.remove();
  for (const el of orderedElements) {
    if (el.parentNode !== ui.board) ui.board.appendChild(el);
  }

  finalizeBoardKeyboardFocusAfterRender(cellSize, layoutOffset);
}

function renderTray(forceRebuild = false) {
  const maxSlots = TRAY_MAX_TILES;

  const canReuse = !forceRebuild && ui.tray.children.length === maxSlots;
  if (canReuse) {
    for (let i = 0; i < maxSlots; i += 1) {
      const slot = ui.tray.children[i];
      const inner = slot.querySelector('.tray-slot-inner');
      if (!inner) continue;
      const tile = state.trayTiles[i];
      const existingTileEl = inner.querySelector('.tray-tile');
      if (tile) {
        if (existingTileEl) {
          if (existingTileEl.dataset.type !== tile.type) {
            existingTileEl.dataset.type = tile.type;
            existingTileEl.textContent = getTileVisual(tile.type);
          }
        } else {
          const tileEl = document.createElement('div');
          tileEl.className = 'tray-tile';
          tileEl.textContent = getTileVisual(tile.type);
          tileEl.dataset.type = tile.type;
          inner.appendChild(tileEl);
        }
      } else if (existingTileEl) {
        existingTileEl.remove();
      }
    }
    if (state.isRemoveTypeMode) {
      applyRemoveTypeTrayUi();
    } else {
      clearRemoveTypeTrayUi();
    }
    return;
  }

  let html = '';
  for (let i = 0; i < maxSlots; i += 1) {
    const tile = state.trayTiles[i];
    const tileContent = tile
      ? `<div class="tray-tile" data-type="${tile.type}">${getTileVisual(tile.type)}</div>`
      : '';
    html += `<div class="tray-slot"><div class="tray-slot-inner">${tileContent}</div></div>`;
  }
  ui.tray.innerHTML = html;
  if (state.isRemoveTypeMode) {
    applyRemoveTypeTrayUi();
  } else {
    clearRemoveTypeTrayUi();
  }
}

// Test hooks for automated E2E tests (Playwright)
// Exposed on window to allow tests to control and inspect game state.
if (typeof window !== 'undefined') {
  window.__tripletTestHooks = {
    startLevel,
    getState() {
      return state;
    },
    getTappableTiles,
    clickTileById(tileId) {
      handleBoardTileClick(tileId);
    },
    getBoardKeyboardFocusTileId() {
      return _boardKeyboardFocusTileId;
    },
    getBoardKeyboardArrowTarget(fromId, key) {
      const tappable = getTappableTilesSortedForKeyboard();
      const { cellSize, layoutOffset } = getBoardKeyboardLayoutMetrics();
      return pickTappableByArrowKey(fromId, key, tappable, cellSize, layoutOffset);
    },
    getBoardTileCenterBoardPx(tileId) {
      const tile = state.boardTiles.find(t => t.id === tileId);
      if (!tile || tile.removed) return null;
      const { cellSize, layoutOffset } = getBoardKeyboardLayoutMetrics();
      return boardTileCenterInBoardSpace(tile, cellSize, layoutOffset);
    },
    /** Returns a promise that resolves when the current move's animations (fly + any match-3) have finished. */
    waitForActionComplete() {
      return _actionCompletePromise || Promise.resolve();
    },
    setSkipAnimations(skip) {
      skipAnimationsForTests = !!skip;
    },
    resetAllProgress() {
      try {
        Object.values(STORAGE_KEYS).forEach(key => {
          window.localStorage.removeItem(key);
        });
      } catch {
        // ignore storage errors in tests
      }
      state.stats = { ...defaultStats };
      state.powerups = { ...defaultPowerups };
      state.currentLevelIndex = 0;
      startLevel(0);
    },
    setTrayTilesForTest(trayTiles) {
      state.trayTiles = trayTiles.map((tile, index) => ({
        id: tile.id || `test_${index}`,
        type: tile.type
      }));
      renderTray();
      renderHud();
    },
    setPowerupsForTest(partialPowerups) {
      state.powerups = { ...state.powerups, ...partialPowerups };
      renderHud();
      savePowerups();
    },
    /** `fn` returns a value in [0,1); pass null to use Math.random again. */
    setShuffleRandomForTest(fn) {
      _shuffleRandom = typeof fn === 'function' ? fn : null;
    },
    tileCovers: TL.tileCovers,
    /** For E2E / Playwright: internal animation queue state (not game design API). */
    getEngineDebugSnapshot() {
      return {
        boardLeft: state.boardTiles.filter(t => !t.removed).length,
        trayLen: state.trayTiles.length,
        isLevelOver: state.isLevelOver,
        waitingForRoomLen: _waitingForRoom.length,
        moveQueueLen: _moveQueue.length,
        hasCurrentFly: _currentFly != null,
        applyRunning: _applyRunning,
        applyQueueLen: _applyQueue.length,
        combiningTypesLen: _combiningTypes.length,
        combiningTypes: [..._combiningTypes],
        isMoveAnimating: _isMoveAnimating
      };
    }
  };
}

let _boardScrollRoTimer = 0;

function installBoardScrollResizeObserver() {
  if (typeof ResizeObserver === 'undefined' || !ui.boardScroll) return;
  const ro = new ResizeObserver(() => {
    clearTimeout(_boardScrollRoTimer);
    _boardScrollRoTimer = setTimeout(() => {
      renderBoard();
    }, 60);
  });
  ro.observe(ui.boardScroll);
}

function main() {
  initDomRefs();
  bindEvents();
  installBoardScrollResizeObserver();
  loadProgression();
  startLevel(state.currentLevelIndex);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}

