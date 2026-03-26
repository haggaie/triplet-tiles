/**
 * Lightweight i18n for the main game shell (no build step).
 * Locales live in MESSAGES; add keys to `en` first, then mirror in other locales.
 */
import { TILE_TYPES } from './tile-types.js';

const STORAGE_KEY = 'triplet_tiles_locale';

/** @type {readonly string[]} */
export const SUPPORTED_LOCALES = Object.freeze(['en', 'es']);

const RTL_LANG_PREFIXES = new Set(['ar', 'he', 'fa', 'ur', 'yi']);

/** @type {Record<string, Record<string, string>>} */
const MESSAGES = {
  en: {
    'app.docTitle': 'Triplet Tiles',
    'app.gameTitle': 'Triplet Tiles',
    'level.line': 'Level {id}: {name}',
    'level.shape.other': 'Other',
    'score.label': 'Score',
    'chrome.chooseLevel': 'Choose level',
    'chrome.restartLevel': 'Restart level',
    'toolbar.display': 'Display',
    'toolbar.fullScreen': 'Full screen',
    'toolbar.fullScreenDetail': 'Fill the screen (hides browser UI where supported)',
    'toolbar.exitFullScreen': 'Exit full screen',
    'toolbar.leaveFullScreen': 'Leave full screen',
    'toolbar.installApp': 'Install app',
    'toolbar.installDetail': 'Install as an app for a fuller screen without the address bar',
    'audio.musicGroup': 'Background music',
    'audio.musicOn': 'Music on',
    'audio.musicOff': 'Music off',
    'audio.musicDetail': 'Turn background music on or off',
    'audio.musicVolumeLabel': 'Music volume',
    'audio.musicVolumeAria': 'Music volume',
    'audio.sfxGroup': 'Sound effects',
    'audio.sfxOn': 'Sound effects on',
    'audio.sfxOff': 'Sound effects off',
    'audio.sfxDetail': 'Turn sound effects on or off',
    'audio.sfxVolumeLabel': 'Sound effects volume',
    'audio.sfxVolumeAria': 'Sound effects volume',
    'audio.hapticsGroup': 'Vibration',
    'audio.hapticsOn': 'Vibration on',
    'audio.hapticsOff': 'Vibration off',
    'audio.hapticsTurnOff': 'Turn vibration off',
    'audio.hapticsTurnOn': 'Turn vibration on',
    'audio.vibrationWord': 'Vibration',
    'audio.hapticsUnsupportedAria': 'Vibration not supported in this browser',
    'audio.hapticsUnsupportedTitle':
      'Vibration is not available in this browser. On Android, Chrome and Samsung Internet support it; Firefox for Android does not.',
    'powerups.group': 'Power-ups',
    'powerups.undoTitle': 'Undo last move',
    'powerups.undoAria': 'Undo last move',
    'powerups.shuffleTitle': 'Shuffle tile types on the board (positions stay the same)',
    'powerups.shuffleAria': 'Shuffle tile types',
    'powerups.removeTypeTitle': 'Remove all of one tile type',
    'powerups.removeTypeAria': 'Remove one tile type',
    'board.playfieldAria':
      'Board playfield (scroll to see the whole grid on large levels)',
    'board.gridAria':
      'Game board, match exposed tiles. Focus moves here when a level starts; arrow keys move in four directions and wrap to the far edge (e.g. left from the first column jumps to the rightmost column); Enter or Space to collect.',
    'tray.sectionLabel': 'Tray',
    'tray.groupAria': 'Tray',
    'overlay.winTitle': 'Level Complete',
    'overlay.winBody': 'You cleared {name} with a score of {score}.',
    'overlay.nextLevel': 'Next level',
    'overlay.restartFrom1': 'Restart from level 1',
    'overlay.lossTitle': 'Level Failed',
    'overlay.lossDefault': 'The tray overflowed.',
    'overlay.tryAgain': 'Try again',
    'overlay.nextAria': 'Next level',
    'overlay.retryLevelAria': 'Retry this level',
    'levelSelect.heading': 'Choose Level',
    'levelSelect.close': 'Close',
    'levelSelect.groupByLabel': 'Group by',
    'levelSelect.groupAria': 'Group levels by',
    'levelSelect.groupDifficulty': 'Difficulty (thirds)',
    'levelSelect.groupShape': 'Board shape',
    'levelSelect.shapeLabel': 'Shape',
    'levelSelect.filterShapeAria': 'Filter by board template shape',
    'levelSelect.allShapes': 'All shapes',
    'levelSelect.all': 'All',
    'levelSelect.easy': 'Easy',
    'levelSelect.medium': 'Medium',
    'levelSelect.hard': 'Hard',
    'levelSelect.hint': 'Click a level to play',
    'levelSelect.hintEmpty': 'No levels match this filter.',
    'levelSelect.cardAriaShape': 'Level {id}: {name}, shape {shape}',
    'levelSelect.cardAriaDiff': 'Level {id}: {name}, {difficulty} difficulty',
    'difficulty.easy': 'easy',
    'difficulty.medium': 'medium',
    'difficulty.hard': 'hard',
    'tray.removeTypeTrayAria':
      'Choose a tile type to remove from the board and tray. Arrow keys to move, Enter or Space to confirm, Escape to cancel.',
    'tray.removeTypeTileAria': '{type} in tray — remove this type from board and tray',
    'board.exposedTileAria': '{type}, exposed tile',
    'tile.unknown': 'tile',
    'tile.evergreen-tree': 'evergreen tree',
    'tile.flower': 'flower',
    'tile.grapes': 'grapes',
    'tile.star': 'star',
    'tile.acorn': 'acorn',
    'tile.mushroom': 'mushroom',
    'tile.cherry': 'cherry',
    'tile.butterfly': 'butterfly',
    'tile.sunflower': 'sunflower',
    'tile.apple': 'apple',
    'tile.carrot': 'carrot',
    'tile.lady-beetle': 'lady beetle',
    'loss.trayFull':
      'The tray is full. Try managing your tiles more carefully next time.',
    'loss.trayOverflow': 'The tray overflowed.',
    'locale.selectLabel': 'Language',
    'credits.full':
      'Tile icons: <a href="https://openmoji.org/" target="_blank" rel="noopener noreferrer">OpenMoji</a> (CC&nbsp;BY-SA&nbsp;4.0) · UI icons: <a href="https://phosphoricons.com/" target="_blank" rel="noopener noreferrer">Phosphor</a> (MIT)'
  },
  es: {
    'app.docTitle': 'Tríadas',
    'app.gameTitle': 'Tríadas',
    'level.line': 'Nivel {id}: {name}',
    'level.shape.other': 'Otro',
    'score.label': 'Puntuación',
    'chrome.chooseLevel': 'Elegir nivel',
    'chrome.restartLevel': 'Reiniciar nivel',
    'toolbar.display': 'Pantalla',
    'toolbar.fullScreen': 'Pantalla completa',
    'toolbar.fullScreenDetail': 'Usar toda la pantalla (oculta la interfaz del navegador si está disponible)',
    'toolbar.exitFullScreen': 'Salir de pantalla completa',
    'toolbar.leaveFullScreen': 'Salir de pantalla completa',
    'toolbar.installApp': 'Instalar aplicación',
    'toolbar.installDetail': 'Instalar como app para una pantalla más amplia sin la barra de direcciones',
    'audio.musicGroup': 'Música de fondo',
    'audio.musicOn': 'Música activada',
    'audio.musicOff': 'Música desactivada',
    'audio.musicDetail': 'Activar o desactivar la música de fondo',
    'audio.musicVolumeLabel': 'Volumen de música',
    'audio.musicVolumeAria': 'Volumen de música',
    'audio.sfxGroup': 'Efectos de sonido',
    'audio.sfxOn': 'Efectos de sonido activados',
    'audio.sfxOff': 'Efectos de sonido desactivados',
    'audio.sfxDetail': 'Activar o desactivar efectos de sonido',
    'audio.sfxVolumeLabel': 'Volumen de efectos',
    'audio.sfxVolumeAria': 'Volumen de efectos de sonido',
    'audio.hapticsGroup': 'Vibración',
    'audio.hapticsOn': 'Vibración activada',
    'audio.hapticsOff': 'Vibración desactivada',
    'audio.hapticsTurnOff': 'Desactivar vibración',
    'audio.hapticsTurnOn': 'Activar vibración',
    'audio.vibrationWord': 'Vibración',
    'audio.hapticsUnsupportedAria': 'Vibración no disponible en este navegador',
    'audio.hapticsUnsupportedTitle':
      'La vibración no está disponible en este navegador. En Android, Chrome y Samsung Internet la admiten; Firefox para Android no.',
    'powerups.group': 'Potenciadores',
    'powerups.undoTitle': 'Deshacer última jugada',
    'powerups.undoAria': 'Deshacer última jugada',
    'powerups.shuffleTitle': 'Barajar tipos de ficha en el tablero (las posiciones no cambian)',
    'powerups.shuffleAria': 'Barajar tipos de fichas',
    'powerups.removeTypeTitle': 'Quitar todas las fichas de un tipo',
    'powerups.removeTypeAria': 'Quitar un tipo de ficha',
    'board.playfieldAria':
      'Campo de juego (desplázate para ver toda la cuadrícula en niveles grandes)',
    'board.gridAria':
      'Tablero: empareja fichas visibles. El foco va aquí al empezar un nivel; las flechas se mueven en cuatro direcciones y saltan al borde opuesto (por ejemplo, desde la primera columna a la derecha); Intro o Espacio para coger.',
    'tray.sectionLabel': 'Bandeja',
    'tray.groupAria': 'Bandeja',
    'overlay.winTitle': 'Nivel completado',
    'overlay.winBody': 'Has completado {name} con {score} puntos.',
    'overlay.nextLevel': 'Siguiente nivel',
    'overlay.restartFrom1': 'Volver al nivel 1',
    'overlay.lossTitle': 'Nivel fallido',
    'overlay.lossDefault': 'La bandeja se ha desbordado.',
    'overlay.tryAgain': 'Reintentar',
    'overlay.nextAria': 'Siguiente nivel',
    'overlay.retryLevelAria': 'Reintentar este nivel',
    'levelSelect.heading': 'Elegir nivel',
    'levelSelect.close': 'Cerrar',
    'levelSelect.groupByLabel': 'Agrupar por',
    'levelSelect.groupAria': 'Agrupar niveles por',
    'levelSelect.groupDifficulty': 'Dificultad (tercios)',
    'levelSelect.groupShape': 'Forma del tablero',
    'levelSelect.shapeLabel': 'Forma',
    'levelSelect.filterShapeAria': 'Filtrar por plantilla de forma',
    'levelSelect.allShapes': 'Todas las formas',
    'levelSelect.all': 'Todos',
    'levelSelect.easy': 'Fácil',
    'levelSelect.medium': 'Medio',
    'levelSelect.hard': 'Difícil',
    'levelSelect.hint': 'Pulsa un nivel para jugar',
    'levelSelect.hintEmpty': 'Ningún nivel coincide con este filtro.',
    'levelSelect.cardAriaShape': 'Nivel {id}: {name}, forma {shape}',
    'levelSelect.cardAriaDiff': 'Nivel {id}: {name}, dificultad {difficulty}',
    'difficulty.easy': 'fácil',
    'difficulty.medium': 'media',
    'difficulty.hard': 'difícil',
    'tray.removeTypeTrayAria':
      'Elige un tipo de ficha para quitar del tablero y la bandeja. Flechas para mover, Intro o Espacio para confirmar, Escape para cancelar.',
    'tray.removeTypeTileAria': '{type} en la bandeja — quitar este tipo del tablero y la bandeja',
    'board.exposedTileAria': '{type}, ficha visible',
    'tile.unknown': 'ficha',
    'tile.evergreen-tree': 'abeto',
    'tile.flower': 'flor',
    'tile.grapes': 'uvas',
    'tile.star': 'estrella',
    'tile.acorn': 'bellota',
    'tile.mushroom': 'seta',
    'tile.cherry': 'cereza',
    'tile.butterfly': 'mariposa',
    'tile.sunflower': 'girasol',
    'tile.apple': 'manzana',
    'tile.carrot': 'zanahoria',
    'tile.lady-beetle': 'mariquita',
    'loss.trayFull':
      'La bandeja está llena. Intenta gestionar mejor tus fichas la próxima vez.',
    'loss.trayOverflow': 'La bandeja se ha desbordado.',
    'locale.selectLabel': 'Idioma',
    'credits.full':
      'Iconos de fichas: <a href="https://openmoji.org/" target="_blank" rel="noopener noreferrer">OpenMoji</a> (CC&nbsp;BY-SA&nbsp;4.0) · Iconos de interfaz: <a href="https://phosphoricons.com/" target="_blank" rel="noopener noreferrer">Phosphor</a> (MIT)'
  }
};

let currentLocale = 'en';
/** @type {Array<() => void>} */
const localeChangeListeners = [];

function readStoredLocaleRaw() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return null;
    const v = JSON.parse(raw);
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}

function writeStoredLocale(code) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(code));
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeLocaleTag(raw) {
  if (!raw || typeof raw !== 'string') return 'en';
  const lower = raw.trim().toLowerCase();
  const base = lower.split(/[-_]/)[0] || 'en';
  if (/** @type {readonly string[]} */ (SUPPORTED_LOCALES).includes(lower)) return lower;
  if (/** @type {readonly string[]} */ (SUPPORTED_LOCALES).includes(base)) return base;
  return 'en';
}

function resolveInitialLocale() {
  try {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('lang');
    if (q) {
      const n = normalizeLocaleTag(q);
      if (/** @type {readonly string[]} */ (SUPPORTED_LOCALES).includes(n)) {
        writeStoredLocale(n);
        return n;
      }
    }
  } catch {
    /* ignore */
  }
  const stored = readStoredLocaleRaw();
  if (stored) {
    const n = normalizeLocaleTag(stored);
    if (/** @type {readonly string[]} */ (SUPPORTED_LOCALES).includes(n)) return n;
  }
  return normalizeLocaleTag(typeof navigator !== 'undefined' ? navigator.language || 'en' : 'en');
}

function applyDocumentLangAndDir(locale) {
  const doc = typeof document !== 'undefined' ? document.documentElement : null;
  if (!doc) return;
  doc.lang = locale;
  const base = locale.split(/[-_]/)[0].toLowerCase();
  doc.dir = RTL_LANG_PREFIXES.has(base) ? 'rtl' : 'ltr';
}

/**
 * @param {string} key
 * @param {string} locale
 */
function lookupMessage(key, locale) {
  const pack = MESSAGES[locale] || MESSAGES.en;
  if (key in pack) return pack[key];
  return MESSAGES.en[key] ?? key;
}

/**
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 */
export function t(key, vars) {
  let s = lookupMessage(key, currentLocale);
  if (vars && typeof vars === 'object') {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

export function getLocale() {
  return currentLocale;
}

/**
 * @param {string} code
 * @param {{ persist?: boolean }} [opts]
 */
export function setLocale(code, opts = {}) {
  const next = normalizeLocaleTag(code);
  if (!/** @type {readonly string[]} */ (SUPPORTED_LOCALES).includes(next)) return;
  currentLocale = next;
  applyDocumentLangAndDir(next);
  if (opts.persist !== false) writeStoredLocale(next);
  const sel = /** @type {HTMLSelectElement | null} */ (typeof document !== 'undefined'
    ? document.getElementById('locale-select')
    : null);
  if (sel && sel.value !== next) sel.value = next;
  for (const fn of localeChangeListeners) {
    try {
      fn();
    } catch {
      /* ignore listener errors */
    }
  }
}

/** @param {() => void} fn */
export function onLocaleChange(fn) {
  localeChangeListeners.push(fn);
}

/**
 * @param {HTMLElement | Document | null} [root]
 */
export function applyDomI18n(root) {
  const scope = root || (typeof document !== 'undefined' ? document.body : null);
  if (!scope || typeof scope.querySelectorAll !== 'function') return;

  scope.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    if (key) el.innerHTML = t(key);
  });
  for (const [dataAttr, domAttr] of /** @type {const} */ ([
    ['data-i18n-aria-label', 'aria-label'],
    ['data-i18n-title', 'title'],
    ['data-i18n-placeholder', 'placeholder']
  ])) {
    scope.querySelectorAll(`[${dataAttr}]`).forEach((el) => {
      const key = el.getAttribute(dataAttr);
      if (key) el.setAttribute(domAttr, t(key));
    });
  }
}

/**
 * @param {number | string} n
 */
export function formatGameInteger(n) {
  return new Intl.NumberFormat(currentLocale, { maximumFractionDigits: 0 }).format(Number(n) || 0);
}

/**
 * @param {Date | number} input
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export function formatGameDate(input, options = {}) {
  const d = input instanceof Date ? input : new Date(input);
  return new Intl.DateTimeFormat(currentLocale, options).format(d);
}

/**
 * Stored loss reason may be a message key (preferred) or legacy English prose.
 * @param {string} stored
 */
export function resolveLossMessage(stored) {
  if (!stored) return t('overlay.lossDefault');
  if (/^[a-z][a-z0-9._]*$/i.test(stored) && lookupMessage(stored, 'en') !== stored) {
    return t(stored);
  }
  return stored;
}

/** @param {unknown} typeId layout / tray type index or numeric string */
export function tileTypeLabel(typeId) {
  if (typeof typeId === 'number' && typeId >= 0 && typeId < TILE_TYPES.length) {
    const id = TILE_TYPES[typeId].id;
    return t(`tile.${id}`);
  }
  if (typeof typeId === 'string' && /^\d+$/.test(typeId)) {
    const idx = parseInt(typeId, 10);
    const id = TILE_TYPES[idx]?.id;
    if (id) return t(`tile.${id}`);
  }
  return t('tile.unknown');
}

/**
 * @param {'easy' | 'medium' | 'hard'} band
 */
export function difficultyLabel(band) {
  return t(`difficulty.${band}`);
}

/**
 * @param {string} shapeKey from `getLevelShapeKey`
 */
export function displayShapeName(shapeKey) {
  if (shapeKey === 'Other') return t('level.shape.other');
  return shapeKey;
}

/**
 * @param {{ localeSelect?: HTMLSelectElement | null }} [opts]
 */
export function initI18n(opts = {}) {
  if (typeof document === 'undefined') return;
  const initial = resolveInitialLocale();
  currentLocale = initial;
  applyDocumentLangAndDir(initial);

  const sel = opts.localeSelect ?? document.getElementById('locale-select');
  if (sel instanceof HTMLSelectElement) {
    sel.value = initial;
    sel.addEventListener('change', () => setLocale(sel.value));
  }

  document.title = t('app.docTitle');
  applyDomI18n(document.body);
}
