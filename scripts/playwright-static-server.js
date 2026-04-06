#!/usr/bin/env node
/**
 * Minimal static file server for Playwright E2E. Binds only 127.0.0.1, no os.networkInterfaces,
 * so it runs under Cursor's agent sandbox (unlike http-server's CLI).
 * Run from project root: node scripts/playwright-static-server.js [port]
 */

const path = require('path');
const { createStaticServer } = require('./static-server-lib');

const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const ROOT = path.resolve(process.cwd());

const server = createStaticServer(ROOT);
server.listen(PORT, '127.0.0.1', () => {
  process.stderr.write(`Playwright static server http://127.0.0.1:${PORT}/\n`);
});
