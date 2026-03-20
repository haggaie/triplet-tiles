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

## What is covered

- Core tray mechanics, matching rules, and overflow loss behavior (`tests/game-core.spec.js`).
- Power-ups: undo, shuffle, and remove tile type, including button enable/disable logic (`tests/powerups.spec.js`).
- Level progression, win/loss overlays, and `localStorage`-backed stats and progression (`tests/progression-stats.spec.js`).
- Mobile layouts: several portrait/landscape viewports, level select overlay, and iPhone-style viewport/UA/DPR (`tests/mobile-viewport.spec.js`) — asserts **no horizontal page overflow**, **tiles fully inside** `#board` (not clipped by `overflow: hidden`), **square playfield** (`width ≈ height`), **full board visible** in the viewport after scroll, and that `#board` / `#tray` stay within the viewport width.

Run only mobile layout checks:

```bash
npx playwright test tests/mobile-viewport.spec.js
```

