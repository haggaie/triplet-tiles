const { test, expect } = require('@playwright/test');

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
    const pair = await page.evaluate(() => {
      const hooks = window.__tripletTestHooks;
      const maxLevelsToTry = 10;
      for (let levelIndex = 0; levelIndex < maxLevelsToTry; levelIndex += 1) {
        hooks.startLevel(levelIndex);
        const tiles = hooks.getState().boardTiles;
        // Coverage footprint from game.js:
        // other covers tile if other.z > tile.z and -1<=dx<=0 and 0<=dy<=1
        for (const below of tiles) {
          for (const above of tiles) {
            if (above.z <= below.z) continue;
            const dx = above.x - below.x;
            const dy = above.y - below.y;
            if (dx >= -1 && dx <= 0 && dy >= 0 && dy <= 1) {
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

    // After removing the above tile, the below tile should now be tappable.
    const laterTappableIds = await page.evaluate(() => {
      return window.__tripletTestHooks.getTappableTiles().map(t => t.id);
    });
    expect(laterTappableIds).toContain(belowId);
  });
});

