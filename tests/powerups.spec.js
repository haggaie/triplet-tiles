const { test, expect } = require('@playwright/test');

async function resetToLevel1(page) {
  await page.goto('/');
  await page.waitForSelector('#board');
  await page.evaluate(() => {
    window.__tripletTestHooks.resetAllProgress();
  });
  await page.waitForSelector('#board .tile');
}

test.describe('Triplet Tiles - Power-ups', () => {
  test.beforeEach(async ({ page }) => {
    await resetToLevel1(page);
  });

  test('undo reverts last move and decrements charges', async ({ page }) => {
    const initialUndoCountText = await page.locator('#undo-count').textContent();
    const initialUndoCount = Number(initialUndoCountText || '0');

    // Make a move: click any tappable tile.
    await page.locator('#board .tile.tappable').first().click();
    await page.evaluate(() => window.__tripletTestHooks.waitForActionComplete());

    // Tray should now contain 1 tile.
    await expect(page.locator('.tray-slot .tray-tile')).toHaveCount(1);

    // Click undo.
    await page.locator('#undo-button').click();

    // Tray should be empty again, score restored.
    await expect(page.locator('.tray-slot .tray-tile')).toHaveCount(0);
    const score = await page.locator('#score-value').textContent();
    expect(Number(score || '0')).toBe(0);

    const afterUndoCountText = await page.locator('#undo-count').textContent();
    const afterUndoCount = Number(afterUndoCountText || '0');
    expect(afterUndoCount).toBe(initialUndoCount - 1);

    // Undo button should now be disabled because there is no snapshot.
    await expect(page.locator('#undo-button')).toBeDisabled();
  });

  test('shuffle groups identical tiles together without changing counts', async ({ page }) => {
    // Ensure we have a known tray configuration via test hooks.
    await page.evaluate(() => {
      const hooks = window.__tripletTestHooks;
      hooks.setTrayTilesForTest([
        { type: 'typeA' },
        { type: 'typeB' },
        { type: 'typeA' },
        { type: 'typeB' },
        { type: 'typeB' }
      ]);
      // Ensure we have at least one shuffle charge.
      hooks.setPowerupsForTest({ shuffle: 1 });
    });

    // Before shuffle: record the multiset of types.
    const beforeTypes = await page.evaluate(() => {
      return window.__tripletTestHooks.getState().trayTiles.map(t => t.type);
    });

    // Click shuffle.
    await page.locator('#shuffle-button').click();

    const afterTypes = await page.evaluate(() => {
      return window.__tripletTestHooks.getState().trayTiles.map(t => t.type);
    });

    // Type counts should be the same before and after.
    const count = arr =>
      arr.reduce((map, t) => {
        map[t] = (map[t] || 0) + 1;
        return map;
      }, {});
    expect(count(afterTypes)).toEqual(count(beforeTypes));

    // After shuffle, tiles should be grouped by type: the type with 3 occurrences comes first.
    // Our configuration has typeB 3 times and typeA 2 times.
    expect(afterTypes.slice(0, 3)).toEqual(['typeB', 'typeB', 'typeB']);
    expect(afterTypes.slice(3)).toEqual(['typeA', 'typeA']);
  });

  test('remove tile type removes that type from both tray and board and decrements charges', async ({ page }) => {
    // Use a level that has tappable leaves (Level 1 has leaves covered by flowers). Start at level index 2.
    await page.evaluate(() => {
      window.__tripletTestHooks.startLevel(2);
    });
    await page.waitForSelector('#board .tile');

    // Give ourselves one remove-type charge.
    await page.evaluate(() => {
      window.__tripletTestHooks.setPowerupsForTest({ removeType: 1 });
    });

    // Put a known tile type into the tray (use a real tile type like 'leaf').
    await page.evaluate(() => {
      const hooks = window.__tripletTestHooks;
      const leafTile = hooks.getTappableTiles().find(t => t.type === 'leaf');
      if (leafTile) {
        hooks.clickTileById(leafTile.id);
      }
    });
    await page.evaluate(() => window.__tripletTestHooks.waitForActionComplete());

    // Count how many leaf tiles remain on the board before removal.
    const beforeLeafCount = await page.evaluate(() => {
      const state = window.__tripletTestHooks.getState();
      return state.boardTiles.filter(t => !t.removed && t.type === 'leaf').length;
    });
    expect(beforeLeafCount).toBeGreaterThan(0);

    // Activate remove-type mode and click the tray tile.
    await page.locator('#remove-type-button').click();
    await page.locator('.tray-tile').first().click();

    // Now, no leaf tiles should remain on the board.
    const afterLeafCount = await page.evaluate(() => {
      const state = window.__tripletTestHooks.getState();
      return state.boardTiles.filter(t => !t.removed && t.type === 'leaf').length;
    });
    expect(afterLeafCount).toBe(0);

    // Tray should no longer contain leaf tiles.
    const trayTypes = await page.evaluate(() => {
      return window.__tripletTestHooks.getState().trayTiles.map(t => t.type);
    });
    expect(trayTypes).not.toContain('leaf');

    // Remove-type charge should be decremented and button disabled.
    const removeTypeCountText = await page.locator('#remove-type-count').textContent();
    const removeTypeCount = Number(removeTypeCountText || '0');
    expect(removeTypeCount).toBe(0);
    await expect(page.locator('#remove-type-button')).toBeDisabled();
  });
});

