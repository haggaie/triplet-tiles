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

function getTileVisual(typeId) {
  const found = TILE_TYPES.find(t => t.id === typeId);
  return found ? found.emoji : '?';
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
  removeType: 0
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

const ui = {};

function initDomRefs() {
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
}

function bindEvents() {
  ui.restartButton.addEventListener('click', () => {
    startLevel(state.currentLevelIndex);
  });

  ui.overlayPrimary.addEventListener('click', () => {
    if (state.currentLevelIndex < LEVELS.length - 1) {
      startLevel(state.currentLevelIndex + 1);
    } else {
      startLevel(0);
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
    if (state.powerups.shuffle > 0 && state.trayTiles.length > 1 && !state.isLevelOver) {
      shuffleTrayOptimally();
      state.powerups.shuffle -= 1;
      savePowerups();
      renderTray();
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
  const level = LEVELS[clampedIndex];
  state.boardTiles = level.layout.map((tile, i) => ({
    id: `t_${clampedIndex}_${i}`,
    type: tile.type,
    x: tile.x,
    y: tile.y,
    z: tile.z,
    removed: false
  }));
  state.trayTiles = [];
  state.score = 0;
  state.isLevelOver = false;
  state.isRemoveTypeMode = false;
  state.lastSnapshot = null;

  if (ui.board) {
    ui.board.classList.remove('board-win');
    ui.board.classList.remove('board-loss');
  }

  state.stats.sessionsPlayed += 1;
  saveStats();

  renderHud();
  renderBoard();
  renderTray();
}

function isTileCovered(tile) {
  return state.boardTiles.some(
    other => !other.removed && other.z > tile.z && (
      -1 <= other.x - tile.x && other.x - tile.x <= 0 &&
      0 <= other.y - tile.y && other.y - tile.y <= 1
    )
  );
}

function getTappableTiles() {
  return state.boardTiles.filter(tile => !tile.removed && !isTileCovered(tile));
}

/** Returns the tray slot index where a new tile of this type would be inserted (by shape grouping). */
function getTrayInsertIndex(type) {
  let insertIndex = state.trayTiles.length;
  for (let i = state.trayTiles.length - 1; i >= 0; i -= 1) {
    if (state.trayTiles[i].type === type) {
      insertIndex = i + 1;
      break;
    }
  }
  return insertIndex;
}

function insertTrayTileByShape(trayTiles, newTile) {
  const type = newTile.type;
  let insertIndex = trayTiles.length;
  for (let i = trayTiles.length - 1; i >= 0; i -= 1) {
    if (trayTiles[i].type === type) {
      insertIndex = i + 1;
      break;
    }
  }
  trayTiles.splice(insertIndex, 0, newTile);
}

function handleBoardTileClick(tileId) {
  if (state.isLevelOver) return;

  const tile = state.boardTiles.find(t => t.id === tileId);
  if (!tile || tile.removed) return;
  if (isTileCovered(tile)) return;

  if (state.trayTiles.length >= 7) {
    triggerLoss('The tray is full. Try managing your tiles more carefully next time.');
    return;
  }

  takeSnapshot();

  const tileEl = ui.board.querySelector(`[data-tile-id="${tileId}"]`);
  const insertIndex = getTrayInsertIndex(tile.type);

  function applyMove() {
    tile.removed = true;
    insertTrayTileByShape(state.trayTiles, { id: tile.id, type: tile.type });
    renderBoard(!skipAnimationsForTests);
    renderTray();
    handleMatchingInTrayAnimated(() => {
      renderHud();
      checkWinCondition();
      if (_actionCompleteResolve) {
        _actionCompleteResolve();
        _actionCompleteResolve = null;
        _actionCompletePromise = null;
      }
    });
  }

  if (skipAnimationsForTests) {
    applyMove();
    return;
  }

  if (typeof window !== 'undefined' && window.__tripletTestHooks) {
    _actionCompletePromise = new Promise(r => { _actionCompleteResolve = r; });
  }

  startTrayMakeRoomAnimation(insertIndex);

  animateTileToTray(tile, tileEl, insertIndex, () => {
    clearTrayMakeRoomAnimation();
    applyMove();
  });
}

function handleMatchingInTray() {
  const counts = {};
  state.trayTiles.forEach(t => {
    counts[t.type] = (counts[t.type] || 0) + 1;
  });

  const toRemoveTypes = Object.keys(counts).filter(type => counts[type] >= 3);
  if (toRemoveTypes.length === 0) {
    return;
  }

  toRemoveTypes.forEach(type => {
    let removedCount = 0;
    const newTray = [];
    for (let i = 0; i < state.trayTiles.length; i += 1) {
      const t = state.trayTiles[i];
      if (t.type === type && removedCount < 3) {
        removedCount += 1;
      } else {
        newTray.push(t);
      }
    }
    state.trayTiles = newTray;

    const tilesMatched = 3;
    const baseScore = 10;
    state.score += baseScore * tilesMatched;
    state.stats.tilesClearedTotal += tilesMatched;
    saveStats();
  });
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

function animateTileToTray(tile, tileEl, insertIndex, onComplete) {
  const boardRect = ui.board.getBoundingClientRect();
  const level = LEVELS[state.currentLevelIndex];
  const size = level.gridSize;
  const cellSize = boardRect.width / (size + 2);
  const yPixelOffset = cellSize * 0.5;
  const xPixelOffset = cellSize * 0.5;

  const baseLeft = (tile.x + 0.5) * cellSize;
  const baseTop = (tile.y + 0.5) * cellSize;
  const layeredLeft = baseLeft + tile.z * xPixelOffset;
  const layeredTop = baseTop - tile.z * yPixelOffset;

  const tileCenterX = boardRect.left + layeredLeft;
  const tileCenterY = boardRect.top + layeredTop;

  const slotEl = ui.tray.children[insertIndex];
  const slotRect = slotEl ? slotEl.getBoundingClientRect() : null;
  const targetX = slotRect ? slotRect.left + slotRect.width / 2 : boardRect.left + boardRect.width / 2;
  const targetY = slotRect ? slotRect.top + slotRect.height / 2 : boardRect.bottom + 40;

  const tileRect = tileEl ? tileEl.getBoundingClientRect() : null;
  const flySize = tileRect ? tileRect.width : cellSize;
  const sampleTrayTile = document.querySelector('.tray-tile');
  const trayTileSize = sampleTrayTile
    ? sampleTrayTile.getBoundingClientRect().width
    : parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile-size')) || flySize;

  const fly = document.createElement('div');
  fly.className = 'tile tile-flying';
  fly.textContent = getTileVisual(tile.type);
  fly.style.cssText = `
    position: fixed;
    left: ${tileCenterX}px;
    top: ${tileCenterY}px;
    width: ${flySize}px;
    height: ${flySize}px;
    margin-left: -${flySize / 2}px;
    margin-top: -${flySize / 2}px;
    z-index: 100;
    pointer-events: none;
  `;
  document.body.appendChild(fly);

  if (tileEl) tileEl.style.visibility = 'hidden';

  const endScale = trayTileSize / flySize;

  fly.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${targetX - tileCenterX}px, ${targetY - tileCenterY}px) scale(${endScale})`, opacity: 1 }
    ],
    { duration: FLY_DURATION_MS, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' }
  ).finished.then(() => {
    fly.remove();
    if (tileEl && tileEl.isConnected) tileEl.style.visibility = '';
    onComplete();
  });
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
  });

  const combinePromises = startPositions.map(({ el, startX, startY }) => {
    const half = el.getBoundingClientRect().width / 2;
    el.style.position = 'fixed';
    el.style.left = `${startX}px`;
    el.style.top = `${startY}px`;
    el.style.marginLeft = `-${half}px`;
    el.style.marginTop = `-${half}px`;
    return el.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${targetX - startX}px, ${targetY - startY}px) scale(1.2)`, opacity: 1 },
        { transform: `translate(${targetX - startX}px, ${targetY - startY}px) scale(0)`, opacity: 0 }
      ],
      { duration: COMBINE_DURATION_MS, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' }
    ).finished;
  });

  Promise.all(combinePromises).then(() => {
    toAnimate.forEach(el => el.remove());
    onComplete(removedSlotIndices);
  });
}

function handleMatchingInTrayAnimated(onComplete) {
  const matchingTypes = getMatchingTypesInTray();
  if (matchingTypes.length === 0) {
    onComplete();
    return;
  }

  if (skipAnimationsForTests) {
    matchingTypes.forEach(type => {
      let removedCount = 0;
      const newTray = [];
      for (let i = 0; i < state.trayTiles.length; i += 1) {
        const t = state.trayTiles[i];
        if (t.type === type && removedCount < 3) {
          removedCount += 1;
        } else {
          newTray.push(t);
        }
      }
      state.trayTiles = newTray;
      state.score += 10 * 3;
      state.stats.tilesClearedTotal += 3;
      saveStats();
    });
    renderTray();
    onComplete();
    return;
  }

  function removeNextType() {
    if (matchingTypes.length === 0) {
      onComplete();
      return;
    }
    const type = matchingTypes.shift();
    animateMatchCombine(type, (removedSlotIndices) => {
      if (removedSlotIndices.length > 0) {
        startTrayCompactAnimation(removedSlotIndices);
        setTimeout(() => {
          applyMatchRemovalAndContinue(type, removeNextType);
        }, TRAY_COMPACT_DURATION_MS);
      } else {
        applyMatchRemovalAndContinue(type, removeNextType);
      }
    });
  }

  function applyMatchRemovalAndContinue(type, next) {
    let removedCount = 0;
    const newTray = [];
    for (let i = 0; i < state.trayTiles.length; i += 1) {
      const t = state.trayTiles[i];
      if (t.type === type && removedCount < 3) {
        removedCount += 1;
      } else {
        newTray.push(t);
      }
    }
    state.trayTiles = newTray;
    state.score += 10 * 3;
    state.stats.tilesClearedTotal += 3;
    saveStats();
    renderTray(true);
    // Clear compacting state in same turn to avoid a separate repaint/blink
    clearTrayCompactAnimation();
    next();
  }

  removeNextType();
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
  ui.overlayMessage.textContent = `You cleared ${level.name} with a score of ${state.score}.`;
  ui.overlayPrimary.textContent =
    state.currentLevelIndex < LEVELS.length - 1 ? 'Next Level' : 'Restart from Level 1';
  ui.overlay.classList.remove('hidden');
}

function triggerLoss(reason) {
  state.isLevelOver = true;
  state.stats.currentWinStreak = 0;
  saveStats();

  ui.overlayTitle.textContent = 'Level Failed';
  ui.overlayMessage.textContent = reason || 'The tray overflowed.';
  ui.overlayPrimary.textContent = 'Try Again';
  ui.overlay.classList.remove('hidden');
}

function hideOverlay() {
  ui.overlay.classList.add('hidden');
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
  const yPixelOffset = cellSize * 0.5;
  const xPixelOffset = cellSize * 0.5;

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

  tiles.forEach((tile) => {
    const el = document.createElement('div');
    el.className = 'level-select-mini-tile';
    el.textContent = getTileVisual(tile.type);
    const baseLeft = (tile.x + 0.5) * cellSize;
    const baseTop = (tile.y + 0.5) * cellSize;
    const layeredLeft = baseLeft + (tile.z || 0) * xPixelOffset;
    const layeredTop = baseTop - (tile.z || 0) * yPixelOffset;
    el.style.width = `${Math.max(6, cellSize * 0.7)}px`;
    el.style.height = `${Math.max(6, cellSize * 0.7)}px`;
    el.style.left = `${layeredLeft}px`;
    el.style.top = `${layeredTop}px`;
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

    card.addEventListener('click', () => {
      startLevel(i);
      hideLevelSelect();
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
  setTimeout(onDone, CAROUSEL_ANIMATION_MS + 50);
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
  setTimeout(onDone, CAROUSEL_ANIMATION_MS + 50);
}

function levelSelectGoToDifficulty(difficulty) {
  const visibleCount = getLevelSelectVisibleCount();
  const idx = getFirstIndexForDifficulty(difficulty);
  levelSelectCarouselIndex = Math.min(idx, Math.max(0, LEVELS.length - visibleCount));
  buildLevelSelectCarousel();
}

function showLevelSelect() {
  if (!ui.levelSelectOverlay) return;
  ui.levelSelectOverlay.classList.remove('hidden');
  requestAnimationFrame(() => {
    const visibleCount = getLevelSelectVisibleCount();
    levelSelectCarouselIndex = Math.min(
      state.currentLevelIndex,
      Math.max(0, LEVELS.length - visibleCount)
    );
    buildLevelSelectCarousel();
  });
}

function hideLevelSelect() {
  if (ui.levelSelectOverlay) ui.levelSelectOverlay.classList.add('hidden');
}

function shuffleTrayOptimally() {
  const groups = {};
  state.trayTiles.forEach(tile => {
    if (!groups[tile.type]) groups[tile.type] = [];
    groups[tile.type].push(tile);
  });

  const orderedTypes = Object.keys(groups).sort(
    (a, b) => groups[b].length - groups[a].length
  );
  const newTray = [];
  orderedTypes.forEach(type => {
    newTray.push(...groups[type]);
  });
  state.trayTiles = newTray;
}

function highlightTraySelectableTypes() {
  const trayTiles = Array.from(ui.tray.querySelectorAll('.tray-tile'));
  trayTiles.forEach(el => {
    el.classList.add('selectable-type');
    el.addEventListener(
      'click',
      () => {
        if (!state.isRemoveTypeMode || state.powerups.removeType <= 0) return;
        const type = el.dataset.type;
        performRemoveType(type);
      },
      { once: true }
    );
  });
}

function performRemoveType(type) {
  state.isRemoveTypeMode = false;
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
  ui.scoreValue.textContent = String(state.score);
  ui.undoCount.textContent = String(state.powerups.undo);
  ui.shuffleCount.textContent = String(state.powerups.shuffle);
  ui.removeTypeCount.textContent = String(state.powerups.removeType);

  ui.undoButton.disabled = state.powerups.undo <= 0 || !state.lastSnapshot || state.isLevelOver;
  ui.shuffleButton.disabled =
    state.powerups.shuffle <= 0 || state.trayTiles.length <= 1 || state.isLevelOver;
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
  const boardRect = ui.board.getBoundingClientRect();
  const cellSize = boardRect.width / (size + 2);
  document.documentElement.style.setProperty('--tile-size', `${cellSize}px`);
  const yPixelOffset = cellSize * 0.5;
  const xPixelOffset = cellSize * 0.5;

  const tappableIds = new Set(getTappableTiles().map(t => t.id));

  const tilesToRender = state.boardTiles
    .filter(tile => !tile.removed)
    .slice()
    .sort((a, b) => a.z - b.z);

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
      el.className = 'tile';
      el.dataset.tileId = tile.id;
      el.addEventListener('click', () => handleBoardTileClick(tile.id));
    } else {
      existingById.delete(tile.id);
    }

    el.classList.toggle('tile-settle-in', withSettleAnimation);
    if (tappableIds.has(tile.id)) {
      el.classList.add('tappable');
      el.classList.remove('blocked');
    } else {
      el.classList.add('blocked');
      el.classList.remove('tappable');
    }
    el.textContent = getTileVisual(tile.type);
    el.style.width = '';
    el.style.height = '';
    const baseLeft = (tile.x + 0.5) * cellSize;
    const baseTop = (tile.y + 0.5) * cellSize;
    const layeredLeft = baseLeft + tile.z * xPixelOffset;
    const layeredTop = baseTop - tile.z * yPixelOffset;
    el.style.left = `${layeredLeft}px`;
    el.style.top = `${layeredTop}px`;
    el.style.transform = 'translate(-50%, -50%)';
    el.style.zIndex = String(10 + tile.z);
    orderedElements.push(el);
  }

  for (const el of existingById.values()) el.remove();
  for (const el of orderedElements) {
    if (el.parentNode !== ui.board) ui.board.appendChild(el);
  }
}

function renderTray(forceRebuild = false) {
  const maxSlots = 7;

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
    }
  };
}

function main() {
  initDomRefs();
  bindEvents();
  loadProgression();
  startLevel(state.currentLevelIndex);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}

