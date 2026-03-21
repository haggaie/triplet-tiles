#!/usr/bin/env node

/**
 * Local dev server for the interactive level designer.
 * Serves static UI from tools/leveldesigner/ and POST /api/preview runs generate + score.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const { generateOneLevel, mulberry32 } = require('./levelgen/generator');
const { getTemplateCells } = require('./levelgen/templates');
const { scoreLevel } = require('./levelgen/score');

const PORT = Number(process.env.LEVELDESIGN_PORT || 8765);
const STATIC_ROOT = path.join(__dirname, 'leveldesigner');
/** Project root (parent of `tools/`) — for game `style.css` + assets in level designer preview */
const PROJECT_ROOT = path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webp': 'image/webp'
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw.trim()) return resolve({});
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function scoreOptionsFromBody(body) {
  const so = body.scoreOptions || {};
  const o = {
    maxSolveNodes: Number.isFinite(so.maxSolveNodes) ? so.maxSolveNodes : 200000,
    rollouts: Number.isFinite(so.rollouts) ? so.rollouts : 20,
    rolloutSeed: Number.isFinite(so.rolloutSeed) ? so.rolloutSeed : 9001
  };
  if (so.forcedLookahead != null && typeof so.forcedLookahead === 'object') {
    o.forcedLookahead = so.forcedLookahead;
  }
  return o;
}

function previewHandler(body) {
  const batch = body.batch;
  if (!batch || typeof batch !== 'object') {
    throw new Error('Request body must include a "batch" object (see tools/levelgen/config.js).');
  }

  const levelId = Number.isInteger(body.levelId) && body.levelId >= 1 ? body.levelId : 1;
  let levelSeed;
  if (Number.isFinite(body.levelSeed)) {
    levelSeed = body.levelSeed >>> 0;
  } else if (Number.isFinite(body.seed)) {
    // Match generateLevelsFromConfig: one global rng() draw per level before this id.
    const rng = mulberry32(body.seed >>> 0);
    for (let i = 1; i < levelId; i += 1) rng();
    levelSeed = (Math.floor(rng() * 2 ** 31) ^ (levelId * 2654435761)) >>> 0;
  } else {
    levelSeed = (1337 ^ (levelId * 2654435761)) >>> 0;
  }

  const levelRng = mulberry32(levelSeed);
  const level = generateOneLevel(levelRng, batch, levelId);

  const { gridWidth, gridHeight } = level;
  const { templateId, templateParams } = batch;
  const silhouetteCells = getTemplateCells(templateId, templateParams, gridWidth, gridHeight);

  const scoreOpts = scoreOptionsFromBody(body);
  const scored = scoreLevel(level, scoreOpts);

  return {
    levelSeed,
    silhouette: {
      cellCount: silhouetteCells.length,
      cells: silhouetteCells
    },
    level: {
      id: level.id,
      name: level.name,
      gridWidth: level.gridWidth,
      gridHeight: level.gridHeight,
      layout: level.layout,
      layerSilhouettes: level.layerSilhouettes
    },
    score: scored
  };
}

function serveStatic(urlPath, res) {
  const safe = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(STATIC_ROOT, safe === '/' || safe === '' ? 'index.html' : safe);
  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

/** Shared game styles + wood texture (paths in CSS are relative to `/style.css`). */
function serveProjectStatic(urlPath, res) {
  const rel = String(urlPath || '')
    .replace(/^\//, '')
    .replace(/\\/g, '/');
  if (!rel || rel.includes('..')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  const filePath = path.join(PROJECT_ROOT, rel);
  if (!filePath.startsWith(PROJECT_ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && u.pathname === '/api/preview') {
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Invalid JSON body' }));
      return;
    }
    try {
      const payload = previewHandler(body);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, ...payload }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) }));
    }
    return;
  }

  if (req.method === 'GET' && u.pathname === '/api/defaults') {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const config = require(path.join(__dirname, 'levelgen/config.js'));
    const first = config.levels && config.levels[0] ? config.levels[0] : null;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        configSeed: config.seed,
        defaultBatch: first,
        templateIds: [
          'rectangle',
          'diamond',
          'circle',
          'triangle',
          'hexagon',
          'cross',
          'ring',
          't',
          'u',
          'heart',
          'spiral',
          'letter'
        ]
      })
    );
    return;
  }

  if (req.method === 'GET') {
    const p = u.pathname;
    if (
      p === '/style.css' ||
      p.startsWith('/assets/') ||
      p.startsWith('/lib/') ||
      p === '/tile-layering.js'
    ) {
      serveProjectStatic(p, res);
      return;
    }
    serveStatic(u.pathname, res);
    return;
  }

  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, '127.0.0.1', () => {
  process.stderr.write(`Level designer at http://127.0.0.1:${PORT}/\n`);
});
