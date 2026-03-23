'use strict';

/**
 * Samples opacity/visibility per rAF frame while scripted moves run, then flags A→B→A
 * oscillation on the same logical element within three consecutive frames (cross-frame flicker).
 * Skips `position: fixed` nodes (fly-layer clones).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string[]} tileIds
 * @param {{ maxMoves?: number; tailMs?: number }} [options]
 */
async function runTemporalOscillationProbe(page, tileIds, options = {}) {
  const maxMoves = options.maxMoves ?? Math.min(4, tileIds.length);
  const tailMs = options.tailMs ?? 280;
  const ids = tileIds.slice(0, Math.min(maxMoves, tileIds.length));
  return page.evaluate(
    async ({ tileIds: moveIds, tailMs: tailWait }) => {
      const board = document.getElementById('board');
      const tray = document.getElementById('tray');
      if (!board || !tray) {
        return { oscillationDetected: false, error: 'missing board or tray', samples: 0, samplesDetail: [] };
      }

      const snapshots = [];
      let rafId = 0;
      let running = true;

      function sampleFrame() {
        const t = performance.now();
        const cells = {};
        for (const el of board.querySelectorAll('.tile')) {
          const id = el.getAttribute('data-tile-id');
          if (!id) continue;
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed') continue;
          cells[`board:${id}`] = { op: cs.opacity, vis: cs.visibility };
        }
        const slots = Array.from(tray.querySelectorAll('.tray-slot'));
        for (let idx = 0; idx < slots.length; idx += 1) {
          const slot = slots[idx];
          const tile = slot.querySelector('.tray-tile');
          const key = `tray:${idx}`;
          if (!tile) {
            cells[key] = { op: '', vis: '' };
            continue;
          }
          const cs = getComputedStyle(tile);
          cells[key] = { op: cs.opacity, vis: cs.visibility };
        }
        snapshots.push({ t, cells });
      }

      function loop() {
        sampleFrame();
        if (running) rafId = requestAnimationFrame(loop);
      }

      rafId = requestAnimationFrame(loop);

      const hooks = window.__tripletTestHooks;
      hooks.setSkipAnimations(false);

      for (const tileId of moveIds) {
        await hooks.clickTileById(tileId);
        await hooks.waitForActionComplete();
      }

      await new Promise(r => setTimeout(r, tailWait));
      running = false;
      if (rafId) cancelAnimationFrame(rafId);

      function opClose(a, b) {
        const x = parseFloat(a);
        const y = parseFloat(b);
        if (Number.isNaN(x) || Number.isNaN(y)) return a === b;
        return Math.abs(x - y) < 0.02;
      }

      const keys = new Set();
      for (const snap of snapshots) {
        Object.keys(snap.cells).forEach(k => keys.add(k));
      }

      const samplesDetail = [];
      let oscillationDetected = false;
      /** Real rAF frame index — ignore early frames (pick/fly) where visibility can strobe in samples. */
      const warmupFrameIndex = 20;

      for (const key of keys) {
        for (let fi = warmupFrameIndex; fi + 2 < snapshots.length; fi += 1) {
          const c0 = snapshots[fi].cells[key];
          const c1 = snapshots[fi + 1].cells[key];
          const c2 = snapshots[fi + 2].cells[key];
          if (!c0 || !c1 || !c2) continue;
          const a = { vis: c0.vis, op: c0.op };
          const b = { vis: c1.vis, op: c1.op };
          const c = { vis: c2.vis, op: c2.op };
          const visOsc =
            a.vis === c.vis &&
            a.vis !== b.vis &&
            a.vis &&
            b.vis;
          const opOsc =
            opClose(a.op, c.op) &&
            !opClose(a.op, b.op) &&
            a.op !== '' &&
            b.op !== '';
          if (visOsc || opOsc) {
            oscillationDetected = true;
            samplesDetail.push({ key, frameIndex: fi, visOsc, opOsc, triple: [a, b, c] });
            break;
          }
        }
      }

      return {
        oscillationDetected,
        samples: snapshots.length,
        samplesDetail: samplesDetail.slice(0, 8)
      };
    },
    { tileIds: ids, tailMs }
  );
}

module.exports = { runTemporalOscillationProbe };
