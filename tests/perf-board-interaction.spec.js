/**
 * Deterministic board interaction perf: last heavy level vs early baseline.
 * Run with low contention: `npx playwright test tests/perf-board-interaction.spec.js --workers=1`
 * Optional CPU throttle (Chromium): `PERF_CPU_THROTTLE=4 npx playwright test ...`
 */
const { test, expect } = require('@playwright/test');

/** Last slot in LEVELS → UI “level 32” (two tutorials + last generated). */
const HEAVY_LEVEL_INDEX = 31;
/** Large level before the final slot — enough depth for 10+ timed picks; fewer tiles than index 31 (~375 vs ~546). */
const BASELINE_LEVEL_INDEX = 29;
const MAX_TIMED_MOVES = 20;
const WARMUP_MOVES = 3;
const MEDIAN_REPS = 5;

function medianOf(nums) {
  const s = nums.filter((n) => Number.isFinite(n)).slice().sort((a, b) => a - b);
  if (s.length === 0) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * User Timing measures nest: `renderBoard` includes `getTappableTiles` and `getBoardFitRectPx` time.
 * Per-rep: divide measure totals by that rep's move count so wall ms/pick matches renderBoard breakdown.
 * @param {Array<{ totalMs: number, moves: number, measureSums: { renderBoard: number, getTappableTiles: number, getBoardFitRectPx: number } }>} samples
 */
function computeHotspotsFromSamples(samples) {
  const perRep = samples
    .filter((s) => s.moves > 0)
    .map((s) => {
      const { totalMs, moves, measureSums: m } = s;
      const rb = m.renderBoard;
      const tap = m.getTappableTiles;
      const fit = m.getBoardFitRectPx;
      /** `getBoardFitRectPx` is nested inside `renderBoard`; this % is meaningful. */
      const fitPctOfRenderBoard = rb > 0 ? (fit / rb) * 100 : 0;
      /**
       * Sum of `getTappableTiles` measures includes the harness probe before each click plus
       * in-renderBoard calls — do not subtract from `renderBoard` or treat as % of it.
       */
      const approxRenderBoardMinusLayoutReads = Math.max(0, rb - fit);
      return {
        wallMsPerPick: totalMs / moves,
        renderBoardMsPerPick: rb / moves,
        getTappableTilesMsPerPick: tap / moves,
        getBoardFitRectPxMsPerPick: fit / moves,
        getBoardFitRectPxPctOfRenderBoard: fitPctOfRenderBoard,
        approxRestOfRenderBoardMsPerPick: approxRenderBoardMinusLayoutReads / moves
      };
    });
  const pick = (fn) => medianOf(perRep.map(fn));
  return {
    medianMoves: medianOf(samples.map((s) => s.moves)),
    medianWallMsPerPick: pick((r) => r.wallMsPerPick),
    medianRenderBoardMsPerPick: pick((r) => r.renderBoardMsPerPick),
    medianGetTappableTilesMsPerPick: pick((r) => r.getTappableTilesMsPerPick),
    medianGetBoardFitRectPxMsPerPick: pick((r) => r.getBoardFitRectPxMsPerPick),
    medianGetBoardFitRectPxPctOfRenderBoard: pick((r) => r.getBoardFitRectPxPctOfRenderBoard),
    medianApproxRestOfRenderBoardMsPerPick: pick((r) => r.approxRestOfRenderBoardMsPerPick),
    perRep
  };
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} levelIndex
 */
async function runScenarioOnce(page, levelIndex) {
  return page.evaluate(
    ({ levelIndex: idx, maxTimedMoves, warmupMoves }) => {
      const h = window.__tripletTestHooks;
      if (!h) throw new Error('__tripletTestHooks missing');

      h.clearPerfEntriesForTest();
      h.resetAllProgress();
      h.setShuffleRandomForTest(() => 0.5);
      h.setSkipAnimations(true);
      h.setPerfMarksEnabled(true);
      h.startLevel(idx);

      for (let i = 0; i < warmupMoves; i++) {
        const t = h.getTappableTiles();
        if (t.length === 0 || h.getState().isLevelOver) break;
        h.clickTileById(t[0].id);
      }

      /** Drop measures from startLevel + warmup so sums match the timed loop only. */
      h.clearPerfEntriesForTest();

      let longTaskCount = 0;
      let longTaskMax = 0;
      let obs = null;
      try {
        obs = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            longTaskCount += 1;
            if (e.duration > longTaskMax) longTaskMax = e.duration;
          }
        });
        obs.observe({ entryTypes: ['longtask'] });
      } catch {
        /* Long Task API not supported */
      }

      const t0 = performance.now();
      let moves = 0;
      for (; moves < maxTimedMoves; moves += 1) {
        const tap = h.getTappableTiles();
        if (tap.length === 0 || h.getState().isLevelOver) break;
        h.clickTileById(tap[0].id);
      }
      const totalMs = performance.now() - t0;

      if (obs) obs.disconnect();

      const entries = performance.getEntriesByType('measure');
      const sumByName = (name) =>
        entries.filter((e) => e.name === name).reduce((acc, e) => acc + e.duration, 0);

      h.setPerfMarksEnabled(false);

      return {
        totalMs,
        moves,
        levelIndex: idx,
        longTaskCount,
        longTaskMax,
        measureSums: {
          renderBoard: sumByName('renderBoard'),
          getTappableTiles: sumByName('getTappableTiles'),
          getBoardFitRectPx: sumByName('getBoardFitRectPx')
        },
        boardLeft: h.getState().boardTiles.filter((t) => !t.removed).length
      };
    },
    { levelIndex, maxTimedMoves: MAX_TIMED_MOVES, warmupMoves: WARMUP_MOVES }
  );
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} levelIndex
 */
async function medianRun(page, levelIndex) {
  const samples = [];
  for (let rep = 0; rep < MEDIAN_REPS; rep += 1) {
    samples.push(await runScenarioOnce(page, levelIndex));
  }

  const medianMoves = medianOf(samples.map((s) => s.moves));
  const medianTotalMs = medianOf(samples.map((s) => s.totalMs));
  const msPerMoveSamples = samples.filter((s) => s.moves > 0).map((s) => s.totalMs / s.moves);
  const medianMsPerMove = medianOf(msPerMoveSamples);

  const medSum = (key) => medianOf(samples.map((s) => s.measureSums[key]));

  return {
    levelIndex,
    samples,
    medianMoves,
    medianTotalMs,
    medianMsPerMove,
    measureSumsMedian: {
      renderBoard: medSum('renderBoard'),
      getTappableTiles: medSum('getTappableTiles'),
      getBoardFitRectPx: medSum('getBoardFitRectPx')
    },
    longTaskMedian: {
      count: medianOf(samples.map((s) => s.longTaskCount)),
      maxDur: medianOf(samples.map((s) => s.longTaskMax))
    }
  };
}

test.describe('perf board interaction', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ viewport: { width: 412, height: 915 } });

  test.beforeEach(async ({ page, context }) => {
    if (process.env.PERF_CPU_THROTTLE) {
      const session = await context.newCDPSession(page);
      await session.send('Emulation.setCPUThrottlingRate', {
        rate: Number(process.env.PERF_CPU_THROTTLE) || 4
      });
    }
    await page.goto('/');
    await page.locator('#app').waitFor();
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      const h = window.__tripletTestHooks;
      if (!h) return;
      h.setPerfMarksEnabled(false);
      h.setShuffleRandomForTest(null);
    });
  });

  test('heavy vs baseline: median timings + User Timing sums + long tasks', async ({ page }) => {
    const heavy = await medianRun(page, HEAVY_LEVEL_INDEX);
    const baseline = await medianRun(page, BASELINE_LEVEL_INDEX);

    const ratioMsPerMove =
      baseline.medianMsPerMove > 0 ? heavy.medianMsPerMove / baseline.medianMsPerMove : null;

    const hotspotsHeavy = computeHotspotsFromSamples(heavy.samples);
    const hotspotsBaseline = computeHotspotsFromSamples(baseline.samples);

    const summary = {
      viewport: { width: 412, height: 915 },
      maxTimedMoves: MAX_TIMED_MOVES,
      warmupMoves: WARMUP_MOVES,
      medianReps: MEDIAN_REPS,
      heavy,
      baseline,
      ratioMsPerMove,
      hotspots: {
        /** Interpretation: optimize where % of renderBoard grows on heavy vs baseline. */
        heavy: hotspotsHeavy,
        baseline: hotspotsBaseline
      }
    };

    const fmtPct = (n) => `${n.toFixed(1)}%`;
    const fmtMs = (n) => `${n.toFixed(3)} ms`;
    // eslint-disable-next-line no-console
    console.log(`
[perf-board-interaction] Hotspots (median of per-rep ms/pick over ${MEDIAN_REPS} reps)

  HEAVY level (index ${HEAVY_LEVEL_INDEX}, UI level ${HEAVY_LEVEL_INDEX + 1})
    Wall time / pick:           ${fmtMs(hotspotsHeavy.medianWallMsPerPick)}  (click path: probe + pick + tray + hud + …)
    renderBoard / pick:         ${fmtMs(hotspotsHeavy.medianRenderBoardMsPerPick)}
    getBoardFitRectPx / pick:     ${fmtMs(hotspotsHeavy.medianGetBoardFitRectPxMsPerPick)}  (${fmtPct(hotspotsHeavy.medianGetBoardFitRectPxPctOfRenderBoard)} of renderBoard — layout reads; good cache target)
    approx rest of renderBoard: ${fmtMs(hotspotsHeavy.medianApproxRestOfRenderBoardMsPerPick)}  (DOM tile loop, inner tappable, offsets, …; nested overlap — see TESTING.md)
    getTappableTiles sum / pick:  ${fmtMs(hotspotsHeavy.medianGetTappableTilesMsPerPick)}  (includes harness probe + in-board; rises with N² on heavy levels)
    Long tasks (median): count=${heavy.longTaskMedian.count}, max=${fmtMs(heavy.longTaskMedian.maxDur)}

  BASELINE level (index ${BASELINE_LEVEL_INDEX})
    Wall time / pick:           ${fmtMs(hotspotsBaseline.medianWallMsPerPick)}
    getBoardFitRectPx % of RB:  ${fmtPct(hotspotsBaseline.medianGetBoardFitRectPxPctOfRenderBoard)}  vs heavy ${fmtPct(hotspotsHeavy.medianGetBoardFitRectPxPctOfRenderBoard)}
    getTappableTiles sum / pick: ${fmtMs(hotspotsBaseline.medianGetTappableTilesMsPerPick)}  vs heavy ${fmtMs(hotspotsHeavy.medianGetTappableTilesMsPerPick)}

  Ratio wall ms/pick (heavy / baseline): ${ratioMsPerMove != null ? ratioMsPerMove.toFixed(2) : 'n/a'}
`);

    await test.info().attach('perf-board-interaction.json', {
      body: JSON.stringify(summary, null, 2),
      contentType: 'application/json'
    });

    expect(heavy.medianMoves, 'heavy level should complete enough timed picks').toBeGreaterThanOrEqual(10);
    expect(baseline.medianMoves, 'baseline level should complete enough timed picks').toBeGreaterThanOrEqual(
      10
    );

    expect(heavy.medianMsPerMove, 'per-pick cost should be positive').toBeGreaterThan(0);
    expect(baseline.medianMsPerMove, 'baseline per-pick cost should be positive').toBeGreaterThan(0);

    expect(
      heavy.medianMsPerMove,
      'last heavy level should cost more per pick than early baseline (sanity check for benchmark)'
    ).toBeGreaterThan(baseline.medianMsPerMove);
  });
});
