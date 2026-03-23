const { test, expect } = require('@playwright/test');

async function resetToLevel1(page) {
  await page.goto('/');
  await page.waitForSelector('#board');
  await page.evaluate(() => {
    window.__tripletTestHooks.resetAllProgress();
  });
  await page.waitForSelector('#board .tile');
}

/** Plays Level 1 until the board is cleared and win overlay appears. Requires setSkipAnimations(true) to be set first. */
async function playLevelToWin(page) {
  await page.evaluate(() => {
    const hooks = window.__tripletTestHooks;
    let safety = 200;
    while (
      safety-- > 0 &&
      hooks.getState().boardTiles.some(t => !t.removed) &&
      !hooks.getState().isLevelOver
    ) {
      const tappables = hooks.getTappableTiles();
      if (!tappables.length) break;
      hooks.clickTileById(tappables[0].id);
    }
  });
}

test.describe('Triplet Tiles - Progression & Stats', () => {
  test('winning a level updates stats, progression, and shows win overlay', async ({ page }) => {
    await resetToLevel1(page);
    await page.evaluate(() => window.__tripletTestHooks.setSkipAnimations(true));

    await playLevelToWin(page);

    // Win overlay should be visible with correct title.
    await expect(page.locator('#overlay')).toBeVisible();
    await expect(page.locator('#overlay-title')).toHaveText('Level Complete');

    const state = await page.evaluate(() => window.__tripletTestHooks.getState());
    expect(state.stats.levelsCompleted).toBeGreaterThanOrEqual(1);
    expect(state.stats.currentWinStreak).toBeGreaterThanOrEqual(1);
    expect(state.stats.bestWinStreak).toBeGreaterThanOrEqual(state.stats.currentWinStreak);

    // Progression should be saved to localStorage.
    const progression = await page.evaluate(() => {
      return JSON.parse(
        window.localStorage.getItem('triplet_tiles_progression') ||
          '{"highestLevelIndex":0}'
      );
    });
    expect(progression.highestLevelIndex).toBeGreaterThanOrEqual(0);
  });

  test('losing a level resets currentWinStreak but not bestWinStreak', async ({ page }) => {
    await resetToLevel1(page);
    await page.evaluate(() => window.__tripletTestHooks.setSkipAnimations(true));

    // First, win a level to establish a non-zero streak.
    await playLevelToWin(page);

    const afterWinStats = await page.evaluate(
      () => window.__tripletTestHooks.getState().stats
    );
    expect(afterWinStats.currentWinStreak).toBeGreaterThanOrEqual(1);
    const bestAfterWin = afterWinStats.bestWinStreak;

    // Dismiss the win overlay and restart the level.
    await page.locator('#overlay-primary').click();

    // Force a tray overflow loss using test hooks.
    await page.evaluate(() => {
      const hooks = window.__tripletTestHooks;
      hooks.setTrayTilesForTest(
        Array.from({ length: 7 }).map((_, index) => ({
          id: `overflow_${index}`,
          type: `loss_type_${index}`
        }))
      );
    });
    await page.locator('#board .tile.tappable').first().click();

    await expect(page.locator('#overlay')).toBeVisible();
    await expect(page.locator('#overlay-title')).toHaveText('Level Failed');

    const afterLossStats = await page.evaluate(
      () => window.__tripletTestHooks.getState().stats
    );
    expect(afterLossStats.currentWinStreak).toBe(0);
    expect(afterLossStats.bestWinStreak).toBe(bestAfterWin);
  });

  test('reloading the page continues from highest unlocked level', async ({ page }) => {
    // Manually seed progression to unlock Level 3 (index 2).
    await page.goto('/');
    await page.waitForSelector('#board');

    await page.evaluate(() => {
      window.localStorage.setItem(
        'triplet_tiles_progression',
        JSON.stringify({ highestLevelIndex: 2 })
      );
      // Also clear stats/powerups to avoid interference.
      window.localStorage.removeItem('triplet_tiles_stats');
      window.localStorage.removeItem('triplet_tiles_powerups');
    });

    // Reload so loadProgression picks up the seeded progression.
    await page.reload();
    await page.waitForSelector('#board .tile');

    await expect(page.locator('#level-label')).toHaveText(/Level 3:/);
  });

  test('reload preserves mid-level board, tray, and score', async ({ page }) => {
    await resetToLevel1(page);
    await page.evaluate(() => window.__tripletTestHooks.setSkipAnimations(true));

    await page.evaluate(() => {
      const hooks = window.__tripletTestHooks;
      const tappables = hooks.getTappableTiles();
      if (tappables.length < 2) {
        throw new Error(`expected at least 2 tappable tiles, got ${tappables.length}`);
      }
      hooks.clickTileById(tappables[0].id);
      hooks.clickTileById(tappables[1].id);
    });

    const before = await page.evaluate(() => {
      const s = window.__tripletTestHooks.getState();
      return {
        removedCount: s.boardTiles.filter(t => t.removed).length,
        trayLen: s.trayTiles.length,
        score: s.score
      };
    });

    await page.reload();
    await page.waitForSelector('#board .tile');

    const after = await page.evaluate(() => {
      const s = window.__tripletTestHooks.getState();
      return {
        removedCount: s.boardTiles.filter(t => t.removed).length,
        trayLen: s.trayTiles.length,
        score: s.score
      };
    });

    expect(after.removedCount).toBe(before.removedCount);
    expect(after.trayLen).toBe(before.trayLen);
    expect(after.score).toBe(before.score);
  });

  test('reload stays on a lower chosen level when higher levels are unlocked', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#board');

    /** Index 2 = third level (works with 3-level fallback or full generated list). */
    await page.evaluate(() => {
      window.localStorage.setItem(
        'triplet_tiles_progression',
        JSON.stringify({ highestLevelIndex: 2, lastPlayedLevelIndex: 2 })
      );
      window.localStorage.removeItem('triplet_tiles_stats');
      window.localStorage.removeItem('triplet_tiles_powerups');
      window.localStorage.removeItem('triplet_tiles_session');
    });

    await page.reload();
    await page.waitForSelector('#board .tile');

    await expect(page.locator('#level-label')).toHaveText(/Level 3:/);

    await page.locator('#level-select-button').click();
    await page.waitForSelector('.level-select-card[data-level-index="0"]');
    await page.locator('.level-select-card[data-level-index="0"]').click();

    await expect(page.locator('#level-label')).toHaveText(/Level 1:/);

    await page.evaluate(() => window.__tripletTestHooks.setSkipAnimations(true));
    await page.evaluate(() => {
      const hooks = window.__tripletTestHooks;
      const t = hooks.getTappableTiles();
      if (t.length) hooks.clickTileById(t[0].id);
    });

    await page.reload();
    await page.waitForSelector('#board .tile');

    await expect(page.locator('#level-label')).toHaveText(/Level 1:/);
  });
});

