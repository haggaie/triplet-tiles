'use strict';

const { test, expect } = require('@playwright/test');

/**
 * Coarse-pointer / touch UIs must not apply hover-only transforms that fight the inline
 * `translate(-50%,-50%)` centering from JS (stacked tile artwork on Pixel-class Android).
 */
test.describe('Board tile layout (touch-class viewport)', () => {
  test.use({ viewport: { width: 412, height: 915 } });

  test('tile centers are spread at least a fraction of cellSize apart', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#board');
    const m = await page.evaluate(() => {
      window.__tripletTestHooks.resetAllProgress();
      window.__tripletTestHooks.setSkipAnimations(true);
      window.__tripletTestHooks.startLevel(2);
      const hooks = window.__tripletTestHooks;
      const { cellSize } = hooks.getBoardPixelDims();
      const tiles = [...document.querySelectorAll('#board .tile')];
      const centers = tiles.map((t) => {
        const r = t.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      let minDist = Infinity;
      for (let i = 0; i < centers.length; i += 1) {
        for (let j = i + 1; j < centers.length; j += 1) {
          const d = Math.hypot(centers[i].x - centers[j].x, centers[i].y - centers[j].y);
          if (d > 0.5) minDist = Math.min(minDist, d);
        }
      }
      return { cellSize, minDist, n: tiles.length };
    });
    expect(m.n, 'level should render multiple board tiles').toBeGreaterThan(2);
    expect(
      m.minDist,
      `expected distinct tile positions (min center distance ${m.minDist}px, cellSize ${m.cellSize}px)`
    ).toBeGreaterThan(m.cellSize * 0.35);
  });
});
