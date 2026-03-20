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

  test('shuffle permutes board tile types without moving positions', async ({ page }) => {
    await page.evaluate(() => {
      const hooks = window.__tripletTestHooks;
      let i = 0;
      const seq = [0.93, 0.11, 0.72, 0.05, 0.61, 0.38, 0.84, 0.22];
      hooks.setShuffleRandomForTest(() => seq[i++ % seq.length]);
      hooks.setPowerupsForTest({ shuffle: 1 });
    });

    const before = await page.evaluate(() => {
      const state = window.__tripletTestHooks.getState();
      return state.boardTiles
        .filter(t => !t.removed)
        .map(t => ({ id: t.id, x: t.x, y: t.y, z: t.z, type: t.type }))
        .sort((a, b) => a.id.localeCompare(b.id));
    });

    await page.locator('#shuffle-button').click();

    const after = await page.evaluate(() => {
      const state = window.__tripletTestHooks.getState();
      return state.boardTiles
        .filter(t => !t.removed)
        .map(t => ({ id: t.id, x: t.x, y: t.y, z: t.z, type: t.type }))
        .sort((a, b) => a.id.localeCompare(b.id));
    });

    const count = rows =>
      rows.reduce((map, t) => {
        map[t.type] = (map[t.type] || 0) + 1;
        return map;
      }, {});
    expect(count(after)).toEqual(count(before));

    for (let i = 0; i < before.length; i += 1) {
      expect(after[i].id).toBe(before[i].id);
      expect(after[i].x).toBe(before[i].x);
      expect(after[i].y).toBe(before[i].y);
      expect(after[i].z).toBe(before[i].z);
    }

    expect(after.some((t, i) => t.type !== before[i].type)).toBeTruthy();

    const shuffleLeft = await page.locator('#shuffle-count').textContent();
    expect(Number(shuffleLeft || '0')).toBe(0);

    await page.evaluate(() => window.__tripletTestHooks.setShuffleRandomForTest(null));
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

  test('remove type: tray is focused and keyboard confirms second slot', async ({ page }) => {
    await page.evaluate(() => {
      window.__tripletTestHooks.setSkipAnimations(true);
      window.__tripletTestHooks.setPowerupsForTest({ removeType: 1 });
      window.__tripletTestHooks.setTrayTilesForTest([{ type: 'leaf' }, { type: 'flower' }]);
    });

    await page.locator('#remove-type-button').click();
    await expect(page.locator('#tray')).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');

    const trayTypes = await page.evaluate(() =>
      window.__tripletTestHooks.getState().trayTiles.map((t) => t.type)
    );
    expect(trayTypes).toEqual(['leaf']);

    const removeLeft = await page.locator('#remove-type-count').textContent();
    expect(Number(removeLeft || '0')).toBe(0);
  });

  test('remove type: Escape cancels without spending charge', async ({ page }) => {
    await page.evaluate(() => {
      window.__tripletTestHooks.setSkipAnimations(true);
      window.__tripletTestHooks.setPowerupsForTest({ removeType: 1 });
      window.__tripletTestHooks.setTrayTilesForTest([{ type: 'leaf' }]);
    });

    await page.locator('#remove-type-button').click();
    await expect(page.locator('#tray')).toBeFocused();
    await page.keyboard.press('Escape');

    const stillOne = await page.evaluate(() => window.__tripletTestHooks.getState().powerups.removeType);
    expect(stillOne).toBe(1);
    const inMode = await page.evaluate(() => window.__tripletTestHooks.getState().isRemoveTypeMode);
    expect(inMode).toBe(false);
    await expect(page.locator('.tray-tile.selectable-type')).toHaveCount(0);
  });

  test('remove type mode sets board tabindex -1; Escape restores board focusability', async ({ page }) => {
    await page.evaluate(() => {
      window.__tripletTestHooks.setSkipAnimations(true);
      window.__tripletTestHooks.setPowerupsForTest({ removeType: 1 });
      window.__tripletTestHooks.setTrayTilesForTest([{ type: 'leaf' }]);
    });

    await page.locator('#remove-type-button').click();
    await expect(page.locator('#tray')).toBeFocused();

    const tabWhileMode = await page.evaluate(() => document.getElementById('board').tabIndex);
    expect(tabWhileMode).toBe(-1);

    await page.keyboard.press('Escape');

    const tabAfter = await page.evaluate(() => document.getElementById('board').tabIndex);
    expect(tabAfter).toBe(0);
  });
});

