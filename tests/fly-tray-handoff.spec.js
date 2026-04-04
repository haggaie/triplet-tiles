'use strict';

const { test, expect } = require('@playwright/test');

/**
 * Regression: fly.remove() before a deferred applyMove left a gap (flicker / wrong icon scale) when
 * the apply queue did not drain immediately — common on busy main thread (mobile). The flying clone
 * must stay until renderTray() runs inside applyMove.
 */
test.describe('Fly → tray handoff', () => {
  test('`.tile-flying` remains while apply thunk is queued under hold', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#board');
    const firstId = await page.evaluate(() => {
      window.__tripletTestHooks.resetAllProgress();
      window.__tripletTestHooks.setSkipAnimations(false);
      window.__tripletTestHooks.holdApplyQueueForTest(true);
      const t = document.querySelector('#board .tile.tappable');
      return t ? t.dataset.tileId : null;
    });
    expect(firstId).toBeTruthy();

    await page.evaluate((id) => {
      window.__tripletTestHooks.clickTileById(id);
    }, firstId);

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const s = window.__tripletTestHooks.getEngineDebugSnapshot();
            return (
              !s.hasCurrentFly &&
              s.applyQueueLen >= 1 &&
              document.querySelectorAll('.tile-flying').length === 1
            );
          }),
        { timeout: 10_000 }
      )
      .toBe(true);

    try {
      await page.evaluate(() => {
        window.__tripletTestHooks.releaseApplyQueueHoldForTest();
      });
      await page.evaluate(async () => {
        await window.__tripletTestHooks.waitForActionComplete();
      });
    } finally {
      await page.evaluate(() => {
        window.__tripletTestHooks.holdApplyQueueForTest(false);
        window.__tripletTestHooks.releaseApplyQueueHoldForTest();
      });
    }

    await expect(page.locator('.tile-flying')).toHaveCount(0);
  });
});
