const TILE_TYPES = [
  { id: 'leaf', emoji: '🍃' },
  { id: 'flower', emoji: '🌸' },
  { id: 'clover', emoji: '🍀' },
  { id: 'star', emoji: '⭐' },
  { id: 'acorn', emoji: '🌰' },
  { id: 'mushroom', emoji: '🍄' }
];

const FALLBACK_LEVELS = [
  {
    id: 1,
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

const LEVELS =
  typeof window !== 'undefined' && Array.isArray(window.__TRIPLET_GENERATED_LEVELS__)
    ? window.__TRIPLET_GENERATED_LEVELS__
    : FALLBACK_LEVELS;

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

  tile.removed = true;
  insertTrayTileByShape(state.trayTiles, { id: tile.id, type: tile.type });
  renderBoard();
  handleMatchingInTray();
  renderTray();
  renderHud();
  checkWinCondition();
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

function renderBoard() {
  ui.board.innerHTML = '';
  const level = LEVELS[state.currentLevelIndex];
  const size = level.gridSize;
  const boardRect = ui.board.getBoundingClientRect();
  const cellSize = boardRect.width / (size + 2);
  const yPixelOffset = cellSize * 0.5;
  const xPixelOffset = cellSize * 0.5;

  const tappableIds = new Set(getTappableTiles().map(t => t.id));

  const tilesToRender = state.boardTiles
    .filter(tile => !tile.removed)
    .slice()
    .sort((a, b) => a.z - b.z);

  tilesToRender.forEach(tile => {
    const el = document.createElement('div');
    el.className = 'tile';
    if (tappableIds.has(tile.id)) {
      el.classList.add('tappable');
    } else {
      el.classList.add('blocked');
    }
    el.textContent = getTileVisual(tile.type);
    el.style.width = `${cellSize}px`;
    el.style.height = `${cellSize}px`;
    const baseLeft = (tile.x + 0.5) * cellSize;
    const baseTop = (tile.y + 0.5) * cellSize;
    const layeredLeft = baseLeft + tile.z * xPixelOffset;
    const layeredTop = baseTop - tile.z * yPixelOffset;
    el.style.left = `${layeredLeft}px`;
    el.style.top = `${layeredTop}px`;
    el.style.transform = 'translate(-50%, -50%)';
    el.style.zIndex = String(10 + tile.z);
    el.addEventListener('click', () => handleBoardTileClick(tile.id));
    ui.board.appendChild(el);
  });
}

function renderTray() {
  ui.tray.innerHTML = '';
  const maxSlots = 7;
  for (let i = 0; i < maxSlots; i += 1) {
    const slot = document.createElement('div');
    slot.className = 'tray-slot';
    const inner = document.createElement('div');
    inner.className = 'tray-slot-inner';
    const tile = state.trayTiles[i];
    if (tile) {
      const tileEl = document.createElement('div');
      tileEl.className = 'tray-tile';
      tileEl.textContent = getTileVisual(tile.type);
      tileEl.dataset.type = tile.type;
      inner.appendChild(tileEl);
    }
    slot.appendChild(inner);
    ui.tray.appendChild(slot);
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

