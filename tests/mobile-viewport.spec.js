const { test, expect, devices } = require('@playwright/test');

/** Largest horizontal extent vs viewport; allow a couple of px for subpixel rounding. */
const H_OVERFLOW_TOLERANCE_PX = 2;

/** Subpixel / rounding when comparing tile rects to the board playfield (`#board` uses `overflow: hidden`). */
const BOARD_CLIP_TOLERANCE_PX = 2;

/** Matches `style.css` / `game.js`: narrow layout full-bleed board (under 768px). */
const NARROW_LAYOUT_MAX_WIDTH_PX = 767;

/**
 * True for viewports that use the phone full-bleed board (narrow + not landscape-wide breakpoint).
 * Excludes e.g. 844×390 where min-width 768px applies.
 */
function viewportUsesNarrowFullBleedBoard(vp) {
  return vp.width <= NARROW_LAYOUT_MAX_WIDTH_PX && vp.height >= vp.width;
}

/**
 * Typical phone portrait sizes plus landscape and a slightly shorter screen to stress
 * vertical layout without changing the horizontal fit contract.
 */
const MOBILE_VIEWPORTS = [
  { name: 'iPhone SE portrait', width: 375, height: 667 },
  /* Between 600–768px used to show gaps: .main-layout align-items:center shrunk #board-scroll */
  { name: 'mid narrow portrait', width: 526, height: 800 },
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
/**
 * On narrow layouts the mat should span `#board-scroll` inner width (no side stripes), unless
 * `--board-cell-min` forces a board wider than the scrollport (horizontal pan).
 */
async function assertNarrowLayoutBoardFillsScrollportWidth(page) {
  const m = await page.evaluate(() => {
    const scroll = document.getElementById('board-scroll');
    const board = document.getElementById('board');
    if (!scroll || !board) return null;
    const cs = getComputedStyle(scroll);
    const pl = parseFloat(cs.paddingLeft) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const innerW = scroll.clientWidth - pl - pr;
    const bw = board.getBoundingClientRect().width;
    const horizOverflow = scroll.scrollWidth > scroll.clientWidth + 1;
    return { innerW, bw, horizOverflow, delta: Math.abs(innerW - bw) };
  });
  expect(m, 'board/scroll metrics').toBeTruthy();
  if (m.horizOverflow) {
    expect(
      m.bw,
      'when min cell forces horizontal pan, board should be wider than scrollport inner width'
    ).toBeGreaterThan(m.innerW - BOARD_CLIP_TOLERANCE_PX);
  } else {
    expect(
      m.delta,
      `#board should span #board-scroll inner width (innerW=${m.innerW}px, board=${m.bw}px)`
    ).toBeLessThanOrEqual(BOARD_CLIP_TOLERANCE_PX);
  }
}

async function assertBoardPlayfieldMatchesLevelGrid(page) {
  const d = await page.evaluate(() => {
    const b = document.getElementById('board');
    const hooks = window.__tripletTestHooks;
    if (!b || !hooks || typeof hooks.getBoardPixelDims !== 'function') return null;
    const exp = hooks.getBoardPixelDims();
    const r = b.getBoundingClientRect();
    return { exp, rw: r.width, rh: r.height };
  });
  expect(d).toBeTruthy();
  expect(
    Math.abs(d.rw - d.exp.widthPx),
    `#board width should match layout (got ${d.rw}px vs ${d.exp.widthPx}px)`
  ).toBeLessThanOrEqual(BOARD_CLIP_TOLERANCE_PX);
  expect(
    Math.abs(d.rh - d.exp.heightPx),
    `#board height should match layout (got ${d.rh}px vs ${d.exp.heightPx}px)`
  ).toBeLessThanOrEqual(BOARD_CLIP_TOLERANCE_PX);
}

/**
 * The scrollport (#board-scroll) should sit in the visual viewport; the inner #board may be
 * larger on wide grids (--board-cell-min) and pan inside the scrollport.
 */
async function assertBoardScrollportVisibleInViewport(page) {
  await page.locator('#board-scroll').scrollIntoViewIfNeeded();
  const m = await page.evaluate((tol) => {
    const scroll = document.getElementById('board-scroll');
    if (!scroll) return { ok: false, error: 'missing #board-scroll' };
    const r = scroll.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ok =
      r.left >= -tol &&
      r.top >= -tol &&
      r.right <= vw + tol &&
      r.bottom <= vh + tol;
    return { ok, r: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, vw, vh };
  }, BOARD_CLIP_TOLERANCE_PX);
  expect(m.ok, m.ok ? '' : `Board scrollport is truncated by viewport: ${JSON.stringify(m)}`).toBe(true);
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
        await assertBoardPlayfieldMatchesLevelGrid(page);
        if (viewportUsesNarrowFullBleedBoard(vp)) {
          await assertNarrowLayoutBoardFillsScrollportWidth(page);
        }
        await assertBoardScrollportVisibleInViewport(page);
        await assertBoardTilesFullyInsidePlayfield(page);
        await assertElementContainedHorizontally(page, '#board-scroll');
        /* #tray may be wider than the viewport (min cell × 7); it scrolls inside .tray-wrapper. */
        await assertElementContainedHorizontally(page, '.tray-wrapper');
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

test.describe('Board scroll — min cell floor', () => {
  /* Short viewport so width-first phone layout still overflows vertically and #board-scroll must pan */
  test.use({ viewport: { width: 375, height: 480 } });

  test('first generated level (grid 7): playfield is larger than scrollport so it can pan', async ({ page }) => {
    await loadLevel(page, 2);
    await assertNoHorizontalPageOverflow(page);
    await assertNarrowLayoutBoardFillsScrollportWidth(page);
    const m = await page.evaluate(() => {
      const scroll = document.getElementById('board-scroll');
      const board = document.getElementById('board');
      if (!scroll || !board) return null;
      return {
        scrollW: scroll.scrollWidth,
        clientW: scroll.clientWidth,
        scrollH: scroll.scrollHeight,
        clientH: scroll.clientHeight,
        boardW: board.offsetWidth
      };
    });
    expect(m).toBeTruthy();
    const canPan = m.scrollW > m.clientW + 1 || m.scrollH > m.clientH + 1;
    expect(
      canPan,
      `expected #board-scroll to overflow (scroll ${m.scrollW}×${m.scrollH} vs client ${m.clientW}×${m.clientH}); board width ${m.boardW}`
    ).toBe(true);

    const scrollRange = await page.evaluate(() => {
      const s = document.getElementById('board-scroll');
      if (!s) return null;
      const maxX = s.scrollWidth - s.clientWidth;
      const maxY = s.scrollHeight - s.clientHeight;
      s.scrollLeft = 9e6;
      s.scrollTop = 9e6;
      const left = s.scrollLeft;
      const top = s.scrollTop;
      s.scrollLeft = 0;
      s.scrollTop = 0;
      return { maxX, maxY, left, top };
    });
    expect(scrollRange).toBeTruthy();
    expect(
      scrollRange.left,
      `scrollLeft should reach end (${scrollRange.maxX}), got ${scrollRange.left}`
    ).toBeGreaterThanOrEqual(scrollRange.maxX - 2);
    expect(
      scrollRange.top,
      `scrollTop should reach end (${scrollRange.maxY}), got ${scrollRange.top}`
    ).toBeGreaterThanOrEqual(scrollRange.maxY - 2);
  });
});

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
    await assertBoardPlayfieldMatchesLevelGrid(page);
    await assertNarrowLayoutBoardFillsScrollportWidth(page);
    await assertBoardScrollportVisibleInViewport(page);
    await assertBoardTilesFullyInsidePlayfield(page);
    await assertElementContainedHorizontally(page, '#board-scroll');
    await assertElementContainedHorizontally(page, '.tray-wrapper');
  });
});
