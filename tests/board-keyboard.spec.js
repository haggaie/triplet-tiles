const { test, expect } = require('@playwright/test');

test.describe('Board keyboard', () => {
  test('board receives focus when level loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#board .tile');
    await expect(page.locator('#board')).toBeFocused({ timeout: 5000 });
  });

  test('ArrowRight moves keyboard highlight to a different tappable when possible', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#board .tile');
    await page.evaluate(() => {
      window.__tripletTestHooks.setSkipAnimations(true);
    });

    await expect(page.locator('#board')).toBeFocused({ timeout: 5000 });

    const count = await page.evaluate(() => window.__tripletTestHooks.getTappableTiles().length);
    expect(count).toBeGreaterThanOrEqual(2);

    const id0 = await page.evaluate(() => window.__tripletTestHooks.getBoardKeyboardFocusTileId());
    expect(id0).toBeTruthy();

    await page.keyboard.press('ArrowRight');
    const id1 = await page.evaluate(() => window.__tripletTestHooks.getBoardKeyboardFocusTileId());

    expect(id1).toBeTruthy();
    expect(id1).not.toBe(id0);
  });

  test('after picking a tile, keyboard focus moves off the removed tile', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#board .tile');
    await page.evaluate(() => {
      window.__tripletTestHooks.setSkipAnimations(true);
    });

    await expect(page.locator('#board')).toBeFocused({ timeout: 5000 });

    const pickedId = await page.evaluate(() => window.__tripletTestHooks.getTappableTiles()[0].id);
    expect(pickedId).toBeTruthy();

    await page.evaluate((id) => window.__tripletTestHooks.clickTileById(id), pickedId);

    const afterFocus = await page.evaluate(() => window.__tripletTestHooks.getBoardKeyboardFocusTileId());
    expect(afterFocus).not.toBe(pickedId);
    if (afterFocus) {
      const stillTappable = await page.evaluate((id) => {
        return window.__tripletTestHooks.getTappableTiles().some((t) => t.id === id);
      }, afterFocus);
      expect(stillTappable).toBe(true);
    }
  });

  test('ArrowLeft from leftmost tappable wraps to the right edge (max cx)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#board .tile');
    await page.evaluate(() => window.__tripletTestHooks.setSkipAnimations(true));

    const result = await page.evaluate(() => {
      const h = window.__tripletTestHooks;
      const tap = h.getTappableTiles();
      if (tap.length < 2) return { ok: false, reason: 'need 2+ tappables' };

      let maxCx = -Infinity;
      for (const t of tap) {
        const c = h.getBoardTileCenterBoardPx(t.id);
        if (c) maxCx = Math.max(maxCx, c.cx);
      }

      let leftId = null;
      let minCx = Infinity;
      for (const t of tap) {
        const c = h.getBoardTileCenterBoardPx(t.id);
        if (!c) continue;
        if (c.cx < minCx) {
          minCx = c.cx;
          leftId = t.id;
        }
      }
      if (!leftId) return { ok: false, reason: 'no leftmost' };

      const targetId = h.getBoardKeyboardArrowTarget(leftId, 'ArrowLeft');
      if (!targetId) return { ok: false, reason: 'no wrap target' };
      const tc = h.getBoardTileCenterBoardPx(targetId);
      if (!tc) return { ok: false, reason: 'no target center' };

      const atRightEdge = Math.abs(tc.cx - maxCx) < 1.5;
      return { ok: atRightEdge, minCx, maxCx, tcx: tc.cx };
    });

    expect(result.ok, JSON.stringify(result)).toBe(true);
  });

  test('ArrowRight from rightmost tappable wraps to the left edge (min cx)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#board .tile');
    await page.evaluate(() => window.__tripletTestHooks.setSkipAnimations(true));

    const result = await page.evaluate(() => {
      const h = window.__tripletTestHooks;
      const tap = h.getTappableTiles();
      if (tap.length < 2) return { ok: false, reason: 'need 2+ tappables' };

      let minCxAll = Infinity;
      for (const t of tap) {
        const c = h.getBoardTileCenterBoardPx(t.id);
        if (c) minCxAll = Math.min(minCxAll, c.cx);
      }

      let rightId = null;
      let maxCx = -Infinity;
      for (const t of tap) {
        const c = h.getBoardTileCenterBoardPx(t.id);
        if (!c) continue;
        if (c.cx > maxCx) {
          maxCx = c.cx;
          rightId = t.id;
        }
      }
      if (!rightId) return { ok: false, reason: 'no rightmost' };

      const targetId = h.getBoardKeyboardArrowTarget(rightId, 'ArrowRight');
      if (!targetId) return { ok: false, reason: 'no wrap target' };
      const tc = h.getBoardTileCenterBoardPx(targetId);
      if (!tc) return { ok: false, reason: 'no target center' };

      const atLeftEdge = Math.abs(tc.cx - minCxAll) < 1.5;
      return { ok: atLeftEdge, maxCx, minCxAll, tcx: tc.cx };
    });

    expect(result.ok, JSON.stringify(result)).toBe(true);
  });
});
