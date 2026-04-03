# Triplet Tiles

A casual, offline-friendly puzzle game: tap exposed tiles on a **layered** board (mahjong-style stacking) into a **7-slot tray**. Match **three identical** tiles to clear them; clear the board to win. Fill the tray past capacity and you lose.

## Build and run locally

**Requirements:** [Node.js](https://nodejs.org/) (includes `npm`).

1. **Install dependencies** (this also runs a first build via the `prepare` hook):

   ```bash
   npm install
   ```

2. **Build** generated assets (levels, icons, native bits):

   ```bash
   npm run build
   ```

   Skip this if you just ran `npm install` and nothing changed—`prepare` already built once.

3. **Serve the project root** and open the app in a browser. From the repo root, use the included static server (default port **4173**):

   ```bash
   node scripts/playwright-static-server.js
   ```

   Then visit [http://127.0.0.1:4173/](http://127.0.0.1:4173/). Pass another port as the first argument if 4173 is busy.

Alternatively, any static file server pointed at this directory works (for example `npx serve .`).

## Optional

- **Full static bundle** (with optimized audio; needs `ffmpeg` on `PATH`): `npm run prepare:serve`
- **Unit tests:** `npm run test:unit`
- **E2E tests:** `npm run test:e2e`
