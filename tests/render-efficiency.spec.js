/**
 * Render efficiency: validates that the board renders only the minimum necessary DOM nodes
 * and minimises style/attribute mutations per interaction.
 *
 * Key invariants tested:
 *  1. DOM tile count = (non-removed board tiles) − (occluded tiles).
 *  2. Occluded tiles have no DOM element; they appear when their covering tile is removed.
 *  3. A single tile pick produces O(1) DOM mutations (not O(total tiles)).
 *  4. The incremental pick path is used and reports small synced/skipped counts.
 *  5. A second full render pass skips unchanged tiles.
 *
 * Uses the __tripletTestHooks API: getRenderStats(), getOccludedTileCount(),
 * getOccludedTileIds(), triggerFullRenderForTest().
 */
const { test, expect } = require('@playwright/test');

/** First generated level (LEVELS[2]): small, ~84 tiles, ~5 occluded. */
const SMALL_OCCLUDED_LEVEL_INDEX = 2;
/** A mid-size level with substantial occlusion (LEVELS[15]): 147 tiles, ~67 occluded. */
const MID_OCCLUDED_LEVEL_INDEX = 15;
/** Heavy level used by perf benchmarks (LEVELS[31]): ~546 tiles, ~410 occluded. */
const HEAVY_LEVEL_INDEX = 31;

/**
 * Navigate, reset, and start a level. Disables animations and sets deterministic shuffle.
 * @param {import('@playwright/test').Page} page
 * @param {number} levelIndex
 */
async function setupLevel(page, levelIndex) {
  await page.goto('/');
  await page.locator('#app').waitFor();
  await page.evaluate(
    ({ idx }) => {
      const h = window.__tripletTestHooks;
      h.resetAllProgress();
      h.setShuffleRandomForTest(() => 0.5);
      h.setSkipAnimations(true);
      h.startLevel(idx);
    },
    { idx: levelIndex }
  );
  await page.waitForSelector('#board [data-tile-id]');
}

test.describe('render efficiency', () => {
  test.use({ viewport: { width: 412, height: 915 } });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      const h = window.__tripletTestHooks;
      if (!h) return;
      h.setSkipAnimations(false);
      h.setShuffleRandomForTest(null);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 1: DOM tile count matches non-removed minus occluded
  // ---------------------------------------------------------------------------
  test('DOM tile count equals non-removed minus occluded, across multiple picks', async ({
    page
  }) => {
    await setupLevel(page, MID_OCCLUDED_LEVEL_INDEX);

    const result = await page.evaluate(() => {
      const h = window.__tripletTestHooks;
      const board = document.getElementById('board');

      function snapshot() {
        const state = h.getState();
        const nonRemoved = state.boardTiles.filter(t => !t.removed).length;
        const occluded = h.getOccludedTileCount();
        const domCount = board.querySelectorAll('[data-tile-id]').length;
        return { nonRemoved, occluded, domCount, expected: nonRemoved - occluded };
      }

      const checks = [];

      // Initial state
      checks.push({ label: 'initial', ...snapshot() });

      // After several picks
      for (let i = 0; i < 6; i++) {
        const tappable = h.getTappableTiles();
        if (tappable.length === 0 || h.getState().isLevelOver) break;
        h.clickTileById(tappable[0].id);
        checks.push({ label: `after_pick_${i + 1}`, ...snapshot() });
      }

      return checks;
    });

    for (const check of result) {
      expect(
        check.domCount,
        `[${check.label}] DOM tile count (${check.domCount}) should equal non-removed (${check.nonRemoved}) minus occluded (${check.occluded})`
      ).toBe(check.expected);
    }

    // Verify we actually have occluded tiles on this level
    const initialOccluded = result[0].occluded;
    expect(
      initialOccluded,
      `Level ${MID_OCCLUDED_LEVEL_INDEX} should have occluded tiles for this test to be meaningful`
    ).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Test 2: Occluded tiles have no DOM element; they appear after their cover is removed
  // ---------------------------------------------------------------------------
  test('occluded tiles absent from DOM until their covering tile is picked', async ({ page }) => {
    await setupLevel(page, SMALL_OCCLUDED_LEVEL_INDEX);

    const result = await page.evaluate(() => {
      const h = window.__tripletTestHooks;
      const board = document.getElementById('board');

      const occludedIds = h.getOccludedTileIds();
      if (occludedIds.length === 0) return { error: 'no occluded tiles at start' };

      const state = h.getState();

      // Pick the first occluded tile and find its direct cover (topmost tappable at same
      // position with same z-parity and strictly higher z).
      let occludedId = null;
      let coveringTileId = null;

      for (const oid of occludedIds) {
        const oTile = state.boardTiles.find(t => t.id === oid);
        if (!oTile) continue;
        const tappable = h.getTappableTiles();
        const cover = tappable.find(
          t =>
            t.x === oTile.x &&
            t.y === oTile.y &&
            t.z % 2 === oTile.z % 2 &&
            t.z > oTile.z
        );
        if (cover) {
          occludedId = oid;
          coveringTileId = cover.id;
          break;
        }
      }

      if (!occludedId || !coveringTileId) {
        return { error: 'no directly tappable cover found for any occluded tile' };
      }

      // Assert occluded tile has no DOM element before the pick
      const inDomBefore = !!board.querySelector(`[data-tile-id="${occludedId}"]`);

      // Pick the covering tile
      h.clickTileById(coveringTileId);

      // Assert occluded tile now has a DOM element
      const inDomAfter = !!board.querySelector(`[data-tile-id="${occludedId}"]`);

      // The covering tile should now be gone (it was picked / moved to tray)
      const coverInDomAfter = !!board.querySelector(`[data-tile-id="${coveringTileId}"]`);

      return { occludedId, coveringTileId, inDomBefore, inDomAfter, coverInDomAfter };
    });

    expect(result.error, result.error || undefined).toBeUndefined();
    expect(
      result.inDomBefore,
      'occluded tile should NOT be in DOM before its cover is picked'
    ).toBe(false);
    expect(
      result.inDomAfter,
      'occluded tile SHOULD be in DOM after its cover is picked'
    ).toBe(true);
    expect(
      result.coverInDomAfter,
      'covering tile should no longer be in DOM after it was picked'
    ).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Test 3: Single pick produces O(1) DOM mutations, not O(total tiles)
  // ---------------------------------------------------------------------------
  test('single tile pick produces bounded DOM mutations (not O(tile count))', async ({ page }) => {
    await setupLevel(page, MID_OCCLUDED_LEVEL_INDEX);

    const result = await page.evaluate(() => {
      const h = window.__tripletTestHooks;
      const board = document.getElementById('board');

      const totalTiles = h.getState().boardTiles.filter(t => !t.removed).length;

      // Observe DOM mutations on #board during a single pick
      const childRemovals = [];
      const childAdditions = [];
      const styleChanges = new Map(); // element key → count
      const classChanges = new Map();

      const observer = new MutationObserver(records => {
        for (const r of records) {
          if (r.type === 'childList') {
            childRemovals.push(...r.removedNodes);
            childAdditions.push(...r.addedNodes);
          } else if (r.type === 'attributes') {
            const el = r.target;
            const tileId = el.getAttribute && el.getAttribute('data-tile-id');
            const key = tileId ? `tile:${tileId}` : 'other';
            if (r.attributeName === 'style') {
              styleChanges.set(key, (styleChanges.get(key) || 0) + 1);
            } else if (r.attributeName === 'class') {
              classChanges.set(key, (classChanges.get(key) || 0) + 1);
            }
          }
        }
      });

      observer.observe(board, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'data-tile-id']
      });

      const tappable = h.getTappableTiles();
      h.clickTileById(tappable[0].id);

      observer.disconnect();

      return {
        totalTiles,
        childRemovals: childRemovals.length,
        childAdditions: childAdditions.length,
        styleChangeCount: styleChanges.size,
        classChangeCount: classChanges.size,
        totalStyleMutations: [...styleChanges.values()].reduce((a, b) => a + b, 0),
      };
    });

    // At most a handful of child mutations:
    // - 1 removal (the picked tile)
    // - 0 or 1 addition (a newly un-occluded tile)
    expect(
      result.childRemovals,
      'should remove at most 1 board tile (the picked one)'
    ).toBeLessThanOrEqual(1);
    expect(
      result.childAdditions,
      'should add at most 1 board tile (a newly un-occluded tile)'
    ).toBeLessThanOrEqual(1);

    // Style/class mutations should be O(dirty tappable changes), not O(total tiles).
    // The dirty set is typically 0–10 tiles even on the heaviest levels.
    expect(
      result.styleChangeCount,
      `style mutations (${result.styleChangeCount}) should be much less than total tiles (${result.totalTiles})`
    ).toBeLessThan(result.totalTiles * 0.2);
  });

  // ---------------------------------------------------------------------------
  // Test 4: Render stats reflect incremental behaviour on a pick
  // ---------------------------------------------------------------------------
  test('render stats show incremental path used with bounded mutations on pick', async ({
    page
  }) => {
    await setupLevel(page, MID_OCCLUDED_LEVEL_INDEX);

    const stats = await page.evaluate(() => {
      const h = window.__tripletTestHooks;
      const tappable = h.getTappableTiles();
      h.clickTileById(tappable[0].id);
      return h.getRenderStats();
    });

    expect(stats.isIncremental, 'pick should use the fast incremental path').toBe(true);
    expect(stats.removed, 'exactly 1 tile removed from DOM per pick').toBeLessThanOrEqual(1);

    // synced = number of dirty tappable tiles — should be a small fraction of the total DOM tiles
    const totalDom = stats.boardDomTileCount + stats.removed; // add back the removed tile
    expect(
      stats.synced,
      `synced tiles (${stats.synced}) should be much less than total DOM tiles (~${totalDom})`
    ).toBeLessThan(Math.max(5, totalDom * 0.15));
  });

  // ---------------------------------------------------------------------------
  // Test 5: Full render pass skips unchanged tiles on a second run
  // ---------------------------------------------------------------------------
  test('second full render skips tiles whose tappable state and layout are unchanged', async ({
    page
  }) => {
    await setupLevel(page, MID_OCCLUDED_LEVEL_INDEX);

    const stats = await page.evaluate(() => {
      const h = window.__tripletTestHooks;
      // The initial full render (from startLevel) has already populated _lastRenderedTileState.
      // A second full render with the same layout and no tappable-state changes should skip most tiles.
      h.triggerFullRenderForTest();
      return h.getRenderStats();
    });

    expect(stats.isIncremental, 'triggerFullRenderForTest uses the full path').toBe(false);
    expect(
      stats.skipped,
      `second full render should skip some unchanged tiles (got ${stats.skipped})`
    ).toBeGreaterThan(0);
    expect(
      stats.skipped,
      `most tiles should be skipped on second pass (skipped=${stats.skipped} vs domCount=${stats.boardDomTileCount})`
    ).toBeGreaterThan(stats.boardDomTileCount * 0.5);
  });

  // ---------------------------------------------------------------------------
  // Test 6: Heavy level DOM reduction — occlusion culling has significant impact
  // ---------------------------------------------------------------------------
  test('heavy level DOM count is substantially reduced by occlusion culling', async ({ page }) => {
    // Only run if the heavy level is available (requires levels.generated.js with 30+ levels)
    await setupLevel(page, HEAVY_LEVEL_INDEX);

    const result = await page.evaluate(() => {
      const h = window.__tripletTestHooks;
      const state = h.getState();
      const nonRemoved = state.boardTiles.filter(t => !t.removed).length;
      const occluded = h.getOccludedTileCount();
      const domCount = document.getElementById('board').querySelectorAll('[data-tile-id]').length;
      return { nonRemoved, occluded, domCount };
    });

    // Verify the invariant holds
    expect(result.domCount).toBe(result.nonRemoved - result.occluded);

    // On the heavy level (~546 tiles, ~410 occluded) the DOM node count should be
    // substantially less than the total non-removed tiles.
    expect(
      result.occluded,
      `heavy level should have many occluded tiles (got ${result.occluded} of ${result.nonRemoved})`
    ).toBeGreaterThan(result.nonRemoved * 0.3);
    expect(
      result.domCount,
      `heavy level DOM node count (${result.domCount}) should be well below total tiles (${result.nonRemoved})`
    ).toBeLessThan(result.nonRemoved * 0.75);
  });
});
