'use strict';

/**
 * Optional pixel-level guard: compares downscaled greyscale #board screenshots while two
 * animated moves play. Enable with RUN_FLICKER_VISUAL=1 (skipped in default CI).
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const { solveLevel } = require('../tools/levelgen/solver');

const FIRST_GENERATED_GAME_LEVEL_INDEX = 2;

function loadGeneratedLevels() {
  const projectRoot = path.resolve(__dirname, '..');
  const filePath = path.resolve(projectRoot, 'levels.generated.js');
  const src = fs.readFileSync(filePath, 'utf8');
  const marker = 'window.__TRIPLET_GENERATED_LEVELS__ = ';
  const start = src.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const jsonStart = start + marker.length;
  const jsonEnd = src.lastIndexOf(';\n');
  expect(jsonEnd).toBeGreaterThan(jsonStart);
  const jsonText = src.slice(jsonStart, jsonEnd).trim();
  return JSON.parse(jsonText);
}

function solutionTileIdsForGameLevel(gameLevelIndex, solution) {
  return solution.map(idx => `t_${gameLevelIndex}_${idx}`);
}

async function setupGeneratedLevelForFlicker(page) {
  await page.goto('/');
  await page.waitForSelector('#board');
  await page.evaluate(() => window.__tripletTestHooks.resetAllProgress());
  await page.waitForSelector('#board .tile');
  await page.evaluate(idx => {
    window.__tripletTestHooks.startLevel(idx);
  }, FIRST_GENERATED_GAME_LEVEL_INDEX);
  await page.waitForSelector('#board .tile');
}

async function meanAbsDiffGrey64(buf1, buf2) {
  const [a, b] = await Promise.all([
    sharp(buf1).greyscale().resize(64, 64).raw().toBuffer(),
    sharp(buf2).greyscale().resize(64, 64).raw().toBuffer()
  ]);
  let s = 0;
  for (let i = 0; i < a.length; i += 1) {
    s += Math.abs(a[i] - b[i]);
  }
  return s / a.length;
}

test.describe('Animation flicker — visual (optional)', () => {
  test('no rapid board luminance spike oscillation during two animated moves', async ({ page }) => {
    test.skip(process.env.RUN_FLICKER_VISUAL !== '1', 'set RUN_FLICKER_VISUAL=1 to run this check');
    test.setTimeout(45000);

    const levels = loadGeneratedLevels();
    const level = levels[0];
    const result = solveLevel(level, { mode: 'exact', maxNodes: 250000 });
    expect(result.solvable).toBe(true);
    expect(result.solution.length).toBeGreaterThanOrEqual(2);

    await setupGeneratedLevelForFlicker(page);

    const solutionTileIds = solutionTileIdsForGameLevel(FIRST_GENERATED_GAME_LEVEL_INDEX, result.solution);

    const screenshots = [];
    let captureDone = false;
    const captureLoop = (async () => {
      while (!captureDone) {
        screenshots.push(await page.locator('#board').screenshot());
        await page.waitForTimeout(48);
      }
    })();

    await page.evaluate(async tileIds => {
      const h = window.__tripletTestHooks;
      h.setSkipAnimations(false);
      await h.clickTileById(tileIds[0]);
      await h.waitForActionComplete();
      await h.clickTileById(tileIds[1]);
      await h.waitForActionComplete();
    }, solutionTileIds);

    await page.waitForTimeout(450);
    captureDone = true;
    await captureLoop;

    expect(screenshots.length).toBeGreaterThan(8);

    const diffs = [];
    for (let i = 1; i < screenshots.length; i += 1) {
      diffs.push(await meanAbsDiffGrey64(screenshots[i - 1], screenshots[i]));
    }

    let spikeOscillations = 0;
    const high = 22;
    const low = 7;
    for (let i = 0; i + 2 < diffs.length; i += 1) {
      if (diffs[i] > high && diffs[i + 1] < low && diffs[i + 2] > high) {
        spikeOscillations += 1;
      }
    }

    expect(
      spikeOscillations,
      `rapid high-low-high luminance diff pattern (possible flicker); diffs sample: ${JSON.stringify(diffs.slice(0, 24))}`
    ).toBe(0);
  });
});
