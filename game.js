import {
  TRAY_MAX_TILES,
  getTrayInsertIndexForType,
  insertTrayTileByShape,
  removeMatchingTriplesOneRound,
  removeTriplesForTypesSequential,
  getProjectedTray,
  shouldQueueWaitForRoom,
  shouldTriggerTrayOverflowLoss,
  applyCommittedPick,
  getTripleRemovalTypeOrder
} from './lib/game-model.js';
import { boardTileCenterPx, computeBoardContentOffsetPx, measureBoardLayoutFromFit } from './lib/board-view.js';
import {
  buildTileTypeRemapForLayout,
  getTileFaceInnerHtml,
  mountTileFace,
  normalizeLevelTileType
} from './lib/tile-types.js';
import { createAudioService, SFX_IDS, HAPTIC_KIND } from './lib/audio-service.js';
import {
  initI18n,
  onLocaleChange,
  t,
  applyDomI18n,
  formatGameInteger,
  resolveLossMessage,
  tileTypeLabel as localizedTileTypeLabel,
  difficultyLabel,
  displayShapeName,
  translateLevelDisplayName,
  setLocale
} from './lib/i18n.js';
import { startWinStarFx, stopWinStarFx } from './lib/win-star-fx.js';

const TL = globalThis.TripletTileLayering;
if (!TL) throw new Error('TripletTileLayering not loaded; include tile-layering.js before game.js');

/** Layout `type` values are indices into `TILE_TYPES` (0 = evergreen-tree, 1 = flower, 2 = grapes, …). */

/** Two fixed tutorial levels: short and simple, always first so players learn mechanics before harder levels. */
const TUTORIAL_LEVELS = [
  {
    id: 1,
    name: 'First Steps',
    gridWidth: 6,
    gridHeight: 6,
    layout: [
      { type: 1, x: 1, y: 2, z: 1 },
      { type: 1, x: 2, y: 2, z: 1 },
      { type: 1, x: 3, y: 2, z: 1 },
      { type: 0, x: 1, y: 1, z: 0 },
      { type: 0, x: 2, y: 1, z: 0 },
      { type: 0, x: 3, y: 1, z: 0 }
    ]
  },
  {
    id: 2,
    name: 'Getting the Hang of It',
    gridWidth: 6,
    gridHeight: 6,
    layout: [
      { type: 0, x: 1, y: 1, z: 0 },
      { type: 0, x: 2, y: 1, z: 0 },
      { type: 0, x: 3, y: 1, z: 0 },
      { type: 1, x: 1, y: 2, z: 0 },
      { type: 1, x: 2, y: 2, z: 0 },
      { type: 1, x: 3, y: 2, z: 0 },
      { type: 1, x: 1, y: 2, z: 1 },
      { type: 1, x: 2, y: 2, z: 1 },
      { type: 1, x: 3, y: 2, z: 1 }
    ]
  }
];

const FALLBACK_LEVELS = [
  ...TUTORIAL_LEVELS,
  {
    id: 3,
    name: 'Gentle Grove (Fallback)',
    gridWidth: 6,
    gridHeight: 6,
    layout: [
      { type: 0, x: 1, y: 1, z: 1 },
      { type: 0, x: 2, y: 1, z: 1 },
      { type: 0, x: 3, y: 1, z: 1 },
      { type: 1, x: 1, y: 2, z: 0 },
      { type: 1, x: 2, y: 2, z: 0 },
      { type: 1, x: 3, y: 2, z: 0 },
      { type: 2, x: 1, y: 3, z: 0 },
      { type: 2, x: 2, y: 3, z: 0 },
      { type: 2, x: 3, y: 3, z: 0 }
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
  POWERUPS: 'triplet_tiles_powerups',
  AUDIO: 'triplet_tiles_audio',
  SESSION: 'triplet_tiles_session',
  UI: 'triplet_tiles_ui'
};

/** @type {{ compactChrome: boolean }} */
const DEFAULT_UI_PREFS = { compactChrome: true };

/** Increment when the JSON shape of `triplet_tiles_session` changes. */
const SESSION_SCHEMA_VERSION = 1;

/** music_ambient_loop_01 — Late Afternoon Garden Loop (Suno); attribution in AUDIO_DESIGN.md. */
const MUSIC_AMBIENT_LOOP_URL = new URL('./assets/audio/music_ambient_loop_01.mp3', import.meta.url).href;
const SFX_URL_MAP = {
  [SFX_IDS.TILE_PICK]: new URL('./assets/audio/sfx_tile_pick.opus', import.meta.url).href,
  [SFX_IDS.MATCH_CLEAR]: [
    new URL('./assets/audio/sfx_match_clear_a.opus', import.meta.url).href,
    new URL('./assets/audio/sfx_match_clear_b.opus', import.meta.url).href,
    new URL('./assets/audio/sfx_match_clear_c.opus', import.meta.url).href
  ],
  [SFX_IDS.LEVEL_WIN]: new URL('./assets/audio/sfx_level_win.opus', import.meta.url).href,
  [SFX_IDS.LEVEL_LOSS]: new URL('./assets/audio/sfx_level_loss.opus', import.meta.url).href
};
const audioSvc = createAudioService({
  storageKey: STORAGE_KEYS.AUDIO,
  musicUrl: MUSIC_AMBIENT_LOOP_URL,
  sfxUrlMap: SFX_URL_MAP
});

function rootRemToPx(rem) {
  const fs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return rem * fs;
}

/** Matches `.board-scroll-align` horizontal + vertical padding (12px × 2). */
const BOARD_SCROLL_ALIGN_PAD_PX = 24;

/** Cached DOM layout inputs for `measureBoardLayout`; invalidated on viewport / scrollport change. */
let _layoutReadCache = null;

function invalidateLayoutReadCache() {
  _layoutReadCache = null;
}

/** Prefer visual viewport height on mobile (browser chrome, pinch-zoom). */
function getViewportHeightPx() {
  const vv = window.visualViewport;
  if (vv && typeof vv.height === 'number' && vv.height > 0) return vv.height;
  return window.innerHeight;
}

/**
 * Single read of viewport, #board-scroll, root rem, and --board-cell-min. Cached until invalidation.
 * User Timing name `getBoardFitRectPx` kept for perf benchmarks (covers all layout reads in one measure on miss).
 * @returns {{ maxW: number, maxH: number, cellMin: number }}
 */
function readLayoutInputs() {
  if (_layoutReadCache) return _layoutReadCache;
  _layoutReadCache = perfMeasureSync('getBoardFitRectPx', () => {
    const vw = document.documentElement.clientWidth;
    const vh = getViewportHeightPx();
    let maxW = Math.min(448, vw * 0.92);
    let maxH = Math.min(448, vh - rootRemToPx(14.25));
    const scroll = ui.boardScroll;
    if (scroll && scroll.clientWidth > 0 && scroll.clientHeight > 0) {
      const innerW = scroll.clientWidth - BOARD_SCROLL_ALIGN_PAD_PX;
      const innerH = scroll.clientHeight - BOARD_SCROLL_ALIGN_PAD_PX;
      if (innerW > 0 && innerH > 0) {
        maxW = Math.min(maxW, innerW);
        maxH = Math.min(maxH, innerH);
      }
    }
    const maxWc = Math.max(120, maxW);
    const maxHc = Math.max(120, maxH);
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--board-cell-min').trim();
    const n = parseFloat(raw);
    const cellMin = Number.isFinite(n) && n > 0 ? n : 40;
    return { maxW: maxWc, maxH: maxHc, cellMin };
  });
  return _layoutReadCache;
}

/**
 * Max width/height (px) for the board mat inside #board-scroll (padding accounted for).
 * Matches prior square cap when grid is square: min(maxW,maxH) was the old fit side.
 */
function getBoardFitRectPx() {
  const { maxW, maxH } = readLayoutInputs();
  return { maxW, maxH };
}

function readBoardCellMinPx() {
  return readLayoutInputs().cellMin;
}

/**
 * Playfield size and cell size from grid dimensions (+2 margin cells).
 * Single cellSize so tiles stay square; board may be rectangular if gridWidth !== gridHeight.
 */
function measureBoardLayout(gridWidth, gridHeight) {
  const { maxW, maxH, cellMin } = readLayoutInputs();
  return measureBoardLayoutFromFit(gridWidth, gridHeight, { maxW, maxH, cellMinPx: cellMin });
}

/** @param {{ gridWidth?: number, gridHeight?: number, gridSize?: number }} level */
function normalizeGridDims(level) {
  const gw = level.gridWidth;
  const gh = level.gridHeight;
  if (Number.isFinite(gw) && Number.isFinite(gh) && gw >= 1 && gh >= 1) {
    return { gridWidth: Math.floor(gw), gridHeight: Math.floor(gh) };
  }
  const gs = level.gridSize;
  if (Number.isFinite(gs) && gs >= 1) {
    const g = Math.floor(gs);
    return { gridWidth: g, gridHeight: g };
  }
  return { gridWidth: 6, gridHeight: 6 };
}

function formatScore(n) {
  return formatGameInteger(n);
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
let _focusBeforeSettings = null;
let _focusBeforeGameOverlay = null;
/** Set while #overlay is open so primary action matches copy (win = advance, loss = retry same level). */
let _gameOverlayOutcome = null;
/** Last loss overlay message (persisted with session for reload). */
let _lastLossReason = '';

/**
 * Keeps focus inside open dialogs: background is non-interactive (inert) per modality.
 * @param {'none' | 'game' | 'level-select' | 'settings'} mode
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
    return;
  }
  if (mode === 'settings') {
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

function clearSessionStorage() {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.SESSION);
  } catch {
    /* ignore */
  }
}

let _sessionSaveTimer = 0;

function canSaveSession() {
  return (
    !_applyRunning &&
    !_currentFly &&
    _combiningTypes.length === 0 &&
    !_isMoveAnimating &&
    _waitingForRoom.length === 0
  );
}

function serializeSession() {
  return {
    v: SESSION_SCHEMA_VERSION,
    levelIndex: state.currentLevelIndex,
    boardTiles: state.boardTiles.map(t => ({ ...t })),
    trayTiles: state.trayTiles.map(t => ({ ...t })),
    score: state.score,
    powerups: { ...state.powerups },
    isLevelOver: state.isLevelOver,
    lastSnapshot: state.lastSnapshot
      ? {
          boardTiles: state.lastSnapshot.boardTiles.map(t => ({ ...t })),
          trayTiles: state.lastSnapshot.trayTiles.map(t => ({ ...t })),
          score: state.lastSnapshot.score
        }
      : null,
    overlayOutcome: _gameOverlayOutcome,
    lossMessage: _gameOverlayOutcome === 'loss' ? _lastLossReason : undefined
  };
}

function saveSessionImmediate() {
  if (typeof window === 'undefined') return;
  if (!canSaveSession()) return;
  saveLocal(STORAGE_KEYS.SESSION, serializeSession());
}

function scheduleSaveSession() {
  if (typeof window === 'undefined') return;
  clearTimeout(_sessionSaveTimer);
  _sessionSaveTimer = setTimeout(() => {
    _sessionSaveTimer = 0;
    saveSessionImmediate();
  }, 150);
}

function flushSessionSave() {
  if (typeof window === 'undefined') return;
  clearTimeout(_sessionSaveTimer);
  _sessionSaveTimer = 0;
  saveSessionImmediate();
}

/** Clears move/animation queues. Shared by `startLevel` and session restore. */
function resetMoveEngine() {
  _moveQueue = [];
  _isMoveAnimating = false;
  _currentFly = null;
  _applyQueue = [];
  _applyRunning = false;
  _combiningTypes = [];
  _waitingForRoom = [];
}

function showWinOverlayUi() {
  const level = LEVELS[state.currentLevelIndex];
  ui.overlayTitle.textContent = t('overlay.winTitle');
  ui.overlayMessage.textContent = t('overlay.winBody', {
    name: translateLevelDisplayName(level),
    score: formatScore(state.score)
  });
  const isLast = state.currentLevelIndex >= LEVELS.length - 1;
  const primaryLabel = isLast ? t('overlay.restartFrom1') : t('overlay.nextLevel');
  ui.overlayPrimary.setAttribute('aria-label', primaryLabel);
  ui.overlayPrimary.title = primaryLabel;
  setPhosphorIcon(
    ui.overlayPrimary,
    isLast ? (isDocumentRtl() ? 'arrow-counter-clockwise' : 'arrow-clockwise') : iconCaretForward()
  );
  if (ui.overlaySecondary) setPhosphorIcon(ui.overlaySecondary, iconRetryCurvedArrow());
  ui.overlaySecondary?.classList.remove('hidden');
  _gameOverlayOutcome = 'win';
  _focusBeforeGameOverlay = document.activeElement;
  setModalBackdropInert('game');
  ui.overlay.classList.remove('hidden');
  stopWinStarFx();
  if (ui.winStarFx) {
    if (!prefersReducedMotionUi() && !skipAnimationsForTests) {
      ui.winStarFx.classList.remove('hidden');
      requestAnimationFrame(() => {
        startWinStarFx(ui.winStarFx);
        focusElementIfStillMounted(ui.overlayPrimary);
      });
    } else {
      ui.winStarFx.classList.add('hidden');
      requestAnimationFrame(() => focusElementIfStillMounted(ui.overlayPrimary));
    }
  } else {
    requestAnimationFrame(() => focusElementIfStillMounted(ui.overlayPrimary));
  }
}

function showLossOverlayUi(reason) {
  _lastLossReason = reason || '';
  ui.overlayTitle.textContent = t('overlay.lossTitle');
  ui.overlayMessage.textContent = resolveLossMessage(reason);
  ui.overlayPrimary.setAttribute('aria-label', t('overlay.tryAgain'));
  ui.overlayPrimary.title = t('overlay.tryAgain');
  setPhosphorIcon(ui.overlayPrimary, iconRetryCurvedArrow());
  ui.overlaySecondary?.classList.add('hidden');
  _gameOverlayOutcome = 'loss';
  _focusBeforeGameOverlay = document.activeElement;
  setModalBackdropInert('game');
  stopWinStarFx();
  ui.winStarFx?.classList.add('hidden');
  ui.overlay.classList.remove('hidden');
  requestAnimationFrame(() => focusElementIfStillMounted(ui.overlayPrimary));
}

/**
 * @returns {boolean} true if a session was restored (caller should skip `startLevel`).
 */
function tryRestoreSession() {
  if (typeof window === 'undefined') return false;
  const raw = loadLocal(STORAGE_KEYS.SESSION, null);
  if (!raw || raw.v !== SESSION_SCHEMA_VERSION) return false;

  const idx = Math.max(0, Math.min(Number(raw.levelIndex) || 0, LEVELS.length - 1));
  /** Must match `loadProgression()` so a stale session cannot override the progression slot. */
  if (idx !== state.currentLevelIndex) {
    clearSessionStorage();
    return false;
  }

  const level = LEVELS[idx];
  if (!level || !Array.isArray(raw.boardTiles) || raw.boardTiles.length !== level.layout.length) {
    clearSessionStorage();
    return false;
  }

  resetMoveEngine();
  state.currentLevelIndex = idx;
  state.boardTiles = raw.boardTiles.map(t => ({
    ...t,
    type: normalizeLevelTileType(t.type),
    removed: !!t.removed
  }));
  state.trayTiles = Array.isArray(raw.trayTiles)
    ? raw.trayTiles.map((t, i) => ({
        id: typeof t.id === 'string' ? t.id : `restored_tray_${i}`,
        type: normalizeLevelTileType(t.type)
      }))
    : [];
  state.score = Number(raw.score) || 0;
  state.powerups = { ...defaultPowerups, ...(raw.powerups && typeof raw.powerups === 'object' ? raw.powerups : {}) };
  state.isLevelOver = !!raw.isLevelOver;
  state.isRemoveTypeMode = false;
  if (raw.lastSnapshot && raw.lastSnapshot.boardTiles && raw.lastSnapshot.trayTiles) {
    state.lastSnapshot = {
      boardTiles: raw.lastSnapshot.boardTiles.map(t => ({
        ...t,
        type: normalizeLevelTileType(t.type),
        removed: !!t.removed
      })),
      trayTiles: raw.lastSnapshot.trayTiles.map(t => ({
        id: String(t.id),
        type: normalizeLevelTileType(t.type)
      })),
      score: Number(raw.lastSnapshot.score) || 0
    };
  } else {
    state.lastSnapshot = null;
  }

  _boardKeyboardFocusTileId = null;
  _boardKeyboardPickAnchor = null;

  buildCoverStructures(state.boardTiles);

  if (ui.board) {
    ui.board.classList.remove('board-win');
    ui.board.classList.remove('board-loss');
  }

  saveProgression();
  renderHud();
  renderBoard();
  renderTray();

  if (state.isLevelOver) {
    const outcome = raw.overlayOutcome === 'win' || raw.overlayOutcome === 'loss' ? raw.overlayOutcome : null;
    if (outcome === 'win') {
      showWinOverlayUi();
    } else if (outcome === 'loss') {
      showLossOverlayUi(raw.lossMessage || '');
    } else {
      state.isLevelOver = false;
      clearSessionStorage();
      return false;
    }
  } else {
    tryFocusBoardOnLevelStart();
  }

  return true;
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
  /** Sorted unique level indices the player has cleared at least once (persisted in progression). */
  completedLevelIndices: [],
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

/** When true, wrap hot paths in performance.measure for Playwright perf specs (zero overhead when false). */
let _perfMarksEnabled = false;
let _perfMarkSeq = 0;

/** @template T
 * @param {string} name
 * @param {() => T} fn
 * @returns {T} */
function perfMeasureSync(name, fn) {
  if (!_perfMarksEnabled) return fn();
  const id = _perfMarkSeq++;
  const start = `${name}-${id}-s`;
  const end = `${name}-${id}-e`;
  performance.mark(start);
  try {
    return fn();
  } finally {
    performance.mark(end);
    try {
      performance.measure(name, start, end);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Per tile id: how many non-removed tiles visually cover this tile (tile-layering `tileCovers`).
 * Incrementally updated when a covering tile is removed.
 */
let _coverCountById = new Map();
/** Per tile id: ids of tiles below that this tile covers (for updates when this tile is removed). */
let _coversListById = new Map();

function buildCoverStructures(boardTiles) {
  _coverCountById = new Map();
  _coversListById = new Map();
  const active = boardTiles.filter(t => !t.removed);
  for (const t of active) {
    _coverCountById.set(t.id, 0);
    _coversListById.set(t.id, []);
  }
  for (const o of active) {
    const list = _coversListById.get(o.id);
    for (const t of active) {
      if (o.id === t.id) continue;
      if (o.z <= t.z) continue;
      if (TL.tileCovers(o, t)) {
        _coverCountById.set(t.id, (_coverCountById.get(t.id) || 0) + 1);
        list.push(t.id);
      }
    }
  }
}

/**
 * Decrements cover counts for tiles that were covered by `removedId`.
 * @returns {string[]} Tile ids that became uncovered (cover count went from 1 → 0).
 */
function applyCoverDecrementsForRemoved(removedId) {
  const coveredIds = _coversListById.get(removedId);
  if (!coveredIds) return [];
  const newlyExposed = [];
  for (const tid of coveredIds) {
    const below = state.boardTiles.find(x => x.id === tid);
    if (!below || below.removed) continue;
    const prev = _coverCountById.get(tid) || 0;
    const next = Math.max(0, prev - 1);
    _coverCountById.set(tid, next);
    if (prev > 0 && next === 0) newlyExposed.push(tid);
  }
  return newlyExposed;
}

/** Last committed tappable set after a full/incremental board render (for DOM diff). */
let _lastRenderedTappableIds = null;

/** Last applied layout so picks can skip repositioning when the viewport grid is unchanged. */
let _lastBoardLayoutSig = null;

function boardLayoutSignaturesEqual(a, b) {
  return (
    a &&
    b &&
    a.cellSize === b.cellSize &&
    a.ox === b.ox &&
    a.oy === b.oy &&
    a.widthPx === b.widthPx &&
    a.heightPx === b.heightPx
  );
}

/**
 * Tappable/blocked, optional settle animation, and a11y on a board tile element.
 * Preserves `tile-keyboard-focus` (managed separately).
 */
function syncTileBoardInteractionVisual(el, tile, { tappable, withSettleIn }) {
  el.classList.add('tile');
  el.classList.toggle('tappable', tappable);
  el.classList.toggle('blocked', !tappable);
  el.classList.toggle('tile-settle-in', !!withSettleIn);
  el.tabIndex = -1;
  if (tappable) {
    if (el.getAttribute('role') !== 'button') el.setAttribute('role', 'button');
    const label = t('board.exposedTileAria', { type: localizedTileTypeLabel(tile.type) });
    if (el.getAttribute('aria-label') !== label) el.setAttribute('aria-label', label);
  } else {
    el.removeAttribute('role');
    el.removeAttribute('aria-label');
  }
}

function setTileBoardPosition(el, tile, cellSize, layoutOffset) {
  const { left: layeredLeft, top: layeredTop } = boardTileCenterPx(tile, cellSize);
  const lx = layeredLeft + layoutOffset.x;
  const ly = layeredTop + layoutOffset.y;
  const zi = String(10 + tile.z);
  const lxStr = `${lx}px`;
  const lyStr = `${ly}px`;
  if (el.style.left !== lxStr) el.style.left = lxStr;
  if (el.style.top !== lyStr) el.style.top = lyStr;
  const tf = 'translate(-50%,-50%)';
  if (el.style.transform !== tf) el.style.transform = tf;
  if (el.style.zIndex !== zi) el.style.zIndex = zi;
}

/** Cover count from committed state; optional `ignoreTileId` treats that tile as absent (e.g. mid-fly). */
function effectiveCoverCount(tile, ignoreTileId = null) {
  let c = _coverCountById.get(tile.id) ?? 0;
  if (ignoreTileId) {
    const ign = state.boardTiles.find(x => x.id === ignoreTileId && !x.removed);
    if (ign && TL.tileCovers(ign, tile)) {
      c -= 1;
    }
  }
  return c;
}

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

/** Level picker: null = all levels; easy/medium/hard = tertile band (see getDifficultyBands). */
let levelSelectDifficultyFilter = null;
/** When debug + shape mode: filter by template name parsed from level title (e.g. DIAMOND). */
let levelSelectShapeFilter = null;
/** debug=1 only: 'difficulty' | 'shape'. */
let levelSelectGroupBy = 'difficulty';

/** True while applying scroll from URL (avoid syncing scroll back mid-restore). */
let _levelSelectRestoringScroll = false;
let _levelSelectScrollSyncTimer = 0;

/**
 * Level picker UI in the URL (refresh-safe). Params are stripped when the dialog closes.
 * - `ls=1` — dialog open
 * - `lsGroup` — `difficulty` | `shape` (only when `debug=1`)
 * - `lsDiff` — `easy` | `medium` | `hard` (omit or empty = all)
 * - `lsShape` — shape key when grouping by shape
 * - `lss` — scroll offset (px) of `.level-select-scroll`
 */
function syncLevelSelectUrl() {
  if (!ui.levelSelectOverlay || ui.levelSelectOverlay.classList.contains('hidden')) return;
  try {
    const url = new URL(window.location.href);
    const sp = url.searchParams;
    sp.set('ls', '1');
    const debug = isLevelSelectDebugEnabled();
    if (debug) {
      sp.set('lsGroup', levelSelectGroupBy === 'shape' ? 'shape' : 'difficulty');
      if (levelSelectGroupBy === 'shape') {
        if (levelSelectShapeFilter) sp.set('lsShape', levelSelectShapeFilter);
        else sp.delete('lsShape');
        sp.delete('lsDiff');
      } else {
        sp.delete('lsShape');
        if (levelSelectDifficultyFilter) sp.set('lsDiff', levelSelectDifficultyFilter);
        else sp.delete('lsDiff');
      }
    } else {
      sp.delete('lsGroup');
      sp.delete('lsShape');
      if (levelSelectDifficultyFilter) sp.set('lsDiff', levelSelectDifficultyFilter);
      else sp.delete('lsDiff');
    }
    if (ui.levelSelectScroll) {
      const st = Math.round(ui.levelSelectScroll.scrollTop);
      if (st > 0) sp.set('lss', String(st));
      else sp.delete('lss');
    }
    window.history.replaceState(window.history.state, '', url);
  } catch {
    /* ignore invalid URL in exotic environments */
  }
}

function stripLevelSelectFromUrl() {
  try {
    const url = new URL(window.location.href);
    const sp = url.searchParams;
    sp.delete('ls');
    sp.delete('lsGroup');
    sp.delete('lsDiff');
    sp.delete('lsShape');
    sp.delete('lss');
    const qs = sp.toString();
    url.search = qs ? `?${qs}` : '';
    window.history.replaceState(window.history.state, '', url);
  } catch {
    /* ignore */
  }
}

/** Reads `ls*` params from the current location into picker state (no-op if `ls` is not set). */
function applyLevelSelectParamsFromUrl() {
  let sp;
  try {
    sp = new URLSearchParams(window.location.search);
  } catch {
    return;
  }
  if (sp.get('ls') !== '1') return;
  const debug = isLevelSelectDebugEnabled();
  if (debug && sp.get('lsGroup') === 'shape') {
    levelSelectGroupBy = 'shape';
    levelSelectDifficultyFilter = null;
    const sf = sp.get('lsShape');
    levelSelectShapeFilter = sf && sf.length ? sf : null;
  } else {
    levelSelectGroupBy = 'difficulty';
    levelSelectShapeFilter = null;
    const d = sp.get('lsDiff');
    levelSelectDifficultyFilter =
      d === 'easy' || d === 'medium' || d === 'hard' ? d : null;
  }
}

function parseLevelSelectInitialScrollFromUrl() {
  try {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('ls') !== '1') return 0;
    const raw = sp.get('lss');
    if (raw == null || raw === '') return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function installLevelSelectScrollUrlSync() {
  if (!ui.levelSelectScroll) return;
  ui.levelSelectScroll.addEventListener('scroll', () => {
    if (_levelSelectRestoringScroll) return;
    if (ui.levelSelectOverlay?.classList.contains('hidden')) return;
    clearTimeout(_levelSelectScrollSyncTimer);
    _levelSelectScrollSyncTimer = setTimeout(() => syncLevelSelectUrl(), 160);
  });
}

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
  ui.winStarFx = document.getElementById('win-star-fx');

  ui.levelSelectButton = document.getElementById('level-select-button');
  ui.levelSelectOverlay = document.getElementById('level-select-overlay');
  ui.levelSelectClose = document.getElementById('level-select-close');
  ui.levelSelectCarousel = document.getElementById('level-select-carousel');
  ui.levelSelectScroll = document.querySelector('.level-select-scroll');
  ui.levelSelectDebug = document.getElementById('level-select-debug');
  ui.levelSelectDifficultyRow = document.getElementById('level-select-difficulty-row');
  ui.levelSelectShapeRow = document.getElementById('level-select-shape-row');
  ui.levelSelectGroupBy = document.getElementById('level-select-group-by');
  ui.levelSelectShape = document.getElementById('level-select-shape');
  ui.levelSelectAll = document.getElementById('level-select-all');
  ui.levelSelectEasy = document.getElementById('level-select-easy');
  ui.levelSelectMedium = document.getElementById('level-select-medium');
  ui.levelSelectHard = document.getElementById('level-select-hard');
  ui.levelSelectHint = document.getElementById('level-select-hint');

  const app = document.getElementById('app');
  ui.appHeader = app?.querySelector(':scope > header') ?? null;
  ui.appMain = app?.querySelector(':scope > main') ?? null;

  ui.settingsOverlay = document.getElementById('settings-overlay');
  ui.settingsOpenButton = document.getElementById('settings-open-button');
  ui.settingsClose = document.getElementById('settings-close');
  ui.settingsResetDefaults = document.getElementById('settings-reset-defaults');

  ui.audioMasterMuteToggle = document.getElementById('audio-master-mute-toggle');
  ui.musicMuteToggle = document.getElementById('music-mute-toggle');
  ui.musicMuteText = document.getElementById('music-mute-text');
  ui.musicVolume = document.getElementById('music-volume');
  ui.sfxMuteToggle = document.getElementById('sfx-mute-toggle');
  ui.sfxMuteText = document.getElementById('sfx-mute-text');
  ui.sfxVolume = document.getElementById('sfx-volume');
  ui.hapticsToggle = document.getElementById('haptics-toggle');
  ui.hapticsToggleLabel = document.getElementById('haptics-toggle-label');

  ui.fullscreenToggle = document.getElementById('fullscreen-toggle');
  ui.installAppButton = document.getElementById('install-app-button');
  ui.settingsDisplaySection = document.getElementById('settings-display-section');
  ui.settingsHapticsSection = document.getElementById('settings-haptics-section');
}

/** @param {string} iconName Phosphor icon name without `ph-` prefix (e.g. `caret-right`). */
function setPhosphorIcon(buttonEl, iconName) {
  const icon = buttonEl?.querySelector?.(':scope > i.ph');
  if (icon) icon.className = `ph ph-${iconName}`;
}

function isDocumentRtl() {
  return typeof document !== 'undefined' && document.documentElement.getAttribute('dir') === 'rtl';
}

/** Forward / “next” caret follows reading direction (RTL → points left). */
function iconCaretForward() {
  return isDocumentRtl() ? 'caret-left' : 'caret-right';
}

/** Curved retry arrow mirrored for RTL (LTR: counter-clockwise reads as retry/back). */
function iconRetryCurvedArrow() {
  return isDocumentRtl() ? 'arrow-clockwise' : 'arrow-counter-clockwise';
}

/** Undo arrow: up-left in LTR, up-right in RTL. */
function iconUndoArrow() {
  return isDocumentRtl() ? 'arrow-u-up-right' : 'arrow-u-up-left';
}

function syncRtlDirectionalChromeIcons() {
  if (ui.undoButton) setPhosphorIcon(ui.undoButton, iconUndoArrow());
  if (ui.restartButton) {
    setPhosphorIcon(ui.restartButton, isDocumentRtl() ? 'arrow-counter-clockwise' : 'arrow-clockwise');
  }
}

function getFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement ||
    null
  );
}

function isFullscreenSupported() {
  const el = document.documentElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen);
}

function isStandaloneDisplayMode() {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  if (typeof navigator !== 'undefined' && navigator.standalone === true) return true;
  return false;
}

async function enterFullscreen() {
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) await el.msRequestFullscreen();
  } catch {
    /* user gesture or policy */
  }
}

async function exitFullscreen() {
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    else if (document.msExitFullscreen) await document.msExitFullscreen();
  } catch {
    /* ignore */
  }
}

function syncFullscreenButton() {
  const btn = ui.fullscreenToggle;
  if (!btn || btn.classList.contains('hidden')) return;
  const on = !!getFullscreenElement();
  btn.setAttribute('aria-pressed', String(on));
  const label = on ? t('toolbar.exitFullScreen') : t('toolbar.fullScreen');
  btn.setAttribute('aria-label', label);
  btn.title = on ? t('toolbar.leaveFullScreen') : t('toolbar.fullScreenDetail');
  setPhosphorIcon(btn, on ? 'arrows-in' : 'arrows-out');
}

function installDisplayModeUi() {
  const fsBtn = ui.fullscreenToggle;
  const installBtn = ui.installAppButton;

  if (fsBtn) {
    if (!isFullscreenSupported()) {
      fsBtn.classList.add('hidden');
    } else {
      fsBtn.addEventListener('click', async () => {
        if (getFullscreenElement()) await exitFullscreen();
        else await enterFullscreen();
      });
      document.addEventListener('fullscreenchange', syncFullscreenButton);
      document.addEventListener('webkitfullscreenchange', syncFullscreenButton);
      syncFullscreenButton();
    }
  }

  if (installBtn) {
    if (isStandaloneDisplayMode()) {
      installBtn.classList.add('hidden');
    } else {
      let deferred = null;
      window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferred = e;
        installBtn.classList.remove('hidden');
        syncSettingsChromeSections();
      });
      installBtn.addEventListener('click', async () => {
        if (!deferred) return;
        deferred.prompt();
        await deferred.userChoice.catch(() => {});
        deferred = null;
        installBtn.classList.add('hidden');
        syncSettingsChromeSections();
      });
    }
  }
  syncSettingsChromeSections();
}

/** Hide settings sections that have no relevant controls (install PWA, vibrate API). */
function syncSettingsChromeSections() {
  if (ui.settingsDisplaySection) {
    const hide =
      !ui.installAppButton || ui.installAppButton.classList.contains('hidden');
    ui.settingsDisplaySection.classList.toggle('hidden', hide);
  }
}

function syncAudioUi() {
  const s = audioSvc.getState();
  if (ui.audioMasterMuteToggle) {
    const musicOn = !s.musicMuted && s.musicVolume > 0;
    const sfxOn = !s.sfxMuted && s.sfxVolume > 0;
    const allAudible = musicOn && sfxOn;
    ui.audioMasterMuteToggle.setAttribute('aria-pressed', String(allAudible));
    ui.audioMasterMuteToggle.setAttribute(
      'aria-label',
      allAudible ? t('audio.allSoundOn') : t('audio.allSoundOff')
    );
    ui.audioMasterMuteToggle.title = allAudible
      ? t('audio.allSoundMuteTitle')
      : t('audio.allSoundUnmuteTitle');
    setPhosphorIcon(
      ui.audioMasterMuteToggle,
      allAudible ? 'speaker-simple-high' : 'speaker-simple-slash'
    );
  }
  if (ui.musicMuteToggle && ui.musicVolume) {
    const audible = !s.musicMuted && s.musicVolume > 0;
    ui.musicMuteToggle.setAttribute('aria-pressed', String(audible));
    const label = audible ? t('audio.musicOn') : t('audio.musicOff');
    ui.musicMuteToggle.setAttribute('aria-label', label);
    setPhosphorIcon(ui.musicMuteToggle, audible ? 'speaker-high' : 'speaker-slash');
    ui.musicVolume.value = String(s.musicVolume);
    ui.musicVolume.disabled = s.musicMuted;
    if (ui.musicMuteText) ui.musicMuteText.textContent = label;
  }
  if (ui.sfxMuteToggle && ui.sfxVolume) {
    const sfxAudible = !s.sfxMuted && s.sfxVolume > 0;
    ui.sfxMuteToggle.setAttribute('aria-pressed', String(sfxAudible));
    const sfxLabel = sfxAudible ? t('audio.sfxOn') : t('audio.sfxOff');
    ui.sfxMuteToggle.setAttribute('aria-label', sfxLabel);
    setPhosphorIcon(ui.sfxMuteToggle, sfxAudible ? 'waveform' : 'waveform-slash');
    ui.sfxVolume.value = String(s.sfxVolume);
    ui.sfxVolume.disabled = s.sfxMuted;
    if (ui.sfxMuteText) ui.sfxMuteText.textContent = sfxLabel;
  }

  const vibSupported =
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  if (ui.settingsHapticsSection) {
    ui.settingsHapticsSection.classList.toggle('hidden', !vibSupported);
  }
  if (ui.hapticsToggle && vibSupported) {
    ui.hapticsToggle.disabled = false;
    ui.hapticsToggle.removeAttribute('aria-disabled');
    const hap = !!s.hapticsEnabled;
    ui.hapticsToggle.setAttribute('aria-pressed', String(hap));
    const hapLabel = hap ? t('audio.hapticsOn') : t('audio.hapticsOff');
    ui.hapticsToggle.setAttribute('aria-label', hapLabel);
    ui.hapticsToggle.setAttribute('title', hap ? t('audio.hapticsTurnOff') : t('audio.hapticsTurnOn'));
    setPhosphorIcon(ui.hapticsToggle, hap ? 'vibrate' : 'prohibit');
    if (ui.hapticsToggleLabel) ui.hapticsToggleLabel.textContent = hapLabel;
  }

  syncSettingsChromeSections();
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
      scheduleSaveSession();
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
      scheduleSaveSession();
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

  if (ui.settingsOpenButton) {
    ui.settingsOpenButton.addEventListener('click', () => showSettings());
  }
  if (ui.settingsClose) {
    ui.settingsClose.addEventListener('click', () => hideSettings());
  }
  if (ui.settingsOverlay) {
    ui.settingsOverlay.addEventListener('click', (e) => {
      if (e.target === ui.settingsOverlay) hideSettings();
    });
  }
  if (ui.settingsResetDefaults) {
    ui.settingsResetDefaults.addEventListener('click', () => {
      audioSvc.resetToDefaults();
      saveLocal(STORAGE_KEYS.UI, { ...DEFAULT_UI_PREFS });
      syncAudioUi();
    });
  }

  if (ui.levelSelectAll) {
    ui.levelSelectAll.addEventListener('click', () => setLevelSelectDifficultyFilter(null));
  }
  if (ui.levelSelectEasy) {
    ui.levelSelectEasy.addEventListener('click', () => setLevelSelectDifficultyFilter('easy'));
  }
  if (ui.levelSelectMedium) {
    ui.levelSelectMedium.addEventListener('click', () => setLevelSelectDifficultyFilter('medium'));
  }
  if (ui.levelSelectHard) {
    ui.levelSelectHard.addEventListener('click', () => setLevelSelectDifficultyFilter('hard'));
  }
  if (ui.levelSelectGroupBy) {
    ui.levelSelectGroupBy.addEventListener('change', () => {
      levelSelectGroupBy = ui.levelSelectGroupBy.value === 'shape' ? 'shape' : 'difficulty';
      if (levelSelectGroupBy === 'difficulty') levelSelectShapeFilter = null;
      else levelSelectDifficultyFilter = null;
      syncLevelSelectToolbar();
      buildLevelSelectGrid();
      syncLevelSelectUrl();
    });
  }
  if (ui.levelSelectShape) {
    ui.levelSelectShape.addEventListener('change', () => {
      const v = ui.levelSelectShape.value;
      levelSelectShapeFilter = v === '' ? null : v;
      buildLevelSelectGrid();
      syncLevelSelectUrl();
    });
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

  const appEl = document.getElementById('app');
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushSessionSave();
    }
  });

  if (appEl) {
    function unlockAudioOnce() {
      audioSvc.unlock();
    }
    function unlockOnGameKey(e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow')) {
        unlockAudioOnce();
        appEl.removeEventListener('keydown', unlockOnGameKey);
      }
    }
    appEl.addEventListener(
      'pointerdown',
      () => {
        unlockAudioOnce();
        appEl.removeEventListener('keydown', unlockOnGameKey);
      },
      { capture: true, once: true }
    );
    appEl.addEventListener('keydown', unlockOnGameKey);
  }

  if (ui.audioMasterMuteToggle) {
    ui.audioMasterMuteToggle.addEventListener('click', () => {
      const s = audioSvc.getState();
      const musicOn = !s.musicMuted && s.musicVolume > 0;
      const sfxOn = !s.sfxMuted && s.sfxVolume > 0;
      const allAudible = musicOn && sfxOn;
      audioSvc.setMasterMuted(allAudible);
      syncAudioUi();
    });
  }
  if (ui.musicMuteToggle) {
    ui.musicMuteToggle.addEventListener('click', () => {
      const s = audioSvc.getState();
      audioSvc.setMusicMuted(!s.musicMuted);
      syncAudioUi();
    });
  }
  if (ui.musicVolume) {
    ui.musicVolume.addEventListener('input', () => {
      const v = parseFloat(ui.musicVolume.value);
      audioSvc.setMusicVolume(v);
      syncAudioUi();
    });
  }
  if (ui.sfxMuteToggle) {
    ui.sfxMuteToggle.addEventListener('click', () => {
      const s = audioSvc.getState();
      audioSvc.setSfxMuted(!s.sfxMuted);
      syncAudioUi();
    });
  }
  if (ui.sfxVolume) {
    ui.sfxVolume.addEventListener('input', () => {
      const v = parseFloat(ui.sfxVolume.value);
      audioSvc.setSfxVolume(v);
      syncAudioUi();
    });
  }
  if (ui.hapticsToggle) {
    ui.hapticsToggle.addEventListener('click', () => {
      if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
      const next = !audioSvc.getState().hapticsEnabled;
      audioSvc.setHapticsEnabled(next);
      syncAudioUi();
      if (next) audioSvc.triggerHaptic(HAPTIC_KIND.PICK);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (ui.levelSelectOverlay && !ui.levelSelectOverlay.classList.contains('hidden')) {
      e.preventDefault();
      hideLevelSelect();
      return;
    }
    if (ui.settingsOverlay && !ui.settingsOverlay.classList.contains('hidden')) {
      e.preventDefault();
      hideSettings();
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
  buildCoverStructures(state.boardTiles);
  renderBoard();
  renderTray();
  renderHud();
}

function clampLevelIndex(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(Math.floor(x), LEVELS.length - 1));
}

/**
 * @param {unknown} arr
 * @returns {number[]}
 */
function normalizeCompletedLevelIndices(arr) {
  if (!Array.isArray(arr)) return [];
  const set = new Set();
  for (const x of arr) {
    set.add(clampLevelIndex(x));
  }
  return [...set].sort((a, b) => a - b);
}

function isLevelIndexCompleted(levelIndex) {
  return state.completedLevelIndices.includes(clampLevelIndex(levelIndex));
}

function recordLevelCompleted(levelIndex) {
  const i = clampLevelIndex(levelIndex);
  if (state.completedLevelIndices.includes(i)) return;
  state.completedLevelIndices.push(i);
  state.completedLevelIndices.sort((a, b) => a - b);
}

function loadProgression() {
  const progression = loadLocal(STORAGE_KEYS.PROGRESSION, {
    highestLevelIndex: 0,
    lastPlayedLevelIndex: 0
  });
  const highestSaved = clampLevelIndex(progression.highestLevelIndex);
  let lastPlayed;
  if (progression && typeof progression.lastPlayedLevelIndex === 'number') {
    lastPlayed = clampLevelIndex(progression.lastPlayedLevelIndex);
  } else {
    /** Pre–session saves only stored `highestLevelIndex`, used as both unlock and resume slot. */
    lastPlayed = highestSaved;
  }
  state.currentLevelIndex = lastPlayed;
  state.completedLevelIndices = normalizeCompletedLevelIndices(progression?.completedLevelIndices);

  const stats = loadLocal(STORAGE_KEYS.STATS, defaultStats);
  state.stats = { ...defaultStats, ...stats };

  const powerups = loadLocal(STORAGE_KEYS.POWERUPS, defaultPowerups);
  state.powerups = { ...defaultPowerups, ...powerups };
}

function saveProgression() {
  const prev = loadLocal(STORAGE_KEYS.PROGRESSION, { highestLevelIndex: 0, lastPlayedLevelIndex: 0 });
  const prevHigh = Number(prev.highestLevelIndex) || 0;
  const highestLevelIndex = Math.max(prevHigh, state.currentLevelIndex);
  const lastPlayedLevelIndex = state.currentLevelIndex;
  saveLocal(STORAGE_KEYS.PROGRESSION, {
    highestLevelIndex,
    lastPlayedLevelIndex,
    completedLevelIndices: state.completedLevelIndices
  });
}

function saveStats() {
  saveLocal(STORAGE_KEYS.STATS, state.stats);
}

function savePowerups() {
  saveLocal(STORAGE_KEYS.POWERUPS, state.powerups);
}

function startLevel(index) {
  clearSessionStorage();
  const clampedIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
  state.currentLevelIndex = clampedIndex;
  resetMoveEngine();
  const level = LEVELS[clampedIndex];
  const tileTypeRemap = buildTileTypeRemapForLayout(level.layout, shuffle01);
  state.boardTiles = level.layout.map((tile, i) => {
    const nt = normalizeLevelTileType(tile.type);
    const type = tileTypeRemap.has(nt) ? tileTypeRemap.get(nt) : nt;
    return {
      id: `t_${clampedIndex}_${i}`,
      type,
      x: tile.x,
      y: tile.y,
      z: tile.z,
      removed: false
    };
  });
  _boardKeyboardFocusTileId = null;
  _boardKeyboardPickAnchor = null;
  state.trayTiles = [];
  state.score = 0;
  state.isLevelOver = false;
  state.isRemoveTypeMode = false;
  state.lastSnapshot = null;

  buildCoverStructures(state.boardTiles);

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
  saveProgression();
}

function isTileCovered(tile, ignoreTileId = null) {
  return effectiveCoverCount(tile, ignoreTileId) > 0;
}

/** If ignoreTileId is set, tappable tiles are computed as if that tile were already removed (for early clickability during fly). */
function getTappableTiles(ignoreTileId = null) {
  return perfMeasureSync('getTappableTiles', () =>
    state.boardTiles.filter(
      tile =>
        !tile.removed &&
        tile.id !== ignoreTileId &&
        effectiveCoverCount(tile, ignoreTileId) === 0
    )
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

/** Last tile element that had `tile-keyboard-focus` applied (for incremental class sync). */
let _lastKeyboardFocusVisualTileId = null;

/** After a pick, `{ x, y, z }` of the removed tile — used once in the next `renderBoard` to place focus near/below. */
let _boardKeyboardPickAnchor = null;

/** Remove-type mode: focused tray slot index (left-to-right among occupied slots). */
let _trayRemoveTypeFocusSlotIndex = -1;

function getBoardKeyboardLayoutMetrics() {
  const level = LEVELS[state.currentLevelIndex];
  const { gridWidth, gridHeight } = normalizeGridDims(level);
  const { cellSize, widthPx, heightPx } = measureBoardLayout(gridWidth, gridHeight);
  const layoutFootprint = level.layout.map((t) => ({ x: t.x, y: t.y, z: t.z }));
  const layoutOffset = computeBoardContentOffsetPx(widthPx, heightPx, cellSize, layoutFootprint);
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
  return getTappableTiles(removeId);
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
  const newId = _boardKeyboardFocusTileId;
  const oldId = _lastKeyboardFocusVisualTileId;
  if (oldId && oldId !== newId) {
    ui.board.querySelector(`[data-tile-id="${oldId}"]`)?.classList.remove('tile-keyboard-focus');
  }
  let nextVisualId = null;
  if (newId) {
    const activeEl = ui.board.querySelector(`[data-tile-id="${newId}"]`);
    const showKb = activeEl && activeEl.classList.contains('tappable');
    activeEl?.classList.toggle('tile-keyboard-focus', !!showKb);
    if (showKb) nextVisualId = newId;
  }
  _lastKeyboardFocusVisualTileId = nextVisualId;

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
  if (_lastKeyboardFocusVisualTileId) {
    ui.board.querySelector(`[data-tile-id="${_lastKeyboardFocusVisualTileId}"]`)?.classList.remove(
      'tile-keyboard-focus'
    );
  }
  _lastKeyboardFocusVisualTileId = null;
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
  ui.tray.setAttribute('aria-label', t('tray.groupAria'));
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
  ui.tray.setAttribute('aria-label', t('tray.removeTypeTrayAria'));
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
      t('tray.removeTypeTileAria', { type: localizedTileTypeLabel(tile.type) })
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
  const prev = _lastRenderedTappableIds;

  if (prev == null) {
    for (const child of ui.board.children) {
      const id = child.dataset.tileId;
      if (!id) continue;
      const tappable = tappableIds.has(id);
      const tile = state.boardTiles.find(t => t.id === id);
      if (!tile || tile.removed) continue;
      syncTileBoardInteractionVisual(child, tile, {
        tappable,
        withSettleIn: child.classList.contains('tile-settle-in')
      });
    }
  } else {
    const dirty = new Set();
    for (const id of tappableIds) {
      if (!prev.has(id)) dirty.add(id);
    }
    for (const id of prev) {
      if (!tappableIds.has(id)) dirty.add(id);
    }
    for (const id of dirty) {
      const el = ui.board.querySelector(`[data-tile-id="${id}"]`);
      const tile = state.boardTiles.find(t => t.id === id);
      if (!el || !tile || tile.removed) continue;
      syncTileBoardInteractionVisual(el, tile, {
        tappable: tappableIds.has(id),
        withSettleIn: el.classList.contains('tile-settle-in')
      });
    }
  }
  _lastRenderedTappableIds = tappableIds;

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
  } else {
    scheduleSaveSession();
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
        triggerLoss('loss.trayFull');
      }
      return;
    }
    audioSvc.playSfx(SFX_IDS.TILE_PICK);
    audioSvc.triggerHaptic(HAPTIC_KIND.PICK);
    _boardKeyboardPickAnchor = { x: tile.x, y: tile.y, z: tile.z };
    takeSnapshot();
    state.boardTiles = pick.boardTiles;
    state.trayTiles = pick.trayTiles;
    state.score = pick.score;
    applyCoverDecrementsForRemoved(tileId);
    state.stats.tilesClearedTotal += pick.removedTypes.length * 3;
    saveStats();
    renderBoard(true, { incrementalPickRemovedId: tileId });
    renderTray();
    if (pick.removedTypes.length > 0) {
      audioSvc.playSfx(SFX_IDS.MATCH_CLEAR);
      audioSvc.triggerHaptic(HAPTIC_KIND.MATCH);
    }
    renderHud();
    checkWinCondition();
    if (!state.isLevelOver) scheduleSaveSession();
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
    triggerLoss('loss.trayFull');
    return;
  }

  _boardKeyboardPickAnchor = { x: tile.x, y: tile.y, z: tile.z };
  takeSnapshot();
  audioSvc.playSfx(SFX_IDS.TILE_PICK);
  audioSvc.triggerHaptic(HAPTIC_KIND.PICK);

  const tileEl = ui.board.querySelector(`[data-tile-id="${tileId}"]`);
  const insertIndex = getTrayInsertIndexForType(state.trayTiles, tile.type);

  function applyMove(onMatchingDone) {
    tile.removed = true;
    applyCoverDecrementsForRemoved(tile.id);
    state.trayTiles = insertTrayTileByShape(state.trayTiles, { id: tile.id, type: tile.type });
    renderBoard(true, { incrementalPickRemovedId: tile.id });
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
  audioSvc.playSfx(SFX_IDS.MATCH_CLEAR);
  audioSvc.triggerHaptic(HAPTIC_KIND.MATCH);
  state.trayTiles = trayTiles;
  state.score += scoreDelta;
  state.stats.tilesClearedTotal += removedTypes.length * 3;
  saveStats();
}

/** Returns types that currently have 3+ in tray (for animation). */
function getMatchingTypesInTray() {
  const counts = new Map();
  state.trayTiles.forEach(t => {
    counts.set(t.type, (counts.get(t.type) || 0) + 1);
  });
  return getTripleRemovalTypeOrder(state.trayTiles, counts);
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

/** Gap between adjacent tray slot boxes in screen space (works when grid flows RTL). */
function trayAdjacentSlotGapPx(trayRow) {
  if (!trayRow || trayRow.children.length < 2) return 0;
  const a = trayRow.children[0].getBoundingClientRect();
  const b = trayRow.children[1].getBoundingClientRect();
  const leftRect = a.left <= b.left ? a : b;
  const rightRect = leftRect === a ? b : a;
  return Math.max(0, rightRect.left - (leftRect.left + leftRect.width));
}

function startTrayCompactAnimation(removedSlotIndices) {
  if (!ui.tray || !ui.tray.children.length || removedSlotIndices.length === 0) return;
  const lastRemoved = Math.max(...removedSlotIndices);
  const count = removedSlotIndices.length;

  const firstSlot = ui.tray.children[0];
  const firstRect = firstSlot.getBoundingClientRect();
  const gapPx = trayAdjacentSlotGapPx(ui.tray);
  const shiftPerSlot = firstRect.width + gapPx;
  const shiftMag = count * shiftPerSlot;
  const shiftLeft = isDocumentRtl() ? shiftMag : -shiftMag;
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
  const gapPx = trayAdjacentSlotGapPx(ui.tray);
  const shiftMag = firstRect.width + gapPx;
  const shiftX = isDocumentRtl() ? -shiftMag : shiftMag;
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
  const { gridWidth, gridHeight } = normalizeGridDims(level);
  const { cellSize, widthPx, heightPx } = measureBoardLayout(gridWidth, gridHeight);
  const layoutFootprint = level.layout.map((t) => ({ x: t.x, y: t.y, z: t.z }));
  const off = computeBoardContentOffsetPx(widthPx, heightPx, cellSize, layoutFootprint);
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
  mountTileFace(fly, tile.type);
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

  const dx = targetX - tileCenterX;
  const dy = targetY - tileCenterY;
  const animation = fly.animate(
    [
      { transform: `translate3d(0, 0, 0) scale(${startScale})`, opacity: 1 },
      {
        transform: `translate3d(${dx}px, ${dy}px, 0) scale(1)`,
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
  }).catch((err) => {
    if (err && err.name !== 'AbortError') throw err;
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
  const typeKey = String(type);
  const byType = trayTiles.filter(el => el.dataset.type === typeKey);
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
        { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
        {
          transform: `translate3d(${targetX - startX}px, ${targetY - startY}px, 0) scale(1.2)`,
          opacity: 1
        },
        {
          transform: `translate3d(${targetX - startX}px, ${targetY - startY}px, 0) scale(0)`,
          opacity: 0
        }
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
  recordLevelCompleted(state.currentLevelIndex);
  saveStats();
  saveProgression();
  audioSvc.playSfx(SFX_IDS.LEVEL_WIN);
  audioSvc.triggerHaptic(HAPTIC_KIND.WIN);
  showWinOverlayUi();
  saveSessionImmediate();
}

function triggerLoss(reason) {
  state.isLevelOver = true;
  state.stats.currentWinStreak = 0;
  saveStats();
  audioSvc.playSfx(SFX_IDS.LEVEL_LOSS);
  audioSvc.triggerHaptic(HAPTIC_KIND.LOSS);
  showLossOverlayUi(reason);
  saveSessionImmediate();
}

function hideOverlay() {
  stopWinStarFx();
  ui.winStarFx?.classList.add('hidden');
  ui.overlay.classList.add('hidden');
  setModalBackdropInert('none');
  _gameOverlayOutcome = null;
  focusElementIfStillMounted(_focusBeforeGameOverlay);
  _focusBeforeGameOverlay = null;
}

/**
 * DevTools: replay the level-complete star canvas (not used by gameplay).
 * If `#overlay` is hidden, calls `showWinOverlayUi()` so the canvas can size; dismiss with normal controls or Escape.
 * @param {{ force?: boolean }} [options] Pass `{ force: true }` to run even when `prefers-reduced-motion` is set.
 */
function previewWinStarFx(options = {}) {
  const force = options.force === true;
  if (prefersReducedMotionUi() && !force) {
    console.warn(
      '[Triplet] previewWinStarFx: skipped (prefers-reduced-motion). Pass { force: true } to override.'
    );
    return;
  }
  if (!ui.winStarFx || !ui.overlay) return;

  const replayStarsOnly = () => {
    stopWinStarFx();
    ui.winStarFx.classList.remove('hidden');
    requestAnimationFrame(() => startWinStarFx(ui.winStarFx));
  };

  if (ui.overlay.classList.contains('hidden')) {
    showWinOverlayUi();
    if (skipAnimationsForTests || (prefersReducedMotionUi() && force)) {
      replayStarsOnly();
    }
    return;
  }

  replayStarsOnly();
}

// --- Level selection grid ---
function isLevelSelectDebugEnabled() {
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1';
  } catch {
    return false;
  }
}

/**
 * Template / board shape from generated level names (`DIAMOND 12` → `DIAMOND`).
 * Tutorial and fallback titles without a trailing number → `Other`.
 */
function getLevelShapeKey(level) {
  const m = String(level.name || '').match(/^(.+?)\s+(\d+)\s*$/);
  if (m) return m[1].trim();
  return 'Other';
}

function collectLevelShapeKeys() {
  const set = new Set();
  for (const lvl of LEVELS) set.add(getLevelShapeKey(lvl));
  return [...set].sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });
}

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

function getLevelIndicesForPicker() {
  let indices = LEVELS.map((_, i) => i);
  if (isLevelSelectDebugEnabled() && levelSelectGroupBy === 'shape') {
    if (levelSelectShapeFilter) {
      indices = indices.filter((i) => getLevelShapeKey(LEVELS[i]) === levelSelectShapeFilter);
    }
  } else if (levelSelectDifficultyFilter) {
    const bands = getDifficultyBands();
    const band = bands[levelSelectDifficultyFilter];
    if (band) {
      const [lo, hi] = band;
      indices = indices.filter((i) => i >= lo && i < hi);
    }
  }
  return indices;
}

function populateLevelSelectShapeOptions() {
  if (!ui.levelSelectShape) return;
  const keys = collectLevelShapeKeys();
  const cur = levelSelectShapeFilter ?? '';
  ui.levelSelectShape.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value = '';
  allOpt.textContent = t('levelSelect.allShapes');
  ui.levelSelectShape.appendChild(allOpt);
  for (const k of keys) {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = k;
    if (k === cur) opt.selected = true;
    ui.levelSelectShape.appendChild(opt);
  }
  if (cur && !keys.includes(cur)) {
    ui.levelSelectShape.value = '';
    levelSelectShapeFilter = null;
  }
  ui.levelSelectShape.value = levelSelectShapeFilter === null ? '' : levelSelectShapeFilter;
}

function syncLevelSelectToolbar() {
  const debug = isLevelSelectDebugEnabled();
  if (ui.levelSelectDebug) {
    ui.levelSelectDebug.classList.toggle('hidden', !debug);
    ui.levelSelectDebug.setAttribute('aria-hidden', debug ? 'false' : 'true');
  }
  if (ui.levelSelectGroupBy) {
    ui.levelSelectGroupBy.value = levelSelectGroupBy === 'shape' ? 'shape' : 'difficulty';
  }
  const shapeMode = debug && levelSelectGroupBy === 'shape';
  if (ui.levelSelectDifficultyRow) {
    ui.levelSelectDifficultyRow.classList.toggle('hidden', shapeMode);
  }
  if (ui.levelSelectShapeRow) {
    ui.levelSelectShapeRow.classList.toggle('hidden', !shapeMode);
  }

  const bandButtons = [
    ['all', ui.levelSelectAll, null],
    ['easy', ui.levelSelectEasy, 'easy'],
    ['medium', ui.levelSelectMedium, 'medium'],
    ['hard', ui.levelSelectHard, 'hard']
  ];
  for (const [, el, filt] of bandButtons) {
    if (!el) continue;
    const on = filt === null ? levelSelectDifficultyFilter === null : levelSelectDifficultyFilter === filt;
    el.classList.toggle('is-active', on);
  }
}

function setLevelSelectDifficultyFilter(difficulty) {
  levelSelectDifficultyFilter = difficulty;
  syncLevelSelectToolbar();
  buildLevelSelectGrid();
  syncLevelSelectUrl();
}

/**
 * Top-down footprint of occupied grid cells (one cell per x,y), no tile types — for level picker previews.
 */
function renderMiniLevel(wrapEl, level, levelIndex) {
  if (!wrapEl || !level) return;
  const { gridWidth, gridHeight } = normalizeGridDims(level);
  const padding = 2;
  const tw = gridWidth + padding;
  const th = gridHeight + padding;
  const maxMini = 80;
  const long = Math.max(tw, th);
  const scale = maxMini / long;
  const miniW = tw * scale;
  const miniH = th * scale;
  const cellSize = scale;

  const seen = new Set();
  const footprint = [];
  for (const t of level.layout || []) {
    const k = `${t.x},${t.y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    footprint.push({ x: t.x, y: t.y });
  }

  wrapEl.innerHTML = '';
  wrapEl.className = 'level-select-mini-wrap';
  wrapEl.dataset.levelIndex = String(levelIndex);

  const board = document.createElement('div');
  board.className = 'level-select-mini-board';
  board.style.width = `${miniW}px`;
  board.style.height = `${miniH}px`;

  const miniCellPx = Math.max(4, cellSize * 0.72);
  const miniHalf = miniCellPx / 2;
  const tileModels = footprint.map((t) => ({ x: t.x, y: t.y, z: 0 }));
  const off = computeBoardContentOffsetPx(miniW, miniH, cellSize, tileModels, miniHalf);

  footprint.forEach((tile) => {
    const el = document.createElement('div');
    el.className = 'level-select-mini-silhouette-cell';
    const { left: layeredLeft, top: layeredTop } = boardTileCenterPx(
      { x: tile.x, y: tile.y, z: 0 },
      cellSize
    );
    el.style.width = `${miniCellPx}px`;
    el.style.height = `${miniCellPx}px`;
    el.style.left = `${layeredLeft + off.x}px`;
    el.style.top = `${layeredTop + off.y}px`;
    board.appendChild(el);
  });
  wrapEl.appendChild(board);
}

function buildLevelSelectGrid() {
  if (!ui.levelSelectCarousel) return;
  ui.levelSelectCarousel.innerHTML = '';
  const indices = getLevelIndicesForPicker();

  for (const i of indices) {
    const level = LEVELS[i];
    const completed = isLevelIndexCompleted(i);
    const card = document.createElement('div');
    card.className = 'level-select-card';
    card.dataset.levelIndex = String(i);
    if (i === state.currentLevelIndex) card.classList.add('level-select-card-current');
    if (completed) card.classList.add('level-select-card-completed');

    const mini = document.createElement('div');
    mini.className = 'level-select-mini-wrap';
    renderMiniLevel(mini, level, i);
    if (completed) {
      const check = document.createElement('span');
      check.className = 'level-select-card-check';
      check.setAttribute('aria-hidden', 'true');
      check.innerHTML = '<i class="ph ph-check" aria-hidden="true"></i>';
      mini.appendChild(check);
    }
    card.appendChild(mini);

    const label = document.createElement('span');
    label.className = 'level-select-card-label';
    const levelTitle = translateLevelDisplayName(level);
    label.textContent = `${level.id}: ${levelTitle}`;
    card.appendChild(label);

    const meta = document.createElement('span');
    meta.className = 'level-select-card-difficulty';
    const shape = getLevelShapeKey(level);
    const shapeDisp = displayShapeName(shape);
    const diffBand = getDifficultyForIndex(i);
    meta.textContent =
      isLevelSelectDebugEnabled() && levelSelectGroupBy === 'shape'
        ? shapeDisp
        : difficultyLabel(diffBand);
    card.appendChild(meta);

    const pickLevel = () => {
      startLevel(i);
      hideLevelSelect();
    };
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    const completedNote = completed ? `, ${t('levelSelect.completedLabel')}` : '';
    card.setAttribute(
      'aria-label',
      (isLevelSelectDebugEnabled() && levelSelectGroupBy === 'shape'
        ? t('levelSelect.cardAriaShape', {
            id: level.id,
            name: translateLevelDisplayName(level),
            shape: shapeDisp
          })
        : t('levelSelect.cardAriaDiff', {
            id: level.id,
            name: translateLevelDisplayName(level),
            difficulty: difficultyLabel(diffBand)
          })) + completedNote
    );
    card.addEventListener('click', pickLevel);
    card.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      pickLevel();
    });
    ui.levelSelectCarousel.appendChild(card);
  }

  if (ui.levelSelectHint) {
    ui.levelSelectHint.textContent =
      indices.length === 0 ? t('levelSelect.hintEmpty') : t('levelSelect.hint');
  }
}

/**
 * @param {{ restoreFromUrl?: boolean, initialScroll?: number }} [opts]
 */
function showLevelSelect(opts = {}) {
  const restoreFromUrl = opts.restoreFromUrl === true;
  const initialScroll =
    typeof opts.initialScroll === 'number' && Number.isFinite(opts.initialScroll) ? opts.initialScroll : 0;

  if (!ui.levelSelectOverlay) return;
  _focusBeforeLevelSelect = document.activeElement;
  setModalBackdropInert('level-select');
  ui.levelSelectOverlay.classList.remove('hidden');
  if (restoreFromUrl) {
    applyLevelSelectParamsFromUrl();
  } else if (!isLevelSelectDebugEnabled()) {
    levelSelectGroupBy = 'difficulty';
    levelSelectShapeFilter = null;
  }
  populateLevelSelectShapeOptions();
  syncLevelSelectToolbar();
  requestAnimationFrame(() => {
    if (!restoreFromUrl && ui.levelSelectScroll) ui.levelSelectScroll.scrollTop = 0;
    buildLevelSelectGrid();
    const useStoredScroll = restoreFromUrl && initialScroll > 0;
    if (useStoredScroll && ui.levelSelectScroll) {
      _levelSelectRestoringScroll = true;
      const el = ui.levelSelectScroll;
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollTop = Math.min(initialScroll, maxScroll);
      requestAnimationFrame(() => {
        _levelSelectRestoringScroll = false;
        syncLevelSelectUrl();
      });
    } else {
      const cur = ui.levelSelectCarousel?.querySelector('.level-select-card-current');
      cur?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      syncLevelSelectUrl();
    }
    requestAnimationFrame(() => focusElementIfStillMounted(ui.levelSelectClose));
  });
}

function hideLevelSelect() {
  if (ui.levelSelectOverlay) ui.levelSelectOverlay.classList.add('hidden');
  stripLevelSelectFromUrl();
  setModalBackdropInert('none');
  focusElementIfStillMounted(_focusBeforeLevelSelect);
  _focusBeforeLevelSelect = null;
}

function showSettings() {
  if (!ui.settingsOverlay) return;
  syncSettingsChromeSections();
  _focusBeforeSettings = document.activeElement;
  setModalBackdropInert('settings');
  ui.settingsOverlay.classList.remove('hidden');
  requestAnimationFrame(() => focusElementIfStillMounted(ui.settingsClose));
}

function hideSettings() {
  if (ui.settingsOverlay) ui.settingsOverlay.classList.add('hidden');
  setModalBackdropInert('none');
  focusElementIfStillMounted(_focusBeforeSettings);
  _focusBeforeSettings = null;
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
  renderBoard();
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
  const removedIds = [];
  state.boardTiles.forEach(tile => {
    if (!tile.removed && tile.type === type) {
      tile.removed = true;
      removedIds.push(tile.id);
      state.stats.tilesClearedTotal += 1;
    }
  });
  for (const id of removedIds) {
    applyCoverDecrementsForRemoved(id);
  }
  state.powerups.removeType -= 1;
  savePowerups();
  saveStats();
  renderBoard();
  renderTray();
  renderHud();
  checkWinCondition();
  if (!state.isLevelOver) scheduleSaveSession();
}

function renderHud() {
  const level = LEVELS[state.currentLevelIndex];
  ui.levelLabel.textContent = t('level.line', {
    id: level.id,
    name: translateLevelDisplayName(level)
  });
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

/**
 * @param {boolean} withSettleAnimation
 * @param {{ incrementalPickRemovedId?: string }} [opts]
 *        Pass `incrementalPickRemovedId` after a single-tile pick when layout is unchanged to skip full-board DOM work.
 */
function renderBoard(withSettleAnimation = false, opts = {}) {
  const incrementalPickRemovedId =
    opts && typeof opts.incrementalPickRemovedId === 'string' ? opts.incrementalPickRemovedId : null;

  perfMeasureSync('renderBoard', () => {
    if (withSettleAnimation) {
      ui.board.classList.add('board-settle');
      const removeSettle = () => {
        ui.board.classList.remove('board-settle');
        ui.board.removeEventListener('transitionend', removeSettle);
      };
      ui.board.addEventListener('transitionend', removeSettle);
    }

    const level = LEVELS[state.currentLevelIndex];
    const { gridWidth, gridHeight } = normalizeGridDims(level);
    const { cellSize, widthPx, heightPx } = measureBoardLayout(gridWidth, gridHeight);
    const layoutFootprint = level.layout.map((t) => ({ x: t.x, y: t.y, z: t.z }));
    const layoutOffset = computeBoardContentOffsetPx(widthPx, heightPx, cellSize, layoutFootprint);

    const sig = { cellSize, ox: layoutOffset.x, oy: layoutOffset.y, widthPx, heightPx };
    const layoutUnchanged = boardLayoutSignaturesEqual(_lastBoardLayoutSig, sig);

    const tappableIds = new Set(getTappableTiles().map(t => t.id));
    const boardCanFocus =
      !state.isLevelOver && tappableIds.size > 0 && !state.isRemoveTypeMode;
    ui.board.tabIndex = boardCanFocus ? 0 : -1;

    const tilesToRender = state.boardTiles
      .filter(tile => !tile.removed)
      .slice()
      .sort((a, b) => a.z - b.z);

    const prevTap = _lastRenderedTappableIds;

    if (incrementalPickRemovedId && prevTap && layoutUnchanged && ui.board) {
      const removedEl = ui.board.querySelector(`[data-tile-id="${incrementalPickRemovedId}"]`);
      if (removedEl) {
        removedEl.remove();

        const dirty = new Set();
        for (const id of tappableIds) {
          if (!prevTap.has(id)) dirty.add(id);
        }
        for (const id of prevTap) {
          if (!tappableIds.has(id)) dirty.add(id);
        }
        dirty.delete(incrementalPickRemovedId);

        let ok = true;
        for (const id of dirty) {
          const el = ui.board.querySelector(`[data-tile-id="${id}"]`);
          const tile = state.boardTiles.find(t => t.id === id);
          if (!el || !tile || tile.removed) {
            ok = false;
            break;
          }
        }
        if (ok) {
          for (const id of dirty) {
            const el = ui.board.querySelector(`[data-tile-id="${id}"]`);
            const tile = state.boardTiles.find(t => t.id === id);
            syncTileBoardInteractionVisual(el, tile, {
              tappable: tappableIds.has(id),
              withSettleIn: false
            });
          }
          if (withSettleAnimation) {
            for (const tile of tilesToRender) {
              ui.board.querySelector(`[data-tile-id="${tile.id}"]`)?.classList.remove('tile-settle-in');
            }
            for (const id of dirty) {
              ui.board.querySelector(`[data-tile-id="${id}"]`)?.classList.add('tile-settle-in');
            }
          }
          _lastRenderedTappableIds = tappableIds;
          _lastBoardLayoutSig = sig;
          finalizeBoardKeyboardFocusAfterRender(cellSize, layoutOffset);
          return;
        }
      }
    }

    ui.board.style.width = `${widthPx}px`;
    ui.board.style.height = `${heightPx}px`;
    document.documentElement.style.setProperty('--tile-size', `${cellSize}px`);

    const existingById = new Map();
    for (const child of ui.board.children) {
      const id = child.dataset.tileId;
      if (id) existingById.set(id, child);
    }

    const orderedElements = [];
    for (const tile of tilesToRender) {
      let el = existingById.get(tile.id);
      const isNewEl = !el;
      if (!el) {
        el = document.createElement('div');
        el.dataset.tileId = tile.id;
      } else {
        existingById.delete(tile.id);
      }

      el.id = boardTileActiveDescendantId(tile.id);
      const tappable = tappableIds.has(tile.id);
      const tappableChanged = !!(prevTap && prevTap.has(tile.id) !== tappable);
      const wantSettleIn = !!withSettleAnimation && (isNewEl || tappableChanged);
      syncTileBoardInteractionVisual(el, tile, {
        tappable,
        withSettleIn: wantSettleIn
      });
      const typeStr = String(tile.type);
      if (el.dataset.tileType !== typeStr) {
        mountTileFace(el, tile.type);
        el.dataset.tileType = typeStr;
      }
      setTileBoardPosition(el, tile, cellSize, layoutOffset);
      orderedElements.push(el);
    }

    for (const el of existingById.values()) el.remove();
    for (const el of orderedElements) {
      if (el.parentNode !== ui.board) ui.board.appendChild(el);
    }

    _lastRenderedTappableIds = tappableIds;
    _lastBoardLayoutSig = sig;
    finalizeBoardKeyboardFocusAfterRender(cellSize, layoutOffset);
  });
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
          if (existingTileEl.dataset.type !== String(tile.type)) {
            existingTileEl.dataset.type = String(tile.type);
            mountTileFace(existingTileEl, tile.type);
          }
        } else {
          const tileEl = document.createElement('div');
          tileEl.className = 'tray-tile';
          mountTileFace(tileEl, tile.type);
          tileEl.dataset.type = String(tile.type);
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
      ? `<div class="tray-tile" data-type="${String(tile.type)}">${getTileFaceInnerHtml(tile.type)}</div>`
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
    /** Playwright: expected #board size from current level grid (matches measureBoardLayout). */
    getBoardPixelDims() {
      const level = LEVELS[state.currentLevelIndex];
      const { gridWidth, gridHeight } = normalizeGridDims(level);
      return { gridWidth, gridHeight, ...measureBoardLayout(gridWidth, gridHeight) };
    },
    /** Returns a promise that resolves when the current move's animations (fly + any match-3) have finished. */
    waitForActionComplete() {
      return _actionCompletePromise || Promise.resolve();
    },
    setSkipAnimations(skip) {
      skipAnimationsForTests = !!skip;
    },
    /**
     * DevTools: replay win star canvas. Opens the win overlay if it is closed (same as a real win). Dismiss normally.
     * @param {{ force?: boolean }} [options] `force: true` — run even when `prefers-reduced-motion`.
     */
    previewWinStarFx,
    /** Stops the star canvas rAF and clears the layer (same module as gameplay). */
    stopWinStarFx,
    setPerfMarksEnabled(on) {
      _perfMarksEnabled = !!on;
    },
    clearPerfEntriesForTest() {
      if (typeof performance === 'undefined') return;
      performance.clearMarks();
      performance.clearMeasures();
    },
    invalidateLayoutReadCache,
    resetAllProgress() {
      try {
        Object.values(STORAGE_KEYS).forEach(key => {
          window.localStorage.removeItem(key);
        });
      } catch {
        // ignore storage errors in tests
      }
      audioSvc.reloadFromStorage();
      syncAudioUi();
      state.stats = { ...defaultStats };
      state.powerups = { ...defaultPowerups };
      state.completedLevelIndices = [];
      state.currentLevelIndex = 0;
      startLevel(0);
    },
    setTrayTilesForTest(trayTiles) {
      state.trayTiles = trayTiles.map((tile, index) => ({
        id: tile.id || `test_${index}`,
        type: normalizeLevelTileType(tile.type)
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
    },
    getAudioDiagnostics() {
      return typeof audioSvc.getDiagnostics === 'function' ? audioSvc.getDiagnostics() : null;
    },
    /** DevTools: runs the same unlock as first tap on #app (SFX load + music play if not muted). */
    unlockAudioForTest() {
      audioSvc.unlock();
    },
    /** DevTools: `AudioContext.resume()` — use after a real click if `sfxContextState` stays `suspended`. */
    resumeSfxContextForTest() {
      if (typeof audioSvc.resumeSfxIfSuspended === 'function') audioSvc.resumeSfxIfSuspended();
    },
    /** Playwright: trigger SFX by `SFX_IDS` string (e.g. match / win duck tests). */
    playTestSfx(eventId) {
      audioSvc.playSfx(eventId);
    },
    playTestHaptic(kind) {
      audioSvc.triggerHaptic(kind);
    },
    runHapticSelfTestPattern() {
      if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
        return { ok: false, reason: 'no_api' };
      }
      const pattern = [40, 60, 40];
      const vibrateOk = navigator.vibrate(pattern);
      return { ok: vibrateOk, pattern, vibrateOk };
    },
    /** Playwright: switch UI language without depending on #locale-select. */
    setLocaleForTest(code) {
      setLocale(code, { persist: false });
    }
  };
}

let _boardScrollRoTimer = 0;
/** Coalesces invalidate + renderBoard to one frame when window/visualViewport fire in a burst. */
let _viewportLayoutRaf = 0;

function scheduleInvalidateLayoutAndRenderBoard() {
  invalidateLayoutReadCache();
  if (typeof requestAnimationFrame === 'undefined') {
    renderBoard();
    return;
  }
  if (_viewportLayoutRaf) return;
  _viewportLayoutRaf = requestAnimationFrame(() => {
    _viewportLayoutRaf = 0;
    renderBoard();
  });
}

function installViewportLayoutListeners() {
  if (typeof window === 'undefined') return;
  const onViewportChange = () => scheduleInvalidateLayoutAndRenderBoard();
  window.addEventListener('resize', onViewportChange);
  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener('resize', onViewportChange);
  }
}

function installBoardScrollResizeObserver() {
  if (typeof ResizeObserver === 'undefined' || !ui.boardScroll) return;
  const ro = new ResizeObserver(() => {
    clearTimeout(_boardScrollRoTimer);
    _boardScrollRoTimer = setTimeout(() => {
      invalidateLayoutReadCache();
      renderBoard();
    }, 60);
  });
  ro.observe(ui.boardScroll);
}

function refreshShellForLocale() {
  if (typeof document === 'undefined') return;
  document.title = t('app.docTitle');
  applyDomI18n(document.body);
  syncRtlDirectionalChromeIcons();
  syncFullscreenButton();
  syncAudioUi();
  renderHud();
  renderBoard(false);
  renderTray();
  if (ui.levelSelectOverlay && !ui.levelSelectOverlay.classList.contains('hidden')) {
    populateLevelSelectShapeOptions();
    syncLevelSelectToolbar();
    buildLevelSelectGrid();
  }
  if (ui.overlay && !ui.overlay.classList.contains('hidden')) {
    if (_gameOverlayOutcome === 'win') showWinOverlayUi();
    else if (_gameOverlayOutcome === 'loss') showLossOverlayUi(_lastLossReason);
  }
}

function main() {
  initDomRefs();
  onLocaleChange(refreshShellForLocale);
  initI18n({ localeSelect: document.getElementById('locale-select') });
  syncRtlDirectionalChromeIcons();
  syncAudioUi();
  audioSvc.applyStoredStateToElement();
  installDisplayModeUi();
  bindEvents();
  installViewportLayoutListeners();
  installBoardScrollResizeObserver();
  installLevelSelectScrollUrlSync();
  loadProgression();
  if (!tryRestoreSession()) {
    startLevel(state.currentLevelIndex);
  }
  if (new URLSearchParams(window.location.search).get('ls') === '1') {
    const scroll = parseLevelSelectInitialScrollFromUrl();
    showLevelSelect({ restoreFromUrl: true, initialScroll: scroll });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}

