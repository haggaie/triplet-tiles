/**
 * Interactive level designer client — talks to tools/leveldesign-server.js
 *
 * Full-board preview delegates to `lib/board-view.js` + `lib/tile-types.js` (shared with `game.js`).
 * `tile-layering.js` must load before this module (see index.html).
 */

import { measureBoardLayoutFromFit, mountBoardTilesFill } from '/lib/board-view.js';
import { getTileVisual } from '/lib/tile-types.js';

const TEMPLATE_PARAM_DEFAULTS = {
  rectangle: { width: 5, height: 5 },
  diamond: { radius: 3 },
  circle: { radius: 3 },
  triangle: { radius: 4 },
  hexagon: { radius: 4 },
  cross: { radius: 4, thickness: 2 },
  ring: { radius: 4, thickness: 2 },
  t: { radius: 5, thickness: 2 },
  u: { radius: 5, thickness: 2 },
  heart: { radius: 4, thickness: 2 },
  spiral: { radius: 4, thickness: 2 },
  letter: { letter: 'S', radius: 4, thickness: 2 }
};

const LAYER_SHAPE_OPTIONS_DEFAULTS = {
  full: {},
  pyramid: {},
  shift: { shiftDx: 1, shiftDy: 0 },
  randomErosion: { erosionRate: 0.18, minCellFraction: 0.12, allowShift: true }
};

function $(id) {
  return document.getElementById(id);
}

function typeColor(t) {
  const x = Number(t);
  const h = ((x * 47 + 13) % 360 + 360) % 360;
  const l = 58 - (x % 5) * 2;
  return `hsl(${h} 52% ${l}%)`;
}

function buildGridSvg(gridWidth, gridHeight, cellPx, cellFill) {
  const w = gridWidth * cellPx;
  const h = gridHeight * cellPx;
  const rects = [];
  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      const fill = cellFill(x, y);
      rects.push(
        `<rect x="${x * cellPx}" y="${y * cellPx}" width="${cellPx - 1}" height="${cellPx - 1}" rx="2" fill="${fill}" />`
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="grid">${rects.join('')}</svg>`;
}

const CELL_COMPACT = 12;

function renderSilhouette(mount, cells, gridWidth, gridHeight) {
  const set = new Set(cells.map((c) => `${c.x},${c.y}`));
  const bg = 'oklch(0.28 0.02 75)';
  const hi = 'oklch(0.62 0.08 78)';
  mount.innerHTML = buildGridSvg(gridWidth, gridHeight, CELL_COMPACT, (x, y) =>
    set.has(`${x},${y}`) ? hi : bg
  );
}

function renderLayoutTop(mount, layout, gridWidth, gridHeight) {
  const byXY = new Map();
  for (const t of layout) {
    const k = `${t.x},${t.y}`;
    const prev = byXY.get(k);
    if (!prev || t.z > prev.z) byXY.set(k, t);
  }
  const empty = 'oklch(0.26 0.015 75)';
  mount.innerHTML = buildGridSvg(gridWidth, gridHeight, CELL_COMPACT, (x, y) => {
    const t = byXY.get(`${x},${y}`);
    return t ? typeColor(t.type) : empty;
  });
}

/** Full board: same DOM/CSS path as the game (`mountBoardTilesFill` → `lib/board-view.js`). */
function renderFullLevelGameStyle(mount, layout, gridWidth, gridHeight) {
  mount.innerHTML = '';
  try {
    const wrap = document.createElement('div');
    wrap.className = 'leveldesign-preview-wrap';
    const board = document.createElement('div');
    board.className = 'board leveldesign-preview-board';
    board.setAttribute('role', 'presentation');

    const { cellSize, widthPx, heightPx } = measureBoardLayoutFromFit(gridWidth, gridHeight, {
      maxW: 560,
      maxH: 560,
      cellMinPx: 36
    });
    board.style.width = `${widthPx}px`;
    board.style.height = `${heightPx}px`;
    board.style.setProperty('--tile-size', `${cellSize}px`);
    board.style.setProperty('--tile-icon-size', `${Math.round(cellSize * 0.4)}px`);

    mountBoardTilesFill(board, {
      layout,
      cellSize,
      widthPx,
      heightPx,
      getTileVisual,
      tileClassName: 'tile blocked'
    });

    wrap.appendChild(board);
    mount.appendChild(wrap);
  } catch (e) {
    const p = document.createElement('p');
    p.className = 'hint hint--err';
    p.textContent = `Board preview failed (use \`npm run leveldesign\` so /tile-layering.js and /lib/* load): ${e.message}`;
    mount.appendChild(p);
  }
}

const CELL_LAYER_SIL = 18;

function renderLayerSilhouettes(mount, layerSilhouettes, gridWidth, gridHeight) {
  mount.innerHTML = '';
  if (!layerSilhouettes || layerSilhouettes.length === 0) {
    mount.textContent = 'No layer silhouette data.';
    return;
  }

  for (const layer of layerSilhouettes) {
    const z = layer.z;
    const cells = layer.cells || [];
    const set = new Set(cells.map((c) => `${c.x},${c.y}`));
    const fig = document.createElement('figure');
    fig.className = 'viz viz--layer-sil';
    const cap = document.createElement('figcaption');
    cap.textContent = `z = ${z} · ${cells.length} cells`;
    const inner = document.createElement('div');
    inner.className = 'viz__svg';
    inner.innerHTML = buildGridSvg(gridWidth, gridHeight, CELL_LAYER_SIL, (x, y) =>
      set.has(`${x},${y}`) ? 'oklch(0.62 0.11 78)' : 'oklch(0.24 0.02 75)'
    );
    fig.appendChild(cap);
    fig.appendChild(inner);
    mount.appendChild(fig);
  }
}

function formatMetricValue(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number' && Number.isFinite(v)) {
    if (Math.abs(v) >= 1000 || (Math.abs(v) < 0.001 && v !== 0)) return v.toExponential(4);
    return String(Math.round(v * 10000) / 10000);
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function renderMetrics(summaryEl, tbody, score) {
  tbody.innerHTML = '';
  if (!score) {
    summaryEl.textContent = 'No data.';
    summaryEl.className = 'metrics-summary metrics-summary--bad';
    return;
  }

  if (!score.solvable) {
    summaryEl.innerHTML = `<strong>Not solvable</strong> — ${escapeHtml(
      String(score.metrics?.status || 'unsolvable')
    )} · nodes expanded: ${score.metrics?.nodesExpanded ?? '—'}`;
    summaryEl.className = 'metrics-summary metrics-summary--bad';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="2">Solver did not find a solution.</td>`;
    tbody.appendChild(tr);
    return;
  }

  summaryEl.className = 'metrics-summary';
  const d = score.difficultyScore;
  const nodes = score.metrics?.nodesExpanded;
  summaryEl.innerHTML = `Difficulty <strong>${formatMetricValue(d)}</strong>${
    nodes != null ? ` · solver nodes ${formatMetricValue(nodes)}` : ''
  }`;

  const m = score.metrics || {};
  const keys = Object.keys(m).sort((a, b) => a.localeCompare(b));
  for (const key of keys) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = key;
    const td = document.createElement('td');
    td.textContent = formatMetricValue(m[key]);
    tr.appendChild(th);
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readBatchFromForm() {
  const templateId = $('templateId').value;
  let templateParams;
  try {
    templateParams = JSON.parse($('templateParamsJson').value || '{}');
  } catch (e) {
    throw new Error(`templateParams JSON: ${e.message}`);
  }

  const tileTypeCount = parseInt($('tileTypeCount').value, 10);
  if (!Number.isInteger(tileTypeCount) || tileTypeCount < 1) {
    throw new Error('tileTypeCount must be a positive integer');
  }

  const mode = $('distMode').value;
  let distribution;
  if (mode === 'zipf') {
    const exponent = parseFloat($('zipfExponent').value);
    if ($('totalTripletsAuto').checked) {
      distribution = { mode: 'zipf', totalTriplets: 'auto', exponent };
    } else {
      const totalTriplets = parseInt($('totalTriplets').value, 10);
      if (!Number.isInteger(totalTriplets) || totalTriplets < 1) {
        throw new Error('totalTriplets must be a positive integer');
      }
      distribution = { mode: 'zipf', totalTriplets, exponent };
    }
  } else if (mode === 'weightedTriplets') {
    let weights;
    try {
      weights = JSON.parse($('weightsJson').value || '{}');
    } catch (e) {
      throw new Error(`weights JSON: ${e.message}`);
    }
    if ($('totalTripletsAuto').checked) {
      distribution = { mode: 'weightedTriplets', totalTriplets: 'auto', weights };
    } else {
      const totalTriplets = parseInt($('totalTriplets').value, 10);
      if (!Number.isInteger(totalTriplets) || totalTriplets < 1) {
        throw new Error('totalTriplets must be a positive integer');
      }
      distribution = { mode: 'weightedTriplets', totalTriplets, weights };
    }
  } else {
    let explicitCounts;
    try {
      explicitCounts = JSON.parse($('explicitCountsJson').value || '{}');
    } catch (e) {
      throw new Error(`explicitCounts JSON: ${e.message}`);
    }
    distribution = { mode: 'explicitCounts', explicitCounts };
  }

  let layerShapeOptions;
  try {
    layerShapeOptions = JSON.parse($('layerShapeOptionsJson').value || '{}');
  } catch (e) {
    throw new Error(`layerShapeOptions JSON: ${e.message}`);
  }

  const layering = {
    minZ: parseInt($('minZ').value, 10),
    maxZ: parseInt($('maxZ').value, 10),
    overlap: $('overlap').value,
    maxStackPerCell: parseInt($('maxStackPerCell').value, 10),
    full: $('layerFull').checked,
    layerShape: $('layerShape').value,
    layerShapeOptions,
    interleavePlacement: $('interleavePlacement').checked
  };

  return {
    templateId,
    templateParams,
    gridWidth: parseInt($('gridWidth').value, 10),
    gridHeight: parseInt($('gridHeight').value, 10),
    tileTypeCount,
    distribution,
    layering
  };
}

function syncDistUi() {
  const mode = $('distMode').value;
  const showZipf = mode === 'zipf';
  const showW = mode === 'weightedTriplets';
  const showE = mode === 'explicitCounts';
  const showTripletControls = showZipf || showW;
  const tripletWrap = $('totalTriplets')?.closest('.dist-zipf');
  if (tripletWrap) tripletWrap.style.display = showTripletControls ? '' : 'none';
  $('zipfExponent').closest('label').style.display = showZipf ? '' : 'none';
  $('explicitCountsJson').closest('label').hidden = !showE;
  $('weightsJson').closest('label').hidden = !showW;
  const auto = $('totalTripletsAuto').checked;
  $('totalTriplets').disabled = auto;
  $('totalTriplets').style.opacity = auto ? '0.5' : '';
}

function applyTemplateDefaults() {
  const id = $('templateId').value;
  const defs = TEMPLATE_PARAM_DEFAULTS[id] || { radius: 3 };
  $('templateParamsJson').value = JSON.stringify(defs, null, 2);
  const shape = $('layerShape').value;
  $('layerShapeOptionsJson').value = JSON.stringify(LAYER_SHAPE_OPTIONS_DEFAULTS[shape] || {}, null, 2);
}

function buildRequestBody() {
  const batch = readBatchFromForm();
  const body = {
    batch,
    levelId: parseInt($('levelId').value, 10) || 1
  };
  if ($('useLevelSeed').checked) {
    body.levelSeed = parseInt($('levelSeed').value, 10);
  } else {
    body.seed = parseInt($('configSeed').value, 10) || 0;
  }

  const scoreOptions = {
    maxSolveNodes: parseInt($('maxSolveNodes').value, 10) || 200000,
    rollouts: parseInt($('rollouts').value, 10) || 0
  };
  if ($('forcedLookahead').checked) {
    scoreOptions.forcedLookahead = {};
  }
  body.scoreOptions = scoreOptions;
  return body;
}

let debounceTimer;
let abortCtrl;

async function generate() {
  const status = $('statusLine');
  status.textContent = 'Running generator & solver…';
  status.classList.remove('hint--err');

  if (abortCtrl) abortCtrl.abort();
  abortCtrl = new AbortController();

  let body;
  try {
    body = buildRequestBody();
  } catch (e) {
    status.textContent = e.message;
    status.classList.add('hint--err');
    return;
  }

  try {
    const res = await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abortCtrl.signal
    });
    const data = await res.json();
    if (!data.ok) {
      status.textContent = data.error || 'Unknown error';
      status.classList.add('hint--err');
      renderMetrics($('metricsSummary'), $('metricsBody'), null);
      $('fullLevelMount').innerHTML = '';
      $('layerSilhouettesMount').textContent = '';
      return;
    }

    status.textContent = `OK · levelSeed ${data.levelSeed} · silhouette cells ${data.silhouette.cellCount} · layout tiles ${data.level.layout.length}`;

    renderSilhouette($('silhouetteMount'), data.silhouette.cells, data.level.gridWidth, data.level.gridHeight);
    renderLayoutTop($('layoutMount'), data.level.layout, data.level.gridWidth, data.level.gridHeight);
    renderFullLevelGameStyle($('fullLevelMount'), data.level.layout, data.level.gridWidth, data.level.gridHeight);
    renderLayerSilhouettes(
      $('layerSilhouettesMount'),
      data.level.layerSilhouettes,
      data.level.gridWidth,
      data.level.gridHeight
    );
    renderMetrics($('metricsSummary'), $('metricsBody'), data.score);
  } catch (e) {
    if (e.name === 'AbortError') return;
    status.textContent = String(e.message || e);
    status.classList.add('hint--err');
  }
}

function debouncedGenerate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(generate, 900);
}

function applyDefaultsFromApi(data) {
  $('configSeed').value = data.configSeed ?? 1337;
  if (data.defaultBatch) {
    const b = data.defaultBatch;
    $('templateId').value = b.templateId;
    $('gridWidth').value = b.gridWidth;
    $('gridHeight').value = b.gridHeight;
    $('tileTypeCount').value = b.tileTypeCount;
    $('templateParamsJson').value = JSON.stringify(b.templateParams || {}, null, 2);
    if (b.distribution?.mode === 'zipf') {
      $('distMode').value = 'zipf';
      const tt = b.distribution.totalTriplets;
      $('totalTriplets').value = typeof tt === 'number' ? tt : 18;
      $('zipfExponent').value = b.distribution.exponent;
      $('totalTripletsAuto').checked = true;
    }
    if (b.distribution?.mode === 'weightedTriplets') {
      $('distMode').value = 'weightedTriplets';
      const tt = b.distribution.totalTriplets;
      $('totalTriplets').value = typeof tt === 'number' ? tt : 18;
      $('totalTripletsAuto').checked = true;
    }
    if (b.layering) {
      $('minZ').value = b.layering.minZ;
      $('maxZ').value = b.layering.maxZ;
      $('overlap').value = b.layering.overlap;
      $('maxStackPerCell').value = b.layering.maxStackPerCell;
      $('layerFull').checked = b.layering.full !== false;
      $('layerShape').value = b.layering.layerShape || 'full';
      $('interleavePlacement').checked = !!b.layering.interleavePlacement;
      $('layerShapeOptionsJson').value = JSON.stringify(b.layering.layerShapeOptions || {}, null, 2);
    }
  } else {
    applyTemplateDefaults();
  }
  $('explicitCountsJson').value = '{"0":9,"1":9}';
  $('weightsJson').value = '{"0":1,"1":1,"2":1}';
  syncDistUi();
}

function onTotalTripletsAutoChange() {
  syncDistUi();
  debouncedGenerate();
}

function init() {
  fetch('/api/defaults')
    .then((r) => r.json())
    .then((data) => {
      const sel = $('templateId');
      sel.innerHTML = '';
      for (const id of data.templateIds) {
        const o = document.createElement('option');
        o.value = id;
        o.textContent = id;
        sel.appendChild(o);
      }
      applyDefaultsFromApi(data);
      return generate();
    })
    .catch((err) => {
      const line = $('statusLine');
      line.textContent = String(err.message || err);
      line.classList.add('hint--err');
    });

  $('btnGenerate').addEventListener('click', generate);

  $('useLevelSeed').addEventListener('change', () => {
    $('levelSeed').disabled = !$('useLevelSeed').checked;
  });

  $('templateId').addEventListener('change', () => {
    applyTemplateDefaults();
    debouncedGenerate();
  });

  $('layerShape').addEventListener('change', () => {
    const shape = $('layerShape').value;
    $('layerShapeOptionsJson').value = JSON.stringify(LAYER_SHAPE_OPTIONS_DEFAULTS[shape] || {}, null, 2);
    debouncedGenerate();
  });

  $('distMode').addEventListener('change', () => {
    syncDistUi();
    debouncedGenerate();
  });

  $('totalTripletsAuto').addEventListener('change', onTotalTripletsAutoChange);

  const inputs = document.querySelectorAll(
    '.panel--controls input, .panel--controls select, .panel--controls textarea'
  );
  inputs.forEach((el) => {
    if (el.id === 'btnGenerate' || el.id === 'btnCopyBatch') return;
    el.addEventListener('change', debouncedGenerate);
    if (el.type === 'number' || el.tagName === 'TEXTAREA') {
      el.addEventListener('input', debouncedGenerate);
    }
  });

  $('btnCopyBatch').addEventListener('click', async () => {
    try {
      const json = JSON.stringify(readBatchFromForm(), null, 2);
      await navigator.clipboard.writeText(json);
      $('statusLine').textContent = 'Batch JSON copied to clipboard.';
    } catch (e) {
      $('statusLine').textContent = e.message;
      $('statusLine').classList.add('hint--err');
    }
  });
}

init();
