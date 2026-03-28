'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const { solveLevel } = require('../tools/levelgen/solver');
const { runTrayGeometryProbe } = require('./helpers/tray-geometry-probe');

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

/**
 * @param {import('@playwright/test').Page} page
 * @param {'en' | 'he'} locale
 */
async function setupGeneratedLevelWithLocale(page, locale) {
  await page.goto('/');
  await page.waitForSelector('#board');
  await page.evaluate(
    loc => {
      window.__tripletTestHooks.resetAllProgress();
      if (loc !== 'en') window.__tripletTestHooks.setLocaleForTest(loc);
    },
    locale
  );
  const expectDir = locale === 'he' ? 'rtl' : 'ltr';
  await expect(page.locator('html')).toHaveAttribute('dir', expectDir);

  await page.waitForSelector('#board .tile');
  await page.evaluate(idx => {
    window.__tripletTestHooks.startLevel(idx);
  }, FIRST_GENERATED_GAME_LEVEL_INDEX);
  await page.waitForSelector('#board .tile');
}

test.describe('Tray geometry — RTL vs LTR', () => {
  for (const locale of ['en', 'he']) {
    test(`no tray tile horizontal teleport during merges (${locale})`, async ({ page }) => {
      test.setTimeout(45000);

      const levels = loadGeneratedLevels();
      const level = levels[0];
      const result = solveLevel(level, { mode: 'exact', maxNodes: 250000 });
      expect(result.solvable).toBe(true);
      expect(result.solution.length).toBeGreaterThanOrEqual(4);

      await setupGeneratedLevelWithLocale(page, locale);

      const solutionTileIds = solutionTileIdsForGameLevel(
        FIRST_GENERATED_GAME_LEVEL_INDEX,
        result.solution
      );
      const probe = await runTrayGeometryProbe(page, solutionTileIds, {
        maxMoves: 4,
        tailMs: 400
      });

      expect(probe.error, probe.error).toBeFalsy();
      expect(probe.frames, 'expected enough animation samples').toBeGreaterThan(20);
      expect(
        probe.teleportDetected,
        probe.teleportDetected
          ? `Tray tile teleport (>${probe.threshold}px between frames): ${JSON.stringify(probe.detail)}`
          : ''
      ).toBe(false);
    });
  }
});
