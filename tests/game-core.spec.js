const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const { solveLevel } = require('../tools/levelgen/solver');
const { runStyleChurnProbe } = require('./helpers/flicker-style-churn');

/** Must match `TILE_TYPES.length` in `game.js` — same rules as `normalizeLevelTileType` (integer indices in sim). */
const GAME_TILE_TYPE_COUNT = 12;

function normalizeLevelTileTypeForTest(type) {
  if (typeof type === 'number' && Number.isInteger(type) && type >= 0 && type < GAME_TILE_TYPE_COUNT) {
    return type;
  }
  if (typeof type === 'string' && /^\d+$/.test(type)) {
    const idx = parseInt(type, 10);
    if (idx >= 0 && idx < GAME_TILE_TYPE_COUNT) return idx;
  }
  return type;
}

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

/**
 * Simulates applying a solution (array of layout indices) to a level and returns
 * the expected score and final tray length. Mirrors game logic: insert by shape, remove triples.
 */
function simulateSolutionScore(level, solution) {
  const layout = level.layout;
  let tray = [];
  let score = 0;

  function insertByShape(type) {
    let insertIndex = tray.length;
    for (let i = tray.length - 1; i >= 0; i -= 1) {
      if (tray[i] === type) {
        insertIndex = i + 1;
        break;
      }
    }
    tray.splice(insertIndex, 0, type);
  }

  /** One round per move: remove 3 of each type that has >= 3 (matches `getTripleRemovalTypeOrder` + handleMatchingInTray). */
  function removeTriples() {
    const cMap = new Map();
    tray.forEach(t => {
      cMap.set(t, (cMap.get(t) || 0) + 1);
    });
    const seen = new Set();
    const toRemove = [];
    for (const t of tray) {
      if (seen.has(t)) continue;
      seen.add(t);
      if ((cMap.get(t) || 0) >= 3) toRemove.push(t);
    }
    for (const type of toRemove) {
      let removed = 0;
      tray = tray.filter(t => {
        if (t === type && removed < 3) {
          removed += 1;
          return false;
        }
        return true;
      });
      score += 30;
    }
  }

  for (const idx of solution) {
    const type = normalizeLevelTileTypeForTest(layout[idx].type);
    insertByShape(type);
    removeTriples();
  }

  return { score, trayLength: tray.length };
}

/** Number of solution moves through the first tray triple removal (score increases). */
function movesThroughFirstCombine(level, solution) {
  const layout = level.layout;
  let tray = [];
  let score = 0;

  function insertByShape(type) {
    let insertIndex = tray.length;
    for (let i = tray.length - 1; i >= 0; i -= 1) {
      if (tray[i] === type) {
        insertIndex = i + 1;
        break;
      }
    }
    tray.splice(insertIndex, 0, type);
  }

  function removeTriples() {
    const cMap = new Map();
    tray.forEach(t => {
      cMap.set(t, (cMap.get(t) || 0) + 1);
    });
    const seen = new Set();
    const toRemove = [];
    for (const t of tray) {
      if (seen.has(t)) continue;
      seen.add(t);
      if ((cMap.get(t) || 0) >= 3) toRemove.push(t);
    }
    for (const type of toRemove) {
      let removed = 0;
      tray = tray.filter(t => {
        if (t === type && removed < 3) {
          removed += 1;
          return false;
        }
        return true;
      });
      score += 30;
    }
  }

  for (let i = 0; i < solution.length; i += 1) {
    const scoreBefore = score;
    const type = normalizeLevelTileTypeForTest(layout[solution[i]].type);
    insertByShape(type);
    removeTriples();
    if (score > scoreBefore) {
      return i + 1;
    }
  }
  return solution.length;
}

/** First entry in `levels.generated.js` is played at this game level index (after tutorials). */
const FIRST_GENERATED_GAME_LEVEL_INDEX = 2;

function loadFirstGeneratedLevelSolverExpectations() {
  const levels = loadGeneratedLevels();
  expect(levels.length).toBeGreaterThanOrEqual(1);
  const level = levels[0];
  const result = solveLevel(level, { mode: 'exact', maxNodes: 250000 });
  expect(result.solvable).toBe(true);
  expect(Array.isArray(result.solution)).toBe(true);
  expect(result.solution.length).toBeGreaterThan(0);
  const { score: expectedScore, trayLength: expectedTrayLength } = simulateSolutionScore(level, result.solution);
  return { result, expectedScore, expectedTrayLength };
}

function solutionTileIdsForGameLevel(gameLevelIndex, solution) {
  return solution.map(idx => `t_${gameLevelIndex}_${idx}`);
}

async function resetAndStartFirstGeneratedLevel(page, { skipAnimations }) {
  await page.goto('/');
  await page.waitForSelector('#board');
  await page.evaluate(skip => {
    window.__tripletTestHooks.resetAllProgress();
    window.__tripletTestHooks.setSkipAnimations(skip);
  }, skipAnimations);
  await page.waitForSelector('#board .tile');
  await page.evaluate(idx => {
    window.__tripletTestHooks.startLevel(idx);
  }, FIRST_GENERATED_GAME_LEVEL_INDEX);
  await page.waitForSelector('#board .tile');
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

async function expectWinOverlayMatchesSolution(page, expectedScore, expectedTrayLength, overlayTimeout) {
  const visibleOpts = overlayTimeout != null ? { timeout: overlayTimeout } : {};
  await expect(page.locator('#overlay')).toBeVisible(visibleOpts);
  await expect(page.locator('#overlay-title')).toHaveText('Level Complete');
  const actualScore = parseInt(await page.locator('#score-value').textContent(), 10);
  expect(actualScore).toBe(expectedScore);
  const state = await page.evaluate(() => window.__tripletTestHooks.getState());
  expect(state.trayTiles.length).toBe(expectedTrayLength);
  expect(state.isLevelOver).toBe(true);
}

async function resetToLevel1(page) {
  await page.goto('/');
  await page.waitForSelector('#board');
  await page.evaluate(() => {
    window.__tripletTestHooks.resetAllProgress();
  });
  await page.waitForSelector('#board .tile');
}

test.describe('Triplet Tiles - Core Mechanics', () => {
  test('loads Level 1 with empty tray and score 0', async ({ page }) => {
    await resetToLevel1(page);

    await expect(page.locator('#level-label')).toHaveText(/Level 1:/);
    await expect(page.locator('#score-value')).toHaveText('0');
    await expect(page.locator('.tray-slot .tray-tile')).toHaveCount(0);
  });

  test('matching three identical tiles clears them from tray and awards score', async ({ page }) => {
    await resetToLevel1(page);

    // Find any tile type with at least 3 tappable tiles, then click 3 of them.
    const idsToClick = await page.evaluate(() => {
      const hooks = window.__tripletTestHooks;
      const tappables = hooks.getTappableTiles();
      const byType = {};
      for (const t of tappables) {
        if (!byType[t.type]) byType[t.type] = [];
        byType[t.type].push(t.id);
      }
      const entry = Object.entries(byType).find(([, ids]) => ids.length >= 3);
      if (!entry) return [];
      return entry[1].slice(0, 3);
    });
    expect(idsToClick.length).toBe(3);

    for (const id of idsToClick) {
      await page.evaluate(tileId => {
        window.__tripletTestHooks.clickTileById(tileId);
      }, id);
      await page.evaluate(() => window.__tripletTestHooks.waitForActionComplete());
    }

    // After matching 3 tiles, tray should be empty and score should be 30.
    await expect(page.locator('.tray-slot .tray-tile')).toHaveCount(0);
    await expect(page.locator('#score-value')).toHaveText('30');

    // Internal stat tilesClearedTotal should also increase by 3.
    const tilesClearedTotal = await page.evaluate(() => {
      return window.__tripletTestHooks.getState().stats.tilesClearedTotal;
    });
    expect(tilesClearedTotal).toBeGreaterThanOrEqual(3);
  });

  test('tray overflow triggers loss overlay', async ({ page }) => {
    await resetToLevel1(page);

    // Fill tray with 7 non-matching test tiles so no auto-match clears them.
    await page.evaluate(() => {
      const hooks = window.__tripletTestHooks;
      hooks.setTrayTilesForTest(
        Array.from({ length: 7 }).map((_, index) => ({
          id: `overflow_${index}`,
          type: `test_type_${index}`
        }))
      );
    });

    // Ensure there is at least one tappable tile on the board.
    await page.waitForSelector('#board .tile.tappable');

    // Clicking any tappable tile when tray has 7 tiles should cause a loss.
    await page.locator('#board .tile.tappable').first().click();

    await expect(page.locator('#overlay')).toBeVisible();
    await expect(page.locator('#overlay-title')).toHaveText('Level Failed');
    const reasonText = await page.locator('#overlay-message').textContent();
    expect(reasonText || '').toContain('tray is full');
  });

  test('tiles become tappable only after covering tiles are removed (layering)', async ({ page }) => {
    await resetToLevel1(page);

    // Find a covering pair (above covers below) using the runtime coverage footprint.
    // Require that above is the ONLY tile covering below, so after removal below becomes tappable.
    const pair = await page.evaluate(() => {
      const hooks = window.__tripletTestHooks;
      const covers = hooks.tileCovers;
      const maxLevelsToTry = 10;
      for (let levelIndex = 0; levelIndex < maxLevelsToTry; levelIndex += 1) {
        hooks.startLevel(levelIndex);
        const tiles = hooks.getState().boardTiles;
        for (const below of tiles) {
          for (const above of tiles) {
            if (!covers(above, below)) continue;
            // Only accept if no other tile covers below (so removing above uncovers below).
            const otherCoverer = tiles.find(
              o => o.id !== above.id && covers(o, below)
            );
            if (!otherCoverer) {
              return { belowId: below.id, aboveId: above.id };
            }
          }
        }
      }
      return { belowId: null, aboveId: null };
    });
    const { belowId, aboveId } = pair;

    expect(aboveId).toBeTruthy();
    expect(belowId).toBeTruthy();

    // Initially, only the above tile should be tappable.
    const initialTappableIds = await page.evaluate(() => {
      return window.__tripletTestHooks.getTappableTiles().map(t => t.id);
    });
    expect(initialTappableIds).toContain(aboveId);
    expect(initialTappableIds).not.toContain(belowId);

    // Click the above tile via hooks, simulating a board click.
    await page.evaluate(id => {
      window.__tripletTestHooks.clickTileById(id);
    }, aboveId);
    await page.evaluate(() => window.__tripletTestHooks.waitForActionComplete());

    // After removing the above tile, the below tile should now be tappable.
    const laterTappableIds = await page.evaluate(() => {
      return window.__tripletTestHooks.getTappableTiles().map(t => t.id);
    });
    expect(laterTappableIds).toContain(belowId);
  });

  test('clicking through solution during animations keeps state consistent with solution', async ({ page }) => {
    const { result, expectedScore, expectedTrayLength } = loadFirstGeneratedLevelSolverExpectations();
    const solutionSteps = result.solution.length;
    // Animations on: do not await waitForActionComplete per move (see ANIMATIONS.md — clicks during fly use snap/queue).
    // Yield the event loop between hook calls so timers / animation frames can run; strictly synchronous bursts can deadlock or mis-order vs the solver.
    test.setTimeout(Math.max(120000, solutionSteps * 2000 + 30000));

    await resetAndStartFirstGeneratedLevel(page, { skipAnimations: false });

    const solutionTileIds = solutionTileIdsForGameLevel(FIRST_GENERATED_GAME_LEVEL_INDEX, result.solution);

    const yieldMs = 0;
    const probe = await page.evaluate(
      async ({ ids, yieldDelay }) => {
        const h = window.__tripletTestHooks;
        const sleep = ms => new Promise(r => setTimeout(r, ms));

        let queuedStyleOk = { found: false };
        for (let i = 0; i < ids.length; i += 1) {
          h.clickTileById(ids[i]);
          if (i === 0 && ids.length >= 2) {
            await sleep(50);
            continue;
          }
          if (i === 1 && ids.length >= 2) {
            const el = document.querySelector('#board .tile.tile-queued');
            if (el) {
              const cs = getComputedStyle(el);
              const transform = cs.transform;
              const hasLift = transform && transform !== 'none';
              const hasShadow = !!(cs.boxShadow && cs.boxShadow !== 'none');
              queuedStyleOk = { found: true, ok: hasLift && hasShadow, hasLift, hasShadow };
            }
          }
          if (i < ids.length - 1) {
            await sleep(yieldDelay);
          }
        }
        return { queuedStyleOk };
      },
      { ids: solutionTileIds, yieldDelay: yieldMs }
    );

    if (probe.queuedStyleOk.found) {
      expect(
        probe.queuedStyleOk.ok,
        `queued tile should have lift and shadow: ${JSON.stringify(probe.queuedStyleOk)}`
      ).toBe(true);
    }

    const overlayTimeout = Math.max(60000, solutionSteps * 2500);
    await expectWinOverlayMatchesSolution(page, expectedScore, expectedTrayLength, overlayTimeout);
  });

  test('full solver solution with animations skipped completes with matching score', async ({ page }) => {
    const { result, expectedScore, expectedTrayLength } = loadFirstGeneratedLevelSolverExpectations();
    await resetAndStartFirstGeneratedLevel(page, { skipAnimations: true });

    const solutionTileIds = solutionTileIdsForGameLevel(FIRST_GENERATED_GAME_LEVEL_INDEX, result.solution);
    for (const id of solutionTileIds) {
      await page.evaluate(tileId => {
        window.__tripletTestHooks.clickTileById(tileId);
      }, id);
      await page.evaluate(() => window.__tripletTestHooks.waitForActionComplete());
    }

    await expectWinOverlayMatchesSolution(page, expectedScore, expectedTrayLength);
  });

  test('no flicker during tile interaction animations (first two moves)', async ({ page }) => {
    test.setTimeout(30000);

    const levels = loadGeneratedLevels();
    expect(levels.length).toBeGreaterThanOrEqual(1);
    const level = levels[0];
    const result = solveLevel(level, { mode: 'exact', maxNodes: 250000 });
    expect(result.solvable).toBe(true);
    expect(Array.isArray(result.solution)).toBe(true);
    expect(result.solution.length).toBeGreaterThanOrEqual(2);

    await setupGeneratedLevelForFlicker(page);

    const solutionTileIds = solutionTileIdsForGameLevel(FIRST_GENERATED_GAME_LEVEL_INDEX, result.solution);
    const flickerResult = await runStyleChurnProbe(page, solutionTileIds, { maxMoves: 2 });

    expect(flickerResult.error).toBeUndefined();
    expect(
      flickerResult.flickerDetected,
      flickerResult.flickerDetected
        ? `Flicker detected: same element had multiple style changes in one frame (visibility/opacity). Sample: ${JSON.stringify(flickerResult.offending)}`
        : undefined
    ).toBe(false);
  });

  test('no style-churn flicker through first tray combine', async ({ page }) => {
    test.setTimeout(60000);

    const levels = loadGeneratedLevels();
    const level = levels[0];
    const result = solveLevel(level, { mode: 'exact', maxNodes: 250000 });
    expect(result.solvable).toBe(true);
    const k = movesThroughFirstCombine(level, result.solution);
    expect(k).toBeGreaterThanOrEqual(3);

    await setupGeneratedLevelForFlicker(page);

    const solutionTileIds = solutionTileIdsForGameLevel(FIRST_GENERATED_GAME_LEVEL_INDEX, result.solution);
    const flickerResult = await runStyleChurnProbe(page, solutionTileIds, { maxMoves: k });

    expect(flickerResult.error).toBeUndefined();
    expect(
      flickerResult.flickerDetected,
      flickerResult.flickerDetected
        ? `Flicker after combine path: ${JSON.stringify(flickerResult.offending)}`
        : undefined
    ).toBe(false);
  });

  test('no style-churn flicker during extended picks (tray shift)', async ({ page }) => {
    test.setTimeout(90000);

    const levels = loadGeneratedLevels();
    const level = levels[0];
    const result = solveLevel(level, { mode: 'exact', maxNodes: 250000 });
    expect(result.solvable).toBe(true);
    const throughCombine = movesThroughFirstCombine(level, result.solution);
    const maxMoves = Math.min(result.solution.length, Math.max(throughCombine + 4, 8));

    await setupGeneratedLevelForFlicker(page);

    const solutionTileIds = solutionTileIdsForGameLevel(FIRST_GENERATED_GAME_LEVEL_INDEX, result.solution);
    const flickerResult = await runStyleChurnProbe(page, solutionTileIds, { maxMoves });

    expect(flickerResult.error).toBeUndefined();
    expect(
      flickerResult.flickerDetected,
      flickerResult.flickerDetected
        ? `Flicker during extended tray moves: ${JSON.stringify(flickerResult.offending)}`
        : undefined
    ).toBe(false);
  });
});

