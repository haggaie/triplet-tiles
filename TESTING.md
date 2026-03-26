# Triplet Tiles Testing

This project uses **Playwright** for browser-based end-to-end tests that exercise the real `index.html` and `game.js` implementation.

## Setup

1. Install dependencies (from the project root):

```bash
npm install
```

2. Install Playwright browsers (only needed once):

```bash
npx playwright install
```

## Running the tests

To run the full E2E suite in headless mode:

```bash
npx playwright test
```

To run tests in headed mode for debugging:

```bash
npx playwright test --headed
```

The Playwright configuration in `playwright.config.js` starts a simple static server that serves `index.html` and related assets from the project root before the tests execute.

**Service worker:** `index.html` registers `sw.js` for offline play. Playwright sets `serviceWorkers: 'block'` so tests always load assets from the static server (no stale cache). For manual QA of offline mode, use a normal browser tab and DevTools → Network → Offline. If you see stale assets while developing, DevTools → Application → Service Workers → **Unregister**, or bump `CACHE_NAME` in `sw.js` when the precache list changes.

## Keyboard and focus (manual)

- **Tab order**: Header (Levels, Restart) → score (not focusable) → power-up buttons → **`#board`** (one tab stop when not in Remove Type mode) → **`#tray`** only after activating **Remove Type** with tiles in the tray (then `#board` is `tabindex="-1"` until the mode ends). Empty slots are skipped.
- **Board**: When a level loads (and after choosing a level from the carousel), **`#board` is focused automatically** if there are moves to make. The scrollport **`#board-scroll` is not focusable** (no extra tab stop); **`.board-scroll-align`** uses **`pointer-events: none`** with **`#board`** restoring hits so padding doesn’t steal clicks/focus; a **`focusin`** guard on `#board-scroll` moves stray focus back to **`#board`** (or **`#tray`** in Remove Type mode). When the board highlight moves, **`scrollIntoView`** on the active tile pans the scroll region as needed. **Arrow keys** move in **left / right / up / down** screen directions: first the nearest tappable **in** that direction; if none, **wrap** to the **far edge** of the opposite side (e.g. **Left** from the leftmost column jumps to the **rightmost** column, tie-broken by row alignment); then perpendicular straddles; last resort, nearest tappable. **Enter** or **Space** collects the highlighted tile; after a pick, focus jumps immediately (no need to wait for the fly animation) to a tile **below** the one you took when possible, else the nearest remaining tappable. **Shift+Tab** moves backward through the same chrome as Tab.
- **Remove Type**: Click **Remove Type** → focus moves to **`#tray`**; **Arrow keys** move among filled slots; **Enter** / **Space** removes that tile’s type from board and tray; **Escape** cancels without using a charge.
- **Screen readers**: Active tile is exposed via `aria-activedescendant` on `#board` or `#tray` while that region has focus.

## What is covered

- Core tray mechanics, matching rules, and overflow loss behavior (`tests/game-core.spec.js`).
- Board keyboard: auto-focus on load, spatial arrow movement, post-pick focus id (`tests/board-keyboard.spec.js`).
- Power-ups: undo, shuffle, and remove tile type, including button enable/disable logic (`tests/powerups.spec.js`) — plus **Remove Type** tray focus, **arrow + Enter** confirmation, **Escape** cancel, and board `tabIndex` while the mode is active.
- Level progression, win/loss overlays, and `localStorage`-backed stats and progression (`tests/progression-stats.spec.js`).
- Mobile layouts: several portrait/landscape viewports, level select overlay, and iPhone-style viewport/UA/DPR (`tests/mobile-viewport.spec.js`) — asserts **no horizontal page overflow**, **tiles fully inside** `#board` (not clipped by `overflow: hidden`), **`#board` pixel size matches** `measureBoardLayout` for the level’s `gridWidth`/`gridHeight`, **full board visible** in the viewport after scroll, and that `#board` / `#tray` stay within the viewport width.
- **Audio:** `tests/audio-sfx.spec.js` — after a click on `#app`, asserts SFX buffers finished decoding (`sfxBuffersLoaded`) and the Web Audio context is usable (`getAudioDiagnostics()` via `window.__tripletTestHooks`). Does not assert that speakers produce sound.

Run only mobile layout checks:

```bash
npx playwright test tests/mobile-viewport.spec.js
```

