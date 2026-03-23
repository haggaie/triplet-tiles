'use strict';

/**
 * Playwright helper: runs a browser-side probe that counts DOM `style` attribute mutations
 * per requestAnimationFrame frame. Multiple writes to the same tile/tray slot in one frame
 * suggest flicker (e.g. visibility/opacity thrash). `class` is observed but not counted as flicker —
 * renderBoard legitimately toggles many classes per frame.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string[]} tileIds  Full solution order; only the first `maxMoves` are played.
 * @param {{ maxMoves?: number }} [options]
 * @returns {Promise<{ flickerDetected: boolean; offending: [string, number][]; totalMutations: number; error?: string }>}
 */
async function runStyleChurnProbe(page, tileIds, options = {}) {
  const maxMoves = options.maxMoves ?? tileIds.length;
  const ids = tileIds.slice(0, Math.min(maxMoves, tileIds.length));
  return page.evaluate(
    async ({ tileIds: moveIds }) => {
      const board = document.getElementById('board');
      const tray = document.getElementById('tray');
      if (!board || !tray) return { flickerDetected: false, error: 'missing board or tray', offending: [], totalMutations: 0 };

      const mutationLog = [];
      let currentFrameId = 0;
      let rafId;

      function getElementKey(el) {
        const tileId = el.getAttribute && el.getAttribute('data-tile-id');
        if (tileId) return `board:${tileId}`;
        const slot = el.closest && el.closest('.tray-slot');
        if (slot && tray.contains(slot)) {
          const idx = Array.from(tray.querySelectorAll('.tray-slot')).indexOf(slot);
          return `tray:${idx}`;
        }
        return null;
      }

      function tick() {
        currentFrameId += 1;
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);

      const observer = new MutationObserver(records => {
        for (const r of records) {
          if (!r.attributeName) continue;
          const key = getElementKey(r.target);
          if (key) mutationLog.push({ frameId: currentFrameId, elementKey: key, attribute: r.attributeName });
        }
      });

      observer.observe(board, { attributes: true, attributeFilter: ['style', 'class'], subtree: true });
      observer.observe(tray, { attributes: true, attributeFilter: ['style', 'class'], subtree: true });

      const hooks = window.__tripletTestHooks;
      hooks.setSkipAnimations(false);

      for (const tileId of moveIds) {
        await hooks.clickTileById(tileId);
        await hooks.waitForActionComplete();
      }

      cancelAnimationFrame(rafId);
      observer.disconnect();

      const byFrame = {};
      for (const { frameId, elementKey, attribute } of mutationLog) {
        const k = `${frameId}:${elementKey}:${attribute}`;
        byFrame[k] = (byFrame[k] || 0) + 1;
      }
      const styleKey = k => k.endsWith(':style');
      const offending = Object.entries(byFrame).filter(([k, count]) => styleKey(k) && count > 1);
      const flickerDetected = offending.length > 0;
      return {
        flickerDetected,
        offending: offending.slice(0, 10),
        totalMutations: mutationLog.length
      };
    },
    { tileIds: ids }
  );
}

module.exports = { runStyleChurnProbe };
