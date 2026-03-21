## Level Generation & Difficulty Pipeline

This document describes how the Triplet Tiles level generator and solver work, how to use them, and how the current scheme is tuned.

---

### 1. High-level design

- **Goal**: Produce many multi-layer levels that:
  - Respect the game’s tile and coverage rules.
  - **Use at most one tile per (x, y, z) position** — no two tiles may share the same cell and layer.
  - Are provably solvable by an automated solver.
  - Are roughly ordered from easiest to hardest using spec-aligned difficulty metrics.
- **Key pieces**:
  - Shape templates → 2D silhouettes (`templates.js`).
  - Generator → shuffles tile types (uniform multiset permutation) and turns them into 3D layouts (`generator.js`); solvability is enforced by the solver during generation, not by sequence construction.
  - Solver → validates solvability using the same rules as `game.js` (`solver.js`).
  - Scoring → turns solver-derived metrics into a single difficulty score (`score.js`).
  - CLI → runs the whole pipeline and writes `levels.generated.js` (`generate-levels.js`).

All of this runs at **build time**. At runtime, the game simply loads `levels.generated.js` and plays those levels.

### Level configuration

| Metric | Target range | Current generation target |
| --- | --- | --- |
| Grid dimensions | width 7–8, height 7–13 | `gridWidth` × `gridHeight` (portrait batches use height ≥ width; `gridWidth` ≤ 8) |
| Tile count | 61-120 (most levels) | ~48-120 with emphasis on 60+ |
| Layers/depth | 4-10 (most levels) | 4-10 |
| Tile type count | mostly 12 | 7-12 with medium/hard at 12 |
| Difficulty score | ~0.34-0.76 | intentionally pushed upward via deeper stacks and tighter slack constraints |
| Min tray slack | mostly 1 | medium/hard batches require solver minSlack <= 1 |

---

### 2. Data flow & files

- **Config**: `tools/levelgen/config.js`
  - Global:
    - `seed`: base RNG seed for reproducible generation.
    - `generationMode`: `'batches'` (default) or `'randomPool'`. With `'batches'`, the CLI uses the `levels` array and applies per-batch constraints. With `'randomPool'`, it generates a large pool of random candidates, keeps only solvable ones, sorts by difficulty score, and optionally takes the first N levels for a better difficulty spread (see **Random pool mode** below).
    - `tileTypePoolSize`: when `generationMode === 'randomPool'`, the maximum abstract type index is `tileTypePoolSize - 1` (pool is `[0, 1, …, N-1]`). Set at the top level (default **12** in `config.js`) or override with `pool.paramRanges.tileTypePoolSize`. Must be ≥ 3.
    - `pool`: when `generationMode === 'randomPool'`, an object `{ count, keep?, paramRanges? }`. `count` is how many candidate levels to generate. `keep` (optional) is how many to keep after sorting by difficulty (default: keep all solvable). `paramRanges` (optional) overrides default sampling ranges (templates, grid sizes, `tileTypePoolSize`, triplets, layering, etc.); merged with built-in defaults in `generator.js` (`DEFAULT_POOL_PARAM_RANGES`).
    - `output`:
      - `outFile`: typically `levels.generated.js`.
      - `includeSolverStats`: if `true`, embeds extra solver metrics per level (debugging/tuning only).
      - `reportFile`: if set (e.g. `levelgen-report.md`), writes a difficulty report with metrics and easy/medium/hard statistics to that path.
    - `forcedLookahead` (optional): use `{}` to enable **`forcedRatioK`** (defaults from [`tools/levelgen/forced-lookahead-defaults.js`](tools/levelgen/forced-lookahead-defaults.js)—edit **`lookaheadDepth` there** for forced-move depth). Override per-field in config if needed. Omit `forcedLookahead` entirely to skip (faster builds). Large depth is expensive.
  - `levels`: array of “batches” describing how to generate groups of levels:
    - `templateId`: name of a shape template (`rectangle`, `diamond`, `heart`, `spiral`, `letter`, `circle`, `triangle`, `hexagon`, `cross`, `ring`, `t`, `u`).
    - `templateParams`: template-specific parameters (e.g. `{ radius, thickness }`, `{ radiusX, radiusY }` for asymmetric silhouettes, or `{ letter }`).
    - `gridWidth`, `gridHeight`: board cell counts used by the template and layout (`x` in `[0, gridWidth)`, `y` in `[0, gridHeight)`; both ≥ 5 for templates). Legacy `gridSize` is still accepted in generator config as shorthand for a square grid.
    - `count`: how many levels to generate for this batch.
    - `tileTypeCount`: number of distinct **abstract** tile kinds in this batch — type ids `0 .. tileTypeCount - 1` only (no dependency on emoji or `TILE_TYPES` names).
    - Distribution `weights`, `explicitCounts`, and Zipf `order` use those same type ids as keys (integers `0..N-1`).
    - `distribution`: how many tiles of each type to place (see section 3).
    - `layering`:
      - `minZ`, `maxZ`: inclusive range of layers to use (0-based).
      - `overlap`: `'light' | 'medium' | 'heavy'` (bias towards reusing stacks).
      - `maxStackPerCell`: soft cap on how many tiles can stack at one `(x, y)` (one per z); auto-raised if needed so the silhouette can hold all tiles.
      - `full`: if `true`, placement uses deterministic fill order and greedy lower‑z‑first budgets; each layer may be **fully** tiled (row‑major) or **partially** tiled with cells spread along that order if the level runs out of tiles (see **Fill and layer-shape strategies** below).
      - `layerShape`: `'full' | 'pyramid' | 'shift' | 'randomErosion'` — how upper layers derive their silhouette from the base (default `'full'`).
      - `layerShapeOptions`: optional strategy params:
        - for `pyramid`: `{ pyramidMinNeighbors? }` — keep a cell on the next layer if at least this many of its four cardinal neighbors lie in the current silhouette (default **2**; use **4** for strict interior / old behavior).
        - for `shift`: `{ shiftDx?, shiftDy? }` (per-layer delta; default 1, 0).
        - for `randomErosion`: `{ erosionRate?, minCellFraction?, allowShift? }`.
    - **Invariant**: At most one tile may exist at any `(x, y, z)` position. The generator enforces this.

- **Templates**: `tools/levelgen/templates.js`
  - `getTemplateCells(templateId, templateParams, gridWidth, gridHeight)` returns an array of allowed `{ x, y }` cells that define the 2D silhouette.
  - Implemented templates:
    - `rectangle`: dense rectangle centred on the grid.
    - `diamond`: Manhattan-distance diamond (`|dx| + |dy| <= radius`).
    - `circle`: Euclidean disk (`dx^2 + dy^2 <= radius^2`).
    - `triangle`: regular grid triangle pointing upward.
    - `hexagon`: compact hexagonal silhouette.
    - `cross`: plus/cross bars (`radius`, `thickness`).
    - `ring`: donut-like outer/inner circle (`radius`, `thickness`).
    - `t`: regular T-shaped glyph.
    - `u`: regular U-shaped glyph.
    - `heart`: implicit heart curve, then dilated by `thickness`.
    - `spiral`: simple spiral path, then dilated by `thickness`.
    - `letter`: crude glyphs for `S` and `C` (strokes), plus a fallback to a shrunk diamond for other letters.

- **Generator**: `tools/levelgen/generator.js`
  - `generateLevelsFromConfig(config)`:
    - For each batch:
      - Converts `distribution` → exact tile counts per type (always multiples of 3).
      - Shuffles those types into a single sequence (**no** tray-feasibility or slack shaping).
      - Converts the sequence into a multi-layer layout over the template silhouette:
        - Tiles are assigned to layers between `minZ` and `maxZ`. When `full` is true, layers fill in **increasing z**: base up to capacity, then the next layer up to capacity, and so on. Full layers use row-major order; **partial** layers use cells **spaced along** that order so coverage is spread over the silhouette (not clumped in low‑y rows). With `full` false, the same greedy z-order applies to tile budgets per layer.
        - **Layer silhouettes**: each layer’s allowed cells come from `layerShape`: `'full'` = same as base; `'pyramid'` = base shrunk each layer by dropping cells with too few in-silhouette cardinal neighbors (see `pyramidMinNeighbors`, default 2); `'shift'` = base shifted by `(shiftDx, shiftDy)` per layer index; `'randomErosion'` = connected edge-erosion per layer with optional small random shifts.
        - Overlap density is controlled via `overlap` + `maxStackPerCell`.
        - **Each (x, y, z) position is used at most once** — only one tile per cell per layer.
        - Ensures at least **two layers** in every generated level.
    - Returns `{ levels, meta: { seed } }`.
  - **Shapes**: `tools/levelgen/shapes.js` provides silhouette helpers: `getFillOrder`, `subsetFillOrderEvenly` (partial-layer spread), `shrinkSilhouette`, `pyramidSilhouettes`, `shiftSilhouette`, `getLayerSilhouette`.

- **Solver**: `tools/levelgen/solver.js` (Rust in `crates/levelgen-solver`, `npm run build:native`)
  - `solveLevel(level, options)`:
    - `mode: 'exact'` (default): memoized DFS; returns `{ solvable, status, solution, stats, mode }`. Use this for generation and any correctness-critical checks.
    - `mode: 'heuristic'`: depth-limited **maximax** with a leaf evaluation (tray slack, tappable count, removal progress), branching capped with `maxMovesPerNode` (top moves by tray heuristic). Greedy replay: each step picks the first tap with best lookahead value to build a path. **Not** a proof of solvability—may fail on solvable levels. Options: `searchDepth` (default 3), `maxMovesPerNode` (8), `maxSteps` (200).
  - `computeForcedRatioK(level, solution, options)` (native): walks the **exact** solution; at each step scores every tappable first tap with the same lookahead as the heuristic solver (`lookaheadDepth`, `maxMovesPerNode`), then marks a step as **soft forced** when at most one tap falls in the top value band \([v^\* - \texttt{marginDelta}, v^\*]\). Returns `{ ok, forcedRatioK, forcedStepsK, steps, lookaheadNodes, stepForcedK }`. Still an **estimate**, not “unique exact-solvable child.”
  - Rust tests: `cargo test --no-default-features` in `crates/levelgen-solver` (no Node N-API required).

- **Difficulty scoring** (`tools/levelgen/score.js`, **v2**): `scoreLevel(level, options)` builds a single `difficultyScore` in roughly \[0, 1\] from **four** families (weights are `[PLACEHOLDER]` — tune in `score.js`):
  1. **Visibility / information at start** — one scalar `visibilityHard` (no separate occlusion term): blends **(a)** lack of complete triplets on the **initial** tappable set (`surfaceTripletShare`) and **(b)** **covered fraction** at start (`1 − |tap0|/N`), so surface triplets and occlusion are not double-counted.
  2. **Strategic pressure** — `strategicPressureHard` blends **tray slack** (`minSlack` along the exact solution) and **rollout failure rate** (epsilon-greedy random rollouts). **Forced-move ratios are not used in the scalar** (cheaper than depth-k lookahead; rollout captures greedy/dead-end stress).
  3. **Digs / reveals** — `digHard` from **skill** vs **chance** reveals along the exact solution: after each removal, tiles **newly** tappable are classified as **skill** (same `(x,y)` as the removed tile, remover `z` higher — column stack) vs **chance** (cross-cell cover). Blended with higher weight on chance reveals.
  4. **Solver effort** — small weight on `log10(nodesExpanded)` (`effortHard`).
  - Still simulates the path for **reporting**: avg/min tappable, heuristic `forcedRatio`, windowed difficulty range/variance (uniformity). Optional `options.forcedLookahead` adds **`forcedRatioK`** via `computeForcedRatioK` — **report-only**, not in `difficultyScore`.
  - Runs multiple heuristic rollouts for **dead-end susceptibility** (used inside strategic pressure, not as a standalone large term).

- **Interactive designer** (local only): `npm run leveldesign` starts `tools/leveldesign-server.js` (default [http://127.0.0.1:8765](http://127.0.0.1:8765)), which also serves `/style.css`, `/assets/`, `/tile-layering.js`, and `/lib/*.js` from the repo root. The full-board preview imports **`lib/board-view.js`** and **`lib/tile-types.js`** (same modules as `game.js`) so layout math and emoji mapping are not duplicated. Edit generator parameters in the browser, see the **template footprint** (compact), **top tile per column** (quick view), a **full-level board** matching the game (**wood tile**, **emoji** from `TILE_TYPES`, **`boardTileCenterPx`** / odd-`z` half-cell offset as in `game.js`), **per-layer silhouettes** (each depth’s allowed `(x,y)` from `getLayerSilhouette`), and **solver / difficulty metrics** from `scoreLevel`. Uses the same `batch` shape as `tools/levelgen/config.js`. **Config seed** + **level id** match `generateLevelsFromConfig`’s per-level RNG (first level in a run = id `1`). Override with **level seed** for a direct `mulberry32` seed. Set `LEVELDESIGN_PORT` to change the port. `layerSilhouettes` is computed during generation but **stripped** from `levels.generated.js` so the runtime bundle stays small.

- **CLI & output**: `tools/generate-levels.js`
  - **Progress**: stderr shows batch/pool position and attempt counts; `--quiet` / `LEVELGEN_QUIET=1` silences it. The final summary line remains on stdout.
  - Steps (when `generationMode === 'batches'`):
    1. Import `config.js`.
    2. Call `generateLevelsFromConfig(config)` to produce candidate levels (or, when `generationMode === 'randomPool'`, generate `pool.count` levels via `generateOneRandomLevel` with random params).
    3. For each candidate:
       - Call `scoreLevel` to:
         - Discard unsolvable levels.
         - Compute `difficultyScore`.
    4. Sort solvable levels by `difficultyScore` (ascending).
    5. Rewrite `id` and `name` to reflect difficulty order.
    6. Emit `levels.generated.js`:
       - Defines `window.__TRIPLET_GENERATED_LEVELS__ = [...]`.
    7. **Difficulty report** (if `config.output.reportFile` is set):
       - Writes a markdown report to the given path (e.g. `levelgen-report.md`).
       - Report includes: overall difficulty score range and mean metrics; statistics by band (**easy** = bottom third, **medium** = middle third, **hard** = top third by score).
       - Per band: level count, difficulty score min/max/mean, **grid width and grid height** (separate min/max/mean), and metrics including **visibility hardness**, **strategic pressure**, **dig hardness**, skill/chance reveal shares, min tray slack, heuristic/depth-k forced ratios (report-only), rollout failure rate, avg/min tappable tiles, solution steps, solver nodes expanded, difficulty range/variance.

- **Runtime loading**:
  - `index.html` includes:
    - `levels.generated.js` (plain script).
    - `game.js` (ES module).
  - `game.js` uses:
    - `window.__TRIPLET_GENERATED_LEVELS__` if available.
    - Otherwise, a small built-in `FALLBACK_LEVELS` array.
  - **Tile type assignment**: layouts (including tutorials and generated levels) store `type` as **JSON numbers** — 0-based indices into `TILE_TYPES` in `game.js` (same order as the emoji list). `normalizeLevelTileType` converts layout values to **integer indices** in runtime state; DOM `data-type` attributes use the string form of those indices for HTML.

- **Random pool mode**: When `generationMode === 'randomPool'`, the CLI does not use the `levels` batches. Instead it generates `pool.count` candidate levels by sampling template, grid size, tile types, distribution, and layering from (optional) `pool.paramRanges` and built-in defaults. **`totalTriplets` is derived from the template** by default: after sampling layering, the generator sums per-layer silhouette sizes (same construction as layout), sets `totalTriplets = floor(maxTiles * fillRatio / 3)` with `fillRatio` from `templateTripletFillRatio` (default 1), then clamps to `totalTripletsMin` / `totalTripletsMax` from param ranges. Set `deriveTotalTripletsFromTemplate: false` in `pool.paramRanges` to restore the older behavior (uniform random `totalTriplets` in the min/max range before layout). Tile-type order is the same **uniform shuffle** as in batch mode. After generation, every candidate is scored; unsolvable levels are discarded. The remaining levels are sorted by `difficultyScore` ascending. If `pool.keep` is set, only the first `pool.keep` levels are written. This yields a full easy-to-hard curve from a single random pool and often produces harder levels than the batch mode, which is tuned for a gentle ramp.

---

### 3. Tile type distribution modes

Distribution controls how many tiles of each type are in a level. All modes ensure each tile type appears a multiple of 3 times (so it can form full triplets).

#### 3.0. Auto `totalTriplets` (from template capacity)

For `zipf` and `weightedTriplets`, you may set `totalTriplets: 'auto'` instead of a number. The generator then:

1. Builds per-layer silhouettes from the template and layering (`layerShape`, `layerShapeOptions`, etc.) — the same step as layout placement.
2. Computes `maxTiles` = sum of each layer’s cell count (one tile per cell per layer).
3. Sets `totalTriplets = floor(maxTiles * templateTripletFillRatio / 3)` (default `templateTripletFillRatio` = 1), then applies optional `totalTripletsMin` / `totalTripletsMax` on the batch (or `pool.paramRanges` in random pool mode), and finally ensures `3 * totalTriplets ≤ maxTiles`.

Optional batch fields: `templateTripletFillRatio` (0–1), `totalTripletsMin`, `totalTripletsMax`.

**Reproducibility:** Batches with a numeric `totalTriplets` are unchanged (shuffle, then silhouettes). Batches with `'auto'` build silhouettes first, then shuffle — the RNG stream differs from numeric mode for the same seed.

The interactive **level designer** defaults to **Auto (from template)** for zipf / weightedTriplets.

#### 3.1. Explicit counts (current)

- `distribution.mode: 'explicitCounts'`
- Fields:
  - `explicitCounts: { [typeId]: number }` (each `number` must be multiple of 3; `typeId` is an abstract integer `0..N-1` when using `tileTypeCount`).
- Use when you want precise control, e.g.:
  - counts per abstract type id (often paired with `tileTypeCount` so keys are `0`, `1`, …).

#### 3.2. Weighted triplets (current)

- `distribution.mode: 'weightedTriplets'`
- Fields:
  - `totalTriplets: number | 'auto'` (total triplets over all types, or derive from template — see §3.0).
  - `weights: { [typeId]: number }` (relative weights).
- Behavior:
  - Computes ideal triplets per type proportional to weights.
  - Floors to integers, then distributes remaining triplets to highest-weight types.
  - Multiplies triplets by 3 to get final tile counts.
- Good default for:
  - “Soft” bias towards some types but without micromanaging exact counts.

#### 3.3. Tile type count and difficulty

The **number of tile types** in a level strongly affects difficulty: more types mean more distinct symbols in the tray, so the tray fills with singletons and pairs more often and the player must plan to avoid overflow. The game defines a fixed set of tile types in `game.js` (`TILE_TYPES`); the tray holds at most **7** tiles. So:

- **Upper bound**: The game defines a fixed set of types in `game.js` (currently **12**: leaf, flower, clover, star, acorn, mushroom, cherry, butterfly, sunflower, apple, carrot, bee). Set `tileTypeCount` to at most **12** unless you extend `TILE_TYPES`.
- **Per-level**: Each batch's `tileTypeCount` fixes how many distinct abstract kinds appear. Using more types (e.g. 8–12) increases tray pressure and strategic difficulty; using fewer (e.g. 2–4) keeps levels easier.
- **Setting it**: Prefer `tileTypeCount: N` so the generator uses ids `0..N-1` with no shared name list in the levelgen config. Letting the generator *choose* type count automatically (e.g. to hit a target difficulty) would require coupling generation to the solver/scorer and is usually not worth the complexity; configuring per batch is simpler and predictable.

So yes, the **fixed global cap** (currently 12 types in `game.js`) limits the "many types" dimension. The tray holds 7 tiles, so with up to 12 types you still avoid the "7 singletons = instant loss" case. To raise difficulty for medium/hard, use **more types** in those batches (e.g. all 12) and combine with more triplets, heavier overlap, and/or more layers.

#### 3.4. Zipf-based distribution

`zipf` mode approximates a **Zipf law** over tile types:

- **Rationale**:
  - Many natural distributions have a “few very common, many rare” pattern.
  - For Triplet Tiles, this maps well onto:
    - A small number of **common** types that are easy to match.
    - Several **rarer** types that introduce interest and tray risk.
  - Tuning the Zipf exponent smoothly interpolates between:
    - Almost uniform distributions (easy, lots of alternatives).
    - Strongly skewed distributions (harder, more trap potential).

- **API**:

```js
distribution: {
  mode: 'zipf',
  totalTriplets: 36, // or 'auto' to fill from template capacity (§3.0)
  exponent: 1.1,            // s in 1 / k^s, controls skewness
  order: [0, 1, 2, 3, 4, 5] // rank order (abstract type ids; optional — defaults to 0..tileTypeCount-1)
}
```

- **Behavior**:
  - Let `order` define the rank of each tile type:
    - Type at index `k` (1-based) gets ideal weight:
      - `w_k = 1 / k^exponent`.
  - Normalize:
    - `weights[type_k] = w_k / sum_j w_j`.
  - Allocate integer triplets using the existing `weightedTriplets` machinery:
    - Compute ideal `triplets[type] = totalTriplets * weights[type]`.
    - Floor to integer triplets.
    - Distribute leftover triplets to highest-weight types.
  - Multiply by 3 to get tile counts.

- **Gameplay tuning**:
  - `exponent ~ 0.5`: near-uniform distribution (relatively easy).
  - `exponent ~ 1.0`: gentle Zipf, common “base” types with a couple of rarer ones.
  - `exponent ~ 1.5–2.0`: strongly skewed; a dominant type or two plus many rare types:
    - Makes early matches easy (lots of common tiles).
    - Increases risk of tray deadlocks late in the level if the player mishandles rare tiles.
  - You can safely experiment with different exponents per batch and rely on the solver + difficulty scoring to reject unsolvable levels and properly rank difficulty.

Implementation detail: `distributionToCounts` computes Zipf weights from `exponent` and `order`, then delegates to the same integer triplet allocation logic used by `weightedTriplets`.

---

### 4. How to use the generator

From the project root:

1. **Install dependencies (once):**

```bash
npm install
```

2. **(Optional) Install Playwright browsers (for full test suite):**

```bash
npx playwright install
```

3. **Edit the generator config** to your liking:
   - File: `tools/levelgen/config.js`
   - Adjust:
     - `levels` batches (templates, counts, `tileTypeCount`, distributions, layering).
     - `seed` if you want a different procedural “universe” of levels.

4. **Generate levels:**

```bash
node tools/generate-levels.js
```

While it runs, progress goes to **stderr** (so you can still pipe stdout if needed): in a TTY it updates in place; otherwise it prints one line per update. Disable with `--quiet` or `LEVELGEN_QUIET=1`.

This will:

- Generate candidate levels from the config.
- Run the solver + difficulty scoring over each candidate.
- Discard unsolvable levels.
- Sort remaining levels by `difficultyScore`.
- Write `levels.generated.js` into the project root.

5. **Run the game:**
   - Start the test/dev server (Playwright config already runs one for tests), or use your own static server pointing at the project root.
   - Open the site (default used by tests: `http://127.0.0.1:4173`).
   - The game will load `levels.generated.js` automatically via `index.html`.

6. **Run tests (optional but recommended):**

```bash
npx playwright test
```

- Core tests confirm:
  - Basic mechanics and power-ups.
  - Progression & stats.
  - That `levels.generated.js` exists, is sorted by `difficultyScore`, and that sample levels are solver-solvable.

---

### 5. Extending the system

#### 5.1 Fill and layer-shape strategies (implemented)

- **`full: true`** (recommended): **Every layer** is filled in a deterministic **row-by-row** order (sort by `(y, x)`), so each layer’s silhouette is fully and cleanly filled—no random scatter. Tile counts per layer respect each layer’s cell capacity (so with `layerShape: 'pyramid'` or `'shift'`, upper layers may have fewer cells and thus fewer tiles).
- **`layerShape`** controls each layer’s allowed cells (and thus its fill shape):
  - **`'full'`**: Every layer uses the same silhouette as the base; all layers are fully filled in order.
  - **`'pyramid'`**: Layer 0 = full silhouette; each higher layer applies one shrink step: a cell stays if at least **`pyramidMinNeighbors`** of its four cardinal neighbors are in the silhouette below (default **2**). Use **`pyramidMinNeighbors: 4`** to match the previous “strict interior” rule (all four neighbors in-set). Each layer is fully filled in order, producing a pyramid-like stack.
  - **`'shift'`**: Layer 0 = base; layer *k* = base shifted by `(k * shiftDx, k * shiftDy)` (default `shiftDx: 1`, `shiftDy: 0`). Each layer is fully filled in order. Configure via `layerShapeOptions: { shiftDx, shiftDy }`.
  - **`'randomErosion'`**: Layer 0 = base; each higher layer removes a fraction of current edge cells while preserving connectivity, then optionally shifts by `[-1, 1]` in x/y. Configure with `layerShapeOptions: { erosionRate, minCellFraction, allowShift }`.

**Trade-offs:** Fill + pyramid/shift improves **recognizability** and a clean stack; the fixed coverage graph can **increase solver reject rate** for some levels, so you may need to generate more candidates per batch or relax constraints. Tile count must be compatible with layer capacities (e.g. with pyramid, upper layers have fewer cells; the generator partitions tiles accordingly and throws if total capacity is exceeded).

- **Add new templates**: extend `getTemplateCells` in `templates.js` with new shapes (e.g. animals, letters, themed silhouettes) and new `templateId`s.
- **Tune difficulty curve**:
  - Adjust:
    - Templates (shape complexity).
    - Tile distributions (explicit/weighted/Zipf).
    - Layering (depth, overlap).
  - Use `tests/levelgen.spec.js` and/or additional tooling to inspect solver metrics and difficulty distribution across levels.
- **Tune Zipf mode**:
  - Use lower exponents (`~0.3-0.7`) for easier, more uniform mixes.
  - Use higher exponents (`~1.0-1.6`) for stronger common-vs-rare skew and higher tray pressure.

The solver and difficulty metrics are designed so you can safely push on shape, layering, and distribution, then let the pipeline filter out unsuitable levels and rank the rest automatically.

