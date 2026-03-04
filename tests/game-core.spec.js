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

    await expect(page.locator('#level-label')).toHaveText('Level 1: Gentle Grove');
    await expect(page.locator('#score-value')).toHaveText('0');
    await expect(page.locator('.tray-slot .tray-tile')).toHaveCount(0);
  });

  test('matching three identical tiles clears them from tray and awards score', async ({ page }) => {
    await resetToLevel1(page);

    // Click three tappable leaf tiles (🍃) in Level 1.
    for (let i = 0; i < 3; i += 1) {
      await page.locator('.tile.tappable', { hasText: '🍃' }).first().click();
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

    // Jump to Level 2, which has layered tiles.
    await page.evaluate(() => {
      window.__tripletTestHooks.startLevel(1);
    });
    await page.waitForSelector('#board .tile');

    // Use hooks to find a tile pair at the same (x, y) with z=0 (below) and z=1 (above).
    const { belowId, aboveId } = await page.evaluate(() => {
      const hooks = window.__tripletTestHooks;
      const state = hooks.getState();
      const tiles = state.boardTiles;
      const above = tiles.find(t => t.z === 1);
      if (!above) return { belowId: null, aboveId: null };
      const below = tiles.find(t => t.x === above.x && t.y === above.y && t.z === 0);
      return { belowId: below && below.id, aboveId: above.id };
    });

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

