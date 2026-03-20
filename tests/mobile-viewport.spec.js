const { test, expect, devices } = require('@playwright/test');

/** Largest horizontal extent vs viewport; allow a couple of px for subpixel rounding. */
const H_OVERFLOW_TOLERANCE_PX = 2;

/**
 * Typical phone portrait sizes plus landscape and a slightly shorter screen to stress
 * vertical layout without changing the horizontal fit contract.
 */
const MOBILE_VIEWPORTS = [
  { name: 'iPhone SE portrait', width: 375, height: 667 },
  { name: 'iPhone 14 portrait', width: 390, height: 844 },
  { name: 'Pixel 7 portrait', width: 412, height: 915 },
  { name: 'narrow Android portrait', width: 360, height: 800 },
  { name: 'iPhone 14 landscape (aspect)', width: 844, height: 390 },
  { name: 'wider short portrait', width: 412, height: 640 }
];

const LEVEL_INDICES = [0, 1, 2];

async function assertNoHorizontalPageOverflow(page) {
  const m = await page.evaluate(() => {
    const w = window.innerWidth;
    const doc = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
    return { innerWidth: w, scrollWidth: scrollW, delta: scrollW - w };
  });
  expect(
    m.delta,
    `document scrollWidth exceeds viewport width (horizontal scrolling): scrollWidth=${m.scrollWidth} innerWidth=${m.innerWidth}`
  ).toBeLessThanOrEqual(H_OVERFLOW_TOLERANCE_PX);
}

/**
 * Element should not extend past the left/right edges of the viewport (after any scroll).
 */
async function assertElementContainedHorizontally(page, selector) {
  const vp = page.viewportSize();
  expect(vp).toBeTruthy();
  const handle = page.locator(selector);
  await expect(handle).toBeVisible();
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  expect(box, `${selector} bounding box`).toBeTruthy();
  expect(box.x, `${selector} leaks left of viewport`).toBeGreaterThanOrEqual(-H_OVERFLOW_TOLERANCE_PX);
  expect(box.x + box.width, `${selector} leaks right of viewport`).toBeLessThanOrEqual(
    vp.width + H_OVERFLOW_TOLERANCE_PX
  );
}

async function loadLevel(page, levelIndex) {
  await page.goto('/');
  await page.waitForSelector('#board');
  await page.evaluate(
    ({ idx }) => {
      window.__tripletTestHooks.resetAllProgress();
      window.__tripletTestHooks.setSkipAnimations(true);
      window.__tripletTestHooks.startLevel(idx);
    },
    { idx: levelIndex }
  );
  await page.waitForSelector('#board .tile');
}

for (const vp of MOBILE_VIEWPORTS) {
  test.describe(`Mobile viewport — ${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const levelIndex of LEVEL_INDICES) {
      test(`level ${levelIndex + 1} (index ${levelIndex}): no horizontal scroll; board and tray fit`, async ({
        page
      }) => {
        await loadLevel(page, levelIndex);
        await assertNoHorizontalPageOverflow(page);
        await assertElementContainedHorizontally(page, '#board');
        await assertElementContainedHorizontally(page, '#tray');
      });
    }

    test('level select overlay: no horizontal scroll; panel visible', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#board');
      await page.locator('#level-select-button').click();
      await expect(page.locator('#level-select-overlay')).toBeVisible();
      await expect(page.locator('.level-select-panel')).toBeVisible();
      await assertNoHorizontalPageOverflow(page);
      await assertElementContainedHorizontally(page, '.level-select-panel');
    });
  });
}

test.describe('iPhone 12 device metrics (Chromium)', () => {
  // Full `devices['iPhone 12']` sets `defaultBrowserType: 'webkit'`, which cannot be nested
  // alongside other describes in this file; keep Chromium and apply viewport/UA/touch/DPR.
  const iphone12 = devices['iPhone 12'];
  test.use({
    viewport: iphone12.viewport,
    userAgent: iphone12.userAgent,
    deviceScaleFactor: iphone12.deviceScaleFactor,
    isMobile: iphone12.isMobile,
    hasTouch: iphone12.hasTouch
  });

  test('first generated-style level fits without horizontal overflow', async ({ page }) => {
    await loadLevel(page, 2);
    await assertNoHorizontalPageOverflow(page);
    await assertElementContainedHorizontally(page, '#board');
    await assertElementContainedHorizontally(page, '#tray');
  });
});
