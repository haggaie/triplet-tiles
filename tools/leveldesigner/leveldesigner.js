/**
 * Interactive level designer client — talks to tools/leveldesign-server.js
 *
 * Full-board preview delegates to `lib/board-view.js` + `lib/tile-types.js` (shared with `game.js`).
 * `tile-layering.js` must load before this module (see index.html).
 */

import { measureBoardLayoutFromFit, mountBoardTilesFill } from '/lib/board-view.js';

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
  pyramid: { pyramidMinNeighbors: 2 },
  shift: { shiftDx: 1, shiftDy: 0 },
  randomErosion: { erosionRate: 0.18, minCellFraction: 0.12, allowShift: true },
  // `footprintZ`: same params, z per layer. `radius`: symmetric radius ladder + z (e.g. diamond pyramid). `thickness`: stroke templates.
  paramSweep: { sweep: 'thickness', minThickness: 1, maxThickness: null }
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

function syncExplicitGridUi() {
  const on = $('explicitGrid').checked;
  const gw = $('gridWidth');
  const gh = $('gridHeight');
  gw.disabled = !on;
  gh.disabled = !on;
  gw.title = on
    ? ''
    : 'Not sent to the generator when inferring; values show the last preview size if available.';
  gh.title = gw.title;
  gw.style.opacity = on ? '' : '0.75';
  gh.style.opacity = on ? '' : '0.75';
}

function applyBatchToForm(b) {
  if (!b || typeof b !== 'object') return;
  $('templateId').value = b.templateId || 'rectangle';
  const gs = b.gridSize;
  const gw = b.gridWidth;
  const gh = b.gridHeight;
  if (Number.isInteger(gw) && Number.isInteger(gh)) {
    $('explicitGrid').checked = true;
    $('gridWidth').value = String(gw);
    $('gridHeight').value = String(gh);
  } else if (Number.isInteger(gs)) {
    $('explicitGrid').checked = true;
    $('gridWidth').value = String(gs);
    $('gridHeight').value = String(gs);
  } else {
    $('explicitGrid').checked = false;
    $('gridWidth').value = '';
    $('gridHeight').value = '';
  }
  syncExplicitGridUi();
  $('tileTypeCount').value = b.tileTypeCount ?? 6;
  $('templateParamsJson').value = JSON.stringify(b.templateParams || {}, null, 2);

  const d = b.distribution || { mode: 'zipf', totalTriplets: 'auto', exponent: 0.5 };
  $('distMode').value = d.mode;
  if (d.mode === 'zipf') {
    $('zipfExponent').value = d.exponent ?? 0.5;
    const tt = d.totalTriplets;
    $('totalTripletsAuto').checked = tt === 'auto' || tt == null;
    $('totalTriplets').value = typeof tt === 'number' ? tt : 18;
  } else if (d.mode === 'weightedTriplets') {
    $('weightsJson').value = JSON.stringify(d.weights || {}, null, 2);
    const tt = d.totalTriplets;
    $('totalTripletsAuto').checked = tt === 'auto' || tt == null;
    $('totalTriplets').value = typeof tt === 'number' ? tt : 18;
  } else if (d.mode === 'explicitCounts') {
    $('explicitCountsJson').value = JSON.stringify(d.explicitCounts || {}, null, 2);
  }

  const ly = b.layering || {};
  $('minZ').value = ly.minZ ?? 0;
  $('maxZ').value = ly.maxZ ?? 0;
  $('overlap').value = ly.overlap || 'medium';
  $('maxStackPerCell').value = ly.maxStackPerCell ?? 3;
  $('layerFull').checked = ly.full !== false;
  $('layerShape').value = ly.layerShape || 'full';
  $('interleavePlacement').checked = !!ly.interleavePlacement;
  $('layerShapeOptionsJson').value = JSON.stringify(ly.layerShapeOptions || {}, null, 2);

  syncDistUi();
}

function mergeFormIntoBatch(base) {
  const f = readBatchFromForm();
  const out = {
    ...base,
    templateId: f.templateId,
    templateParams: f.templateParams,
    tileTypeCount: f.tileTypeCount,
    distribution: f.distribution,
    layering: f.layering
  };
  if ($('explicitGrid').checked) {
    out.gridWidth = f.gridWidth;
    out.gridHeight = f.gridHeight;
  } else {
    delete out.gridWidth;
    delete out.gridHeight;
    delete out.gridSize;
  }
  return out;
}

function getBatchForPreview() {
  const raw = $('batchJson').value.trim();
  if (!raw) {
    return readBatchFromForm();
  }
  try {
    const base = JSON.parse(raw);
    if (!base || typeof base !== 'object') throw new Error('batch must be an object');
    return mergeFormIntoBatch(base);
  } catch (e) {
    throw new Error(`batch JSON: ${e.message}`);
  }
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

  const explicit = $('explicitGrid').checked;
  let gridWidth;
  let gridHeight;
  if (explicit) {
    gridWidth = parseInt($('gridWidth').value, 10);
    gridHeight = parseInt($('gridHeight').value, 10);
    if (!Number.isInteger(gridWidth) || gridWidth < 5) {
      throw new Error('gridWidth must be an integer ≥ 5 when using fixed board size');
    }
    if (!Number.isInteger(gridHeight) || gridHeight < 5) {
      throw new Error('gridHeight must be an integer ≥ 5 when using fixed board size');
    }
  }

  return {
    templateId,
    templateParams,
    ...(explicit ? { gridWidth, gridHeight } : {}),
    tileTypeCount,
    distribution,
    layering
  };
}

function isSweepBatchFromBatchJson() {
  const raw = $('batchJson').value.trim();
  if (!raw) return false;
  try {
    const b = JSON.parse(raw);
    return b?.batchVariation?.mode === 'sweep';
  } catch {
    return false;
  }
}

let sweepUiTimer;
function debouncedUpdateSweepUi() {
  clearTimeout(sweepUiTimer);
  sweepUiTimer = setTimeout(updateSweepUi, 300);
}

function updateSweepUi() {
  const sweep = isSweepBatchFromBatchJson();
  const mountRng = $('configBatchSelectMountRng');
  const mountSidebar = $('configBatchSelectMountSidebar');
  const shell = $('configBatchSelectShell');
  const batchIdxField = $('batchIndexField');
  if (!mountRng || !mountSidebar || !shell || !batchIdxField) return;

  batchIdxField.hidden = sweep;
  batchIdxField.style.display = sweep ? 'none' : '';

  shell.classList.toggle('field--block', !sweep);

  if (sweep) {
    mountRng.hidden = false;
    mountRng.style.display = '';
    mountSidebar.style.display = 'none';
    mountRng.appendChild(shell);
  } else {
    mountRng.hidden = true;
    mountRng.style.display = 'none';
    mountSidebar.style.display = '';
    mountSidebar.appendChild(shell);
  }
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
  const batch = getBatchForPreview();
  const body = {
    batch,
    batchIndex: parseInt($('batchIndex').value, 10) || 0,
    slotIndex: parseInt($('slotIndex').value, 10) || 0,
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
      $('batchMetaLine').textContent = '';
      renderMetrics($('metricsSummary'), $('metricsBody'), null);
      $('fullLevelMount').innerHTML = '';
      $('layerSilhouettesMount').textContent = '';
      return;
    }

    status.textContent = `OK · levelSeed ${data.levelSeed} · silhouette cells ${data.silhouette.cellCount} · layout tiles ${data.level.layout.length}`;

    if (data.batchMeta) {
      const m = data.batchMeta;
      const sweep = isSweepBatchFromBatchJson();
      const biPart = sweep ? '' : ` · batch index ${m.batchIndex}`;
      $('batchMetaLine').textContent = `Slots in batch: ${m.slotCount} · slot ${m.slotIndex}${biPart}${
        m.hadBatchVariation ? ' · batchVariation applied' : ''
      }`;
      $('slotIndex').value = String(m.slotIndex);
      const maxSlot = Math.max(0, m.slotCount - 1);
      $('slotIndex').setAttribute('max', String(maxSlot));
    } else {
      $('batchMetaLine').textContent = '';
    }

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

    if (!$('explicitGrid').checked) {
      $('gridWidth').value = String(data.level.gridWidth);
      $('gridHeight').value = String(data.level.gridHeight);
    }
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
    $('batchJson').value = JSON.stringify(data.defaultBatch, null, 2);
    applyBatchToForm(data.defaultBatch);
  } else {
    applyTemplateDefaults();
    $('batchJson').value = JSON.stringify(readBatchFromForm(), null, 2);
  }
  if (!data.defaultBatch) {
    $('explicitCountsJson').value = '{"0":9,"1":9}';
    $('weightsJson').value = '{"0":1,"1":1,"2":1}';
  }
  syncDistUi();
  updateSweepUi();
}

async function loadConfigBatchSelect() {
  const sel = $('configBatchSelect');
  try {
    const r = await fetch('/api/config');
    const cfg = await r.json();
    const levels = cfg.levels || [];
    sel.innerHTML = '';
    const o0 = document.createElement('option');
    o0.value = '';
    o0.textContent = `— ${levels.length} batch(es) in config.js —`;
    sel.appendChild(o0);
    levels.forEach((batch, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      const tid = batch.templateId || '?';
      o.textContent = `levels[${i}] ${tid}`;
      sel.appendChild(o);
    });
  } catch (_) {
    sel.innerHTML = '';
    const o0 = document.createElement('option');
    o0.value = '';
    o0.textContent = '— /api/config unavailable —';
    sel.appendChild(o0);
  }
  updateSweepUi();
}

function onTotalTripletsAutoChange() {
  syncDistUi();
  debouncedGenerate();
}

function init() {
  loadConfigBatchSelect();
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

  $('configBatchSelect').addEventListener('change', () => {
    const v = $('configBatchSelect').value;
    if (v === '') return;
    fetch('/api/config')
      .then((r) => r.json())
      .then((cfg) => {
        const batch = cfg.levels[parseInt(v, 10)];
        if (!batch) return;
        $('batchIndex').value = v;
        $('batchJson').value = JSON.stringify(batch, null, 2);
        applyBatchToForm(batch);
        updateSweepUi();
        $('slotIndex').value = '0';
        generate();
      })
      .catch((e) => {
        $('statusLine').textContent = String(e.message || e);
        $('statusLine').classList.add('hint--err');
      });
  });

  $('btnSlotPrev').addEventListener('click', () => {
    const v = Math.max(0, (parseInt($('slotIndex').value, 10) || 0) - 1);
    $('slotIndex').value = String(v);
    generate();
  });
  $('btnSlotNext').addEventListener('click', () => {
    const maxAttr = parseInt($('slotIndex').getAttribute('max'), 10);
    const cur = parseInt($('slotIndex').value, 10) || 0;
    const next = Number.isFinite(maxAttr) ? Math.min(maxAttr, cur + 1) : cur + 1;
    $('slotIndex').value = String(next);
    generate();
  });

  $('btnJsonToForm').addEventListener('click', () => {
    try {
      const raw = $('batchJson').value.trim();
      if (!raw) throw new Error('empty JSON');
      const b = JSON.parse(raw);
      applyBatchToForm(b);
      updateSweepUi();
      $('statusLine').textContent = 'Applied JSON to form.';
      $('statusLine').classList.remove('hint--err');
    } catch (e) {
      $('statusLine').textContent = e.message;
      $('statusLine').classList.add('hint--err');
    }
  });

  $('btnFormToJson').addEventListener('click', () => {
    try {
      const raw = $('batchJson').value.trim();
      let base = {};
      if (raw) {
        try {
          base = JSON.parse(raw);
        } catch (_) {
          base = {};
        }
      }
      const merged = mergeFormIntoBatch(base);
      $('batchJson').value = JSON.stringify(merged, null, 2);
      updateSweepUi();
      $('statusLine').textContent = 'Merged form into batch JSON.';
      $('statusLine').classList.remove('hint--err');
    } catch (e) {
      $('statusLine').textContent = e.message;
      $('statusLine').classList.add('hint--err');
    }
  });

  $('useLevelSeed').addEventListener('change', () => {
    $('levelSeed').disabled = !$('useLevelSeed').checked;
  });

  $('explicitGrid').addEventListener('change', () => {
    if ($('explicitGrid').checked) {
      if (!$('gridWidth').value.trim()) $('gridWidth').value = '7';
      if (!$('gridHeight').value.trim()) $('gridHeight').value = '7';
    }
    syncExplicitGridUi();
    debouncedGenerate();
  });
  syncExplicitGridUi();

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

  const skipPreviewIds = new Set([
    'batchJson',
    'configBatchSelect',
    'btnGenerate',
    'btnCopyBatch',
    'btnSlotPrev',
    'btnSlotNext',
    'btnJsonToForm',
    'btnFormToJson',
    'explicitGrid'
  ]);
  const inputs = document.querySelectorAll(
    '.panel--controls input, .panel--controls select, .panel--controls textarea'
  );
  inputs.forEach((el) => {
    if (skipPreviewIds.has(el.id)) return;
    el.addEventListener('change', debouncedGenerate);
    if (el.type === 'number' || (el.tagName === 'TEXTAREA' && el.id !== 'batchJson')) {
      el.addEventListener('input', debouncedGenerate);
    }
  });

  $('batchJson').addEventListener('change', () => {
    debouncedUpdateSweepUi();
    debouncedGenerate();
  });
  $('batchJson').addEventListener('input', debouncedUpdateSweepUi);

  $('btnCopyBatch').addEventListener('click', async () => {
    try {
      const json = JSON.stringify(getBatchForPreview(), null, 2);
      await navigator.clipboard.writeText(json);
      $('statusLine').textContent = 'Batch JSON copied to clipboard (form merged into JSON when present).';
      $('statusLine').classList.remove('hint--err');
    } catch (e) {
      $('statusLine').textContent = e.message;
      $('statusLine').classList.add('hint--err');
    }
  });
}

init();
