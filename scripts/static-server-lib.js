'use strict';
/**
 * Shared static file server used by playwright-static-server.js (CLI) and
 * capture-screenshot.js (programmatic).
 *
 * createStaticServer(root) — returns an http.Server bound to 127.0.0.1.
 * startStaticServer(root, port) — starts the server, resolves with the
 *   http.Server instance.  If the port is already in use it resolves with a
 *   no-op stub so callers don't need to handle the EADDRINUSE case.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
  '.opus': 'audio/ogg; codecs=opus',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.map':  'application/json',
};

function isInsideRoot(root, resolvedFile) {
  const rel = path.relative(root, resolvedFile);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

function sendFile(filePath, req, res) {
  const ext  = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  res.setHeader('Cache-Control', 'no-store');

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404); res.end(); return;
    }
    if (req.method === 'HEAD') {
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size });
      res.end(); return;
    }
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(filePath)
      .on('error', () => { if (!res.writableEnded) { if (!res.headersSent) res.writeHead(500); res.end(); } })
      .pipe(res);
  });
}

/**
 * Returns an http.Server that serves static files from `root`.
 * Does not call listen() — the caller decides the port and callback.
 */
function createStaticServer(root) {
  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405); res.end(); return;
    }

    let pathname;
    try { pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname; }
    catch { res.writeHead(400); res.end(); return; }
    if (pathname.includes('\0')) { res.writeHead(400); res.end(); return; }

    const decoded   = decodeURIComponent(pathname);
    const candidate = path.normalize(path.join(root, decoded === '/' ? '' : decoded));

    if (!isInsideRoot(root, candidate)) {
      res.writeHead(403); res.end(); return;
    }

    fs.stat(candidate, (err, st) => {
      if (!err && st.isFile()) {
        sendFile(candidate, req, res); return;
      }
      if (!err && st.isDirectory()) {
        const indexPath = path.join(candidate, 'index.html');
        if (!isInsideRoot(root, indexPath)) { res.writeHead(403); res.end(); return; }
        sendFile(indexPath, req, res); return;
      }
      res.writeHead(404); res.end();
    });
  });
}

/**
 * Starts a static server on 127.0.0.1:port.
 * Resolves with the http.Server on success, or with a no-op stub when the
 * port is already in use (so a Playwright-managed server can be reused).
 */
function startStaticServer(root, port) {
  return new Promise((resolve, reject) => {
    const server = createStaticServer(root);
    server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        resolve({ close: () => {} });
      } else {
        reject(err);
      }
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

module.exports = { createStaticServer, startStaticServer };
