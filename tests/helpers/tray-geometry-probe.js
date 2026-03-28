'use strict';

/**
 * rAF-samples tray slot tile centers during scripted moves; flags a "teleport"
 * when center-x jumps between consecutive frames while fly/combine animations are idle.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string[]} tileIds
 * @param {{ maxMoves?: number, tailMs?: number, teleportWidthFactor?: number }} [options]
 */
async function runTrayGeometryProbe(page, tileIds, options = {}) {
  const maxMoves = options.maxMoves ?? Math.min(4, tileIds.length);
  const tailMs = options.tailMs ?? 400;
  const teleportWidthFactor = options.teleportWidthFactor ?? 0.55;
  const ids = tileIds.slice(0, Math.min(maxMoves, tileIds.length));

  return page.evaluate(
    async ({ moveIds, tailWait, widthFactor }) => {
      const trayEl = document.getElementById('tray');
      const hooks = window.__tripletTestHooks;
      if (!trayEl || !hooks) {
        return {
          teleportDetected: false,
          error: 'missing tray or hooks',
          frames: 0,
          detail: []
        };
      }

      const frames = [];
      let rafId = 0;
      let running = true;

      function sampleFrame() {
        const tray = document.getElementById('tray');
        const snap = hooks.getEngineDebugSnapshot();
        const slots = [];
        if (tray) {
          const slotEls = tray.querySelectorAll('.tray-slot');
          for (let i = 0; i < slotEls.length; i += 1) {
            const tile = slotEls[i].querySelector('.tray-tile');
            if (!tile) {
              slots.push({ idx: i, cx: null });
              continue;
            }
            const r = tile.getBoundingClientRect();
            slots.push({ idx: i, cx: r.left + r.width / 2 });
          }
        }
        const skipMotionLayer =
          !!document.body.querySelector('.tile-combining, .tile-flying');
        frames.push({ t: performance.now(), slots, snap, skipMotionLayer });
      }

      function loop() {
        sampleFrame();
        if (running) rafId = requestAnimationFrame(loop);
      }

      rafId = requestAnimationFrame(loop);

      hooks.setSkipAnimations(false);

      for (const tileId of moveIds) {
        await hooks.clickTileById(tileId);
        await hooks.waitForActionComplete();
      }

      await new Promise(r => setTimeout(r, tailWait));
      running = false;
      if (rafId) cancelAnimationFrame(rafId);

      function tileTeleportThresholdPx() {
        const tray = document.getElementById('tray');
        const t = tray && tray.querySelector('.tray-tile');
        if (t) return Math.max(28, t.getBoundingClientRect().width * widthFactor);
        return 48;
      }

      const threshold = tileTeleportThresholdPx();
      let teleportDetected = false;
      const detail = [];
      /** Ignore first frames: layout/locale settle. */
      const warmupFrames = 12;

      for (let fi = Math.max(1, warmupFrames); fi < frames.length; fi += 1) {
        const prev = frames[fi - 1];
        const cur = frames[fi];
        const fly = cur.snap.hasCurrentFly || prev.snap.hasCurrentFly;
        const motionLayer = cur.skipMotionLayer || prev.skipMotionLayer;
        if (fly || motionLayer) continue;

        for (const p of prev.slots) {
          if (p.cx == null) continue;
          const c = cur.slots.find(s => s.idx === p.idx);
          if (!c || c.cx == null) continue;
          const dx = Math.abs(c.cx - p.cx);
          if (dx > threshold) {
            teleportDetected = true;
            detail.push({ frameIndex: fi, slotIdx: p.idx, dx: Math.round(dx * 10) / 10, threshold });
          }
        }
      }

      return {
        teleportDetected,
        frames: frames.length,
        threshold,
        detail: detail.slice(0, 16)
      };
    },
    { moveIds: ids, tailWait: tailMs, widthFactor: teleportWidthFactor }
  );
}

module.exports = { runTrayGeometryProbe };
