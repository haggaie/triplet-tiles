const { test, expect } = require('@playwright/test');

async function playUntilWinOverlay(page) {
  for (let i = 0; i < 80; i += 1) {
    if (await page.locator('#overlay').isVisible()) return;
    const progressed = await page.evaluate(() => {
      const hooks = window.__tripletTestHooks;
      const next = hooks.getTappableTiles()[0];
      if (!next) return false;
      hooks.clickTileById(next.id);
      return true;
    });
    if (!progressed) break;
    await page.evaluate(() => window.__tripletTestHooks.waitForActionComplete());
  }
}

test.describe('Modal focus lock and Escape', () => {
  test('win overlay sets inert on header and main', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#board .tile');
    await page.evaluate(() => {
      window.__tripletTestHooks.resetAllProgress();
      window.__tripletTestHooks.setSkipAnimations(true);
    });
    await page.waitForSelector('#board .tile');
    await playUntilWinOverlay(page);
    await expect(page.locator('#overlay')).toBeVisible();
    const inert = await page.evaluate(() => ({
      header: document.querySelector('#app header')?.inert,
      main: document.querySelector('#app main')?.inert,
      overlay: document.getElementById('overlay')?.inert
    }));
    expect(inert.header).toBe(true);
    expect(inert.main).toBe(true);
    expect(inert.overlay).toBe(false);
  });

  test('Escape on win overlay acts like primary (advance level)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#board .tile');
    await page.evaluate(() => {
      window.__tripletTestHooks.resetAllProgress();
      window.__tripletTestHooks.setSkipAnimations(true);
    });
    await page.waitForSelector('#board .tile');
    await playUntilWinOverlay(page);
    await expect(page.locator('#overlay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#overlay')).toBeHidden();
    const idx = await page.evaluate(() => window.__tripletTestHooks.getState().currentLevelIndex);
    expect(idx).toBe(1);
  });

  test('Escape on loss overlay retries same level', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#board .tile');
    await page.evaluate(() => {
      window.__tripletTestHooks.resetAllProgress();
      window.__tripletTestHooks.setSkipAnimations(true);
    });
    await page.waitForSelector('#board .tile');
    await page.evaluate(() => {
      window.__tripletTestHooks.setTrayTilesForTest(
        Array.from({ length: 7 }).map((_, index) => ({
          id: `overflow_${index}`,
          type: `test_type_${index}`
        }))
      );
    });
    await page.locator('#board .tile.tappable').first().click();
    await expect(page.locator('#overlay')).toBeVisible();
    await expect(page.locator('#overlay-title')).toHaveText('Level Failed');
    await page.keyboard.press('Escape');
    await expect(page.locator('#overlay')).toBeHidden();
    const idx = await page.evaluate(() => window.__tripletTestHooks.getState().currentLevelIndex);
    expect(idx).toBe(0);
  });

  test('level select sets inert on header, main, and game overlay', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#board');
    await page.click('#level-select-button');
    await expect(page.locator('#level-select-overlay')).toBeVisible();
    const inert = await page.evaluate(() => ({
      header: document.querySelector('#app header')?.inert,
      main: document.querySelector('#app main')?.inert,
      gameOverlay: document.getElementById('overlay')?.inert
    }));
    expect(inert.header).toBe(true);
    expect(inert.main).toBe(true);
    expect(inert.gameOverlay).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#level-select-overlay')).toBeHidden();
    const cleared = await page.evaluate(() => ({
      header: document.querySelector('#app header')?.inert,
      main: document.querySelector('#app main')?.inert,
      gameOverlay: document.getElementById('overlay')?.inert
    }));
    expect(cleared.header).toBe(false);
    expect(cleared.main).toBe(false);
    expect(cleared.gameOverlay).toBe(false);
  });
});
