const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const { solveLevel } = require('../tools/levelgen/solver');

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

  /** One round per move: remove 3 of each type that has >= 3 (matches game's handleMatchingInTray). */
  function removeTriples() {
    const counts = {};
    tray.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    const toRemove = Object.keys(counts).filter(t => counts[t] >= 3);
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
    const type = layout[idx].type;
    insertByShape(type);
    removeTriples();
  }

  return { score, trayLength: tray.length };
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
      const covers = (other, tile) => {
        if (other.z <= tile.z) return false;
        const dx = other.x - tile.x;
        const dy = other.y - tile.y;
        return dx >= -1 && dx <= 0 && dy >= 0 && dy <= 1;
      };
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
    test.setTimeout(5000); // Animations now overlap, so they take 1-2 seconds overall

    const levels = loadGeneratedLevels();
    expect(levels.length).toBeGreaterThanOrEqual(1);
    const level = levels[0];
    const result = solveLevel(level, { mode: 'exact', maxNodes: 250000 });
    expect(result.solvable).toBe(true);
    expect(Array.isArray(result.solution)).toBe(true);
    expect(result.solution.length).toBeGreaterThan(0);

    const { score: expectedScore, trayLength: expectedTrayLength } = simulateSolutionScore(level, result.solution);

    await page.goto('/');
    await page.waitForSelector('#board');
    await page.evaluate(() => {
      window.__tripletTestHooks.resetAllProgress();
    });
    await page.waitForSelector('#board .tile');

    // First generated level is at game level index 2 (0 and 1 are tutorial).
    const gameLevelIndex = 2;
    await page.evaluate(idx => {
      window.__tripletTestHooks.startLevel(idx);
    }, gameLevelIndex);
    await page.waitForSelector('#board .tile');

    // Do NOT set skipAnimationsForTests — we want animations on. Click through the full solution
    // without waiting for animations to finish, to assert that state stays consistent.
    const solutionTileIds = result.solution.map(idx => `t_${gameLevelIndex}_${idx}`);

    // When solution has at least 2 moves: briefly delay after first click so second click gets queued, then assert queued tile style.
    if (solutionTileIds.length >= 2) {
      await page.evaluate(id => window.__tripletTestHooks.clickTileById(id), solutionTileIds[0]);
      await page.waitForTimeout(50);
      await page.evaluate(id => window.__tripletTestHooks.clickTileById(id), solutionTileIds[1]);
      const queuedStyleOk = await page.evaluate(() => {
        const el = document.querySelector('#board .tile.tile-queued');
        if (!el) return { found: false };
        const cs = getComputedStyle(el);
        const transform = cs.transform;
        const hasLift = transform && transform !== 'none';
        const hasShadow = !!(cs.boxShadow && cs.boxShadow !== 'none');
        return { found: true, ok: hasLift && hasShadow, hasLift, hasShadow };
      });
      if (queuedStyleOk.found) {
        expect(queuedStyleOk.ok, `queued tile should have lift and shadow: ${JSON.stringify(queuedStyleOk)}`).toBe(true);
      }
    }

    // Click all solution tiles in quick succession (same as original test); first 0–2 already clicked above if length >= 2.
    const startIndex = solutionTileIds.length >= 2 ? 2 : 0;
    for (let i = startIndex; i < solutionTileIds.length; i += 1) {
      await page.evaluate(id => window.__tripletTestHooks.clickTileById(id), solutionTileIds[i]);
      // Intentionally do not await waitForActionComplete() — click while animations may still be running.
    }

    // Wait for level to complete (win overlay). Each move's animations can be ~1–2s; allow enough time.
    const solutionSteps = result.solution.length;
    const overlayTimeout = Math.max(60000, solutionSteps * 2500);
    await expect(page.locator('#overlay')).toBeVisible({ timeout: overlayTimeout });
    await expect(page.locator('#overlay-title')).toHaveText('Level Complete');

    const actualScore = parseInt(await page.locator('#score-value').textContent(), 10);
    expect(actualScore).toBe(expectedScore);

    const state = await page.evaluate(() => window.__tripletTestHooks.getState());
    expect(state.trayTiles.length).toBe(expectedTrayLength);
    expect(state.isLevelOver).toBe(true);
  });
});

