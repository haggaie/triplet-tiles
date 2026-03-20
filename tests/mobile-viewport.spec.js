const { test, expect, devices } = require('@playwright/test');

/** Largest horizontal extent vs viewport; allow a couple of px for subpixel rounding. */
const H_OVERFLOW_TOLERANCE_PX = 2;

/** Subpixel / rounding when comparing tile rects to the board playfield (`#board` uses `overflow: hidden`). */
const BOARD_CLIP_TOLERANCE_PX = 2;

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
/**
 * Every in-play tile must lie fully inside the board's clip rect; otherwise `overflow: hidden`
 * visually truncates tiles without changing document scroll width (easy to miss with layout-only tests).
 */
async function assertBoardIsSquarePlayfield(page) {
  const d = await page.evaluate(() => {
    const b = document.getElementById('board');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  expect(d).toBeTruthy();
  expect(
    Math.abs(d.w - d.h),
    `#board must stay square (got ${d.w}×${d.h}px); mismatched flex axes used to clip tiles vertically`
  ).toBeLessThanOrEqual(BOARD_CLIP_TOLERANCE_PX);
}

/** After scroll, the full board should fit in the visual viewport (no part cut off by screen edge). */
async function assertBoardFullyVisibleInViewport(page) {
  await page.locator('#board').scrollIntoViewIfNeeded();
  const m = await page.evaluate((tol) => {
    const board = document.getElementById('board');
    if (!board) return { ok: false, error: 'missing #board' };
    const r = board.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ok =
      r.left >= -tol &&
      r.top >= -tol &&
      r.right <= vw + tol &&
      r.bottom <= vh + tol;
    return { ok, r: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, vw, vh };
  }, BOARD_CLIP_TOLERANCE_PX);
  expect(m.ok, m.ok ? '' : `Board is truncated by viewport: ${JSON.stringify(m)}`).toBe(true);
}

async function assertBoardTilesFullyInsidePlayfield(page) {
  await page.locator('#board').scrollIntoViewIfNeeded();
  const result = await page.evaluate((tol) => {
    const board = document.getElementById('board');
    if (!board) return { ok: false, error: 'missing #board' };
    const br = board.getBoundingClientRect();
    const tiles = Array.from(board.querySelectorAll('.tile'));
    const outside = [];
    for (const tile of tiles) {
      const tr = tile.getBoundingClientRect();
      if (tr.width <= 0 && tr.height <= 0) continue;
      if (
        tr.left < br.left - tol ||
        tr.top < br.top - tol ||
        tr.right > br.right + tol ||
        tr.bottom > br.bottom + tol
      ) {
        outside.push({
          id: tile.dataset.tileId,
          tile: { left: tr.left, top: tr.top, right: tr.right, bottom: tr.bottom },
          board: { left: br.left, top: br.top, right: br.right, bottom: br.bottom }
        });
      }
    }
    return { ok: outside.length === 0, outside: outside.slice(0, 6), totalTiles: tiles.length };
  }, BOARD_CLIP_TOLERANCE_PX);
  expect(
    result.ok,
    result.ok
      ? ''
      : `tile(s) extend outside #board (clipped): ${JSON.stringify({ outside: result.outside, totalTiles: result.totalTiles })}`
  ).toBe(true);
}

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
        await assertBoardIsSquarePlayfield(page);
        await assertBoardFullyVisibleInViewport(page);
        await assertBoardTilesFullyInsidePlayfield(page);
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
    await assertBoardIsSquarePlayfield(page);
    await assertBoardFullyVisibleInViewport(page);
    await assertBoardTilesFullyInsidePlayfield(page);
    await assertElementContainedHorizontally(page, '#board');
    await assertElementContainedHorizontally(page, '#tray');
  });
});
