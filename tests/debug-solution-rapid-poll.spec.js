/**
 * Run manually to see whether rapid-click + full animations eventually finish or stall.
 *
 *   npx playwright test tests/debug-solution-rapid-poll.spec.js --workers=1
 *
 * Output: timestamped lines with engine snapshot every 1s after the click burst.
 * - boardLeft decreasing over time => work still draining (ongoing).
 * - boardLeft flat for many ticks while queues non-empty => likely stuck.
 */
const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { solveLevel } = require('../tools/levelgen/solver');

const GAME_LEVEL_INDEX = 2;

function loadGeneratedLevels() {
  const filePath = path.resolve(__dirname, '../levels.generated.js');
  const src = fs.readFileSync(filePath, 'utf8');
  const marker = 'window.__TRIPLET_GENERATED_LEVELS__ = ';
  const jsonStart = src.indexOf(marker) + marker.length;
  const jsonEnd = src.lastIndexOf(';\n');
  return JSON.parse(src.slice(jsonStart, jsonEnd).trim());
}

function logLine(msg) {
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[${ts}] ${msg}`);
}

const runPoll = process.env.RUN_SOLUTION_DEBUG === '1';

test.describe('debug (manual)', () => {
  (runPoll ? test : test.skip)('poll engine after rapid solution clicks (animations on)', async ({ page }) => {
    test.setTimeout(180000);

    page.on('console', msg => {
      if (msg.type() === 'error') {
        logLine(`browser console error: ${msg.text()}`);
      }
    });

    const levels = loadGeneratedLevels();
    const level = levels[0];
    const result = solveLevel(level, { mode: 'exact', maxNodes: 250000 });
    const solutionTileIds = result.solution.map(idx => `t_${GAME_LEVEL_INDEX}_${idx}`);

    await page.goto('/');
    await page.waitForSelector('#board');
    await page.evaluate(() => {
      window.__tripletTestHooks.resetAllProgress();
      window.__tripletTestHooks.setSkipAnimations(false);
    });
    await page.waitForSelector('#board .tile');
    await page.evaluate(idx => window.__tripletTestHooks.startLevel(idx), GAME_LEVEL_INDEX);
    await page.waitForSelector('#board .tile');

    const beforeBurst = await page.evaluate(() => window.__tripletTestHooks.getEngineDebugSnapshot());
    logLine(`before burst: ${JSON.stringify(beforeBurst)}`);

    logLine(`firing ${solutionTileIds.length} clickTileById calls (no waitForActionComplete between)...`);
    for (let i = 0; i < solutionTileIds.length; i += 1) {
      await page.evaluate(id => window.__tripletTestHooks.clickTileById(id), solutionTileIds[i]);
    }

    const rightAfterBurst = await page.evaluate(() => window.__tripletTestHooks.getEngineDebugSnapshot());
    logLine(`immediately after burst: ${JSON.stringify(rightAfterBurst)}`);

    let prevBoard = rightAfterBurst.boardLeft;
    let stagnantTicks = 0;
    const maxPolls = 90;
    const intervalMs = 1000;

    for (let tick = 0; tick < maxPolls; tick += 1) {
      await page.waitForTimeout(intervalMs);
      const snap = await page.evaluate(() => window.__tripletTestHooks.getEngineDebugSnapshot());
      const s = await page.evaluate(() => {
        const st = window.__tripletTestHooks.getState();
        return { isLevelOver: st.isLevelOver, overlayHidden: document.getElementById('overlay')?.classList.contains('hidden') };
      });

      const delta = snap.boardLeft - prevBoard;
      if (snap.boardLeft === prevBoard) {
        stagnantTicks += 1;
      } else {
        stagnantTicks = 0;
      }
      prevBoard = snap.boardLeft;

      logLine(
        `tick ${tick + 1}/${maxPolls} boardLeft=${snap.boardLeft} (Δ${delta}) tray=${snap.trayLen} ` +
          `levelOver=${s.isLevelOver} overlayHidden=${s.overlayHidden} ` +
          `waitQ=${snap.waitingForRoomLen} fly=${snap.hasCurrentFly} applyQ=${snap.applyQueueLen} ` +
          `applyRun=${snap.applyRunning} combine=${snap.combiningTypesLen} moveAnim=${snap.isMoveAnimating} ` +
          `stagnant=${stagnantTicks}s`
      );

      if (s.isLevelOver && !s.overlayHidden) {
        logLine('WIN: level over and overlay visible — engine finished.');
        return;
      }
      if (s.isLevelOver) {
        logLine('NOTE: isLevelOver true but overlay still hidden (unexpected)');
      }

      if (stagnantTicks >= 15 && snap.boardLeft > 0) {
        logLine(
          `STUCK? boardLeft unchanged for ${stagnantTicks}s while tiles remain; ` +
            `waitingForRoom=${snap.waitingForRoomLen} fly=${snap.hasCurrentFly} combine=${snap.combiningTypesLen}`
        );
      }
    }

    const final = await page.evaluate(() => ({
      snap: window.__tripletTestHooks.getEngineDebugSnapshot(),
      state: window.__tripletTestHooks.getState()
    }));
    logLine(`final after ${maxPolls}s poll: ${JSON.stringify(final.snap)}`);
  });
});
