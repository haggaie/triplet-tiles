#!/usr/bin/env node
/**
 * Minimal static file server for Playwright E2E. Binds only 127.0.0.1, no os.networkInterfaces,
 * so it runs under Cursor's agent sandbox (unlike http-server's CLI).
 * Run from project root: node scripts/playwright-static-server.js [port]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const ROOT = path.resolve(process.cwd());

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.map': 'application/json'
};

function isInsideRoot(resolvedFile) {
  const rel = path.relative(ROOT, resolvedFile);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

function sendFile(filePath, req, res) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  res.setHeader('Cache-Control', 'no-store');

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404);
      res.end();
      return;
    }
    if (req.method === 'HEAD') {
      res.writeHead(200, {
        'Content-Type': type,
        'Content-Length': st.size
      });
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(filePath)
      .on('error', () => {
        if (!res.writableEnded) {
          if (!res.headersSent) res.writeHead(500);
          res.end();
        }
      })
      .pipe(res);
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end();
    return;
  }

  let pathname;
  try {
    pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  if (pathname.includes('\0')) {
    res.writeHead(400);
    res.end();
    return;
  }

  const decoded = decodeURIComponent(pathname);
  const candidate = path.normalize(path.join(ROOT, decoded === '/' ? '' : decoded));

  if (!isInsideRoot(candidate)) {
    res.writeHead(403);
    res.end();
    return;
  }

  fs.stat(candidate, (err, st) => {
    if (!err && st.isFile()) {
      sendFile(candidate, req, res);
      return;
    }
    if (!err && st.isDirectory()) {
      const indexPath = path.join(candidate, 'index.html');
      if (!isInsideRoot(indexPath)) {
        res.writeHead(403);
        res.end();
        return;
      }
      return sendFile(indexPath, req, res);
    }
    res.writeHead(404);
    res.end();
  });
});

server.listen(PORT, '127.0.0.1', () => {
  process.stderr.write(`Playwright static server http://127.0.0.1:${PORT}/\n`);
});
