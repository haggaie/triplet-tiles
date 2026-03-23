'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const { solveLevel } = require('../tools/levelgen/solver');
const { runTemporalOscillationProbe } = require('./helpers/flicker-temporal');

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

test.describe('Animation flicker — temporal (computed style)', () => {
  test('no opacity/visibility oscillation during first moves', async ({ page }) => {
    test.setTimeout(45000);

    const levels = loadGeneratedLevels();
    const level = levels[0];
    const result = solveLevel(level, { mode: 'exact', maxNodes: 250000 });
    expect(result.solvable).toBe(true);
    expect(result.solution.length).toBeGreaterThanOrEqual(4);

    await setupGeneratedLevelForFlicker(page);

    const solutionTileIds = solutionTileIdsForGameLevel(FIRST_GENERATED_GAME_LEVEL_INDEX, result.solution);
    const probe = await runTemporalOscillationProbe(page, solutionTileIds, { maxMoves: 4, tailMs: 320 });

    expect(probe.samples).toBeGreaterThan(10);
    expect(
      probe.oscillationDetected,
      probe.oscillationDetected
        ? `Temporal oscillation: ${JSON.stringify(probe.samplesDetail)}`
        : undefined
    ).toBe(false);
  });
});
