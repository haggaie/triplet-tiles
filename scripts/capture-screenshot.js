#!/usr/bin/env node
/**
 * Captures a promotional screenshot of the game at a specific level with items pre-loaded in the
 * tray.
 *
 * Usage:
 *   node scripts/capture-screenshot.js [options]
 *
 * Options:
 *   --width=N          Output image width in px  (default: 512)
 *   --height=N         Output image height in px (default: 384)
 *   --output=PATH      Output file path          (default: screenshots/level3.png)
 *   --level=N          Level number to show      (default: 3)
 *   --tray-items=N     Items to pre-load in tray (default: 3)
 *   --port=N           Static server port        (default: 4173)
 *   --no-animations    Skip settle animations    (default: true)
 *
 * The script starts a local static server, launches a headless Chromium browser, loads the game
 * at the requested level, pre-fills the tray with N distinct-type tiles, and saves a screenshot
 * resized to the requested dimensions using sharp.
 */

'use strict';

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { startStaticServer } = require('./static-server-lib');

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------
const argMap = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const eq = a.indexOf('=');
      if (eq === -1) return [a.slice(2), true];
      return [a.slice(2, eq), a.slice(eq + 1)];
    })
);

const WIDTH       = parseInt(argMap.width       ?? '384',  10);
const HEIGHT      = parseInt(argMap.height      ?? '512',  10);
const LEVEL       = parseInt(argMap.level       ?? '3',    10);
const TRAY_ITEMS  = parseInt(argMap['tray-items'] ?? '3',  10);
const PORT        = parseInt(argMap.port        ?? '4173', 10);
const OUTPUT      = argMap.output ?? `screenshots/level${LEVEL}.png`;
const SKIP_ANIM   = argMap['no-animations'] !== false; // default true

const LEVEL_INDEX = LEVEL - 1; // game uses 0-based index

// Viewport: render the game at exactly the target dimensions so everything is visible (no crop).
// With deviceScaleFactor:2 we get a retina-quality 2× raw screenshot that sharp then downscales.
const VIEWPORT_W = WIDTH;
const VIEWPORT_H = HEIGHT;

const PROJECT_ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  const outputPath = path.resolve(PROJECT_ROOT, OUTPUT);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const server = await startStaticServer(PROJECT_ROOT, PORT);
  console.log(`[screenshot] Static server on http://127.0.0.1:${PORT}/`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport:        { width: VIEWPORT_W, height: VIEWPORT_H },
    deviceScaleFactor: 2,        // retina-quality render
    serviceWorkers:  'block',    // prevent SW from serving stale assets
  });
  const page = await context.newPage();

  try {
    console.log(`[screenshot] Loading game…`);
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#board .tile', { timeout: 15_000 });

    // Reset saved progress so state is clean
    await page.evaluate(() => window.__tripletTestHooks.resetAllProgress());
    await page.waitForSelector('#board .tile', { timeout: 10_000 });

    if (SKIP_ANIM) {
      await page.evaluate(() => window.__tripletTestHooks.setSkipAnimations(true));
    }

    console.log(`[screenshot] Starting level ${LEVEL} (index ${LEVEL_INDEX})`);
    await page.evaluate(idx => window.__tripletTestHooks.startLevel(idx), LEVEL_INDEX);
    await page.waitForSelector('#board .tile', { timeout: 10_000 });

    // ------------------------------------------------------------------
    // Pre-fill the tray with TRAY_ITEMS tiles of distinct types.
    // We read the current board state to pick real tile types that exist
    // on this level, then inject them directly via setTrayTilesForTest.
    // This avoids triggering match-3 removal (which happens if you click
    // 3 tiles of the same type).
    // ------------------------------------------------------------------
    if (TRAY_ITEMS > 0) {
      const trayTiles = await page.evaluate((count) => {
        const { boardTiles } = window.__tripletTestHooks.getState();
        const seen = new Set();
        const picked = [];
        for (const t of boardTiles) {
          if (t.removed) continue;
          if (seen.has(t.type)) continue;
          seen.add(t.type);
          picked.push({ id: `screenshot_tray_${t.type}`, type: t.type });
          if (picked.length >= count) break;
        }
        return picked;
      }, TRAY_ITEMS);

      console.log(`[screenshot] Pre-filling tray with ${trayTiles.length} item(s): types [${trayTiles.map(t => t.type).join(', ')}]`);
      await page.evaluate(tiles => window.__tripletTestHooks.setTrayTilesForTest(tiles), trayTiles);

      // Give the DOM a moment to settle after tray update
      await page.waitForTimeout(120);
    }

    // ------------------------------------------------------------------
    // Capture screenshot of the #app element at device-pixel resolution,
    // then resize/cover-crop to the requested output dimensions.
    // ------------------------------------------------------------------
    console.log(`[screenshot] Capturing screenshot…`);
    const rawBuf = await page.locator('#app').screenshot({ type: 'png' });

    // The raw capture is 2× the CSS viewport (deviceScaleFactor:2 = retina quality).
    // Simply downscale to the requested output size.
    const finalBuf = await sharp(rawBuf)
      .resize(WIDTH, HEIGHT, { fit: 'fill' })
      .png({ compressionLevel: 9 })
      .toBuffer();

    fs.writeFileSync(outputPath, finalBuf);
    console.log(`[screenshot] Saved ${WIDTH}×${HEIGHT} screenshot → ${outputPath}`);

  } finally {
    await browser.close();
    server.close?.();
  }
}

run().catch(err => {
  console.error('[screenshot] Error:', err);
  process.exit(1);
});
