## Level Generation & Difficulty Pipeline

This document describes how the Triplet Tiles level generator and solver work, how to use them, and how a future Zipf-based tile distribution mode could fit in.

---

### 1. High-level design

- **Goal**: Produce many multi-layer levels that:
  - Respect the game’s tile and coverage rules.
  - **Use at most one tile per (x, y, z) position** — no two tiles may share the same cell and layer.
  - Are provably solvable by an automated solver.
  - Are roughly ordered from easiest to hardest using spec-aligned difficulty metrics.
- **Key pieces**:
  - Shape templates → 2D silhouettes (`templates.js`).
  - Generator → builds tray-feasible pick sequences and turns them into 3D layouts (`generator.js`).
  - Solver → validates solvability using the same rules as `game.js` (`solver.js`).
  - Scoring → turns solver-derived metrics into a single difficulty score (`score.js`).
  - CLI → runs the whole pipeline and writes `levels.generated.js` (`generate-levels.js`).

All of this runs at **build time**. At runtime, the game simply loads `levels.generated.js` and plays those levels.

---

### 2. Data flow & files

- **Config**: `tools/levelgen/config.js`
  - Global:
    - `seed`: base RNG seed for reproducible generation.
    - `generationMode`: `'batches'` (default) or `'randomPool'`. With `'batches'`, the CLI uses the `levels` array and applies per-batch constraints. With `'randomPool'`, it generates a large pool of random candidates, keeps only solvable ones, sorts by difficulty score, and optionally takes the first N levels for a better difficulty spread (see **Random pool mode** below).
    - `pool`: when `generationMode === 'randomPool'`, an object `{ count, keep?, paramRanges? }`. `count` is how many candidate levels to generate. `keep` (optional) is how many to keep after sorting by difficulty (default: keep all solvable). `paramRanges` (optional) overrides default sampling ranges (templates, grid sizes, tile type count, triplets, layering, etc.); the generator merges these with built-in defaults and requires `tileTypesPool` (or `config.ALL_TILE_TYPES`) for the set of tile type ids to sample from.
    - `output`:
      - `outFile`: typically `levels.generated.js`.
      - `includeSolverStats`: if `true`, embeds extra solver metrics per level (debugging/tuning only).
      - `reportFile`: if set (e.g. `levelgen-report.md`), writes a difficulty report with metrics and easy/medium/hard statistics to that path.
  - `levels`: array of “batches” describing how to generate groups of levels:
    - `templateId`: name of a shape template (`heart`, `spiral`, `letter`, `rectangle`, `diamond`).
    - `templateParams`: template-specific parameters (e.g. `{ radius, thickness }`, or `{ letter }`).
    - `gridSize`: board size used by the template (odd values like 11, 13, 15 recommended).
    - `count`: how many levels to generate for this batch.
    - `tileTypes`: list of tile type identifiers — either **tile id strings** (from `TILE_TYPES` in `game.js`) or **0-based integer indices** into `TILE_TYPES`. Distribution `weights` and `explicitCounts` use the same type identifiers (strings or integers) as keys.
    - `distribution`: how many tiles of each type to place (see section 3).
    - `layering`:
      - `minZ`, `maxZ`: inclusive range of layers to use (0-based).
      - `overlap`: `'light' | 'medium' | 'heavy'` (bias towards reusing stacks).
      - `maxStackPerCell`: soft cap on how many tiles can stack at one `(x, y)` (one per z); auto-raised if needed so the silhouette can hold all tiles.
      - `full`: if `true`, **every layer** is filled **in a deterministic row-by-row order** so each layer’s silhouette is clean and complete (see **Fill and layer-shape strategies** below).
      - `layerShape`: `'full' | 'pyramid' | 'shift'` — how upper layers derive their silhouette from the base (default `'full'`).
      - `layerShapeOptions`: optional `{ shiftDx?, shiftDy? }` for `layerShape: 'shift'` (per-layer delta; default 1, 0).
    - **Invariant**: At most one tile may exist at any `(x, y, z)` position. The generator enforces this.

- **Templates**: `tools/levelgen/templates.js`
  - `getTemplateCells(templateId, templateParams, gridSize)` returns an array of allowed `{ x, y }` cells that define the 2D silhouette.
  - Implemented templates:
    - `rectangle`: dense rectangle centred on the grid.
    - `diamond`: Manhattan-distance diamond (`|dx| + |dy| <= radius`).
    - `heart`: implicit heart curve, then dilated by `thickness`.
    - `spiral`: simple spiral path, then dilated by `thickness`.
    - `letter`: crude glyphs for `S` and `C` (strokes), plus a fallback to a shrunk diamond for other letters.

- **Generator**: `tools/levelgen/generator.js`
  - `generateLevelsFromConfig(config)`:
    - For each batch:
      - Converts `distribution` → exact tile counts per type (always multiples of 3).
      - Builds a tray-feasible pick sequence of tile types (simulated tray with auto-triplets).
      - Converts the sequence into a multi-layer layout over the template silhouette:
        - Tiles are assigned to layers between `minZ` and `maxZ`. When `full` is true, **every layer** is filled in deterministic row-by-row order so each layer’s silhouette is fully and cleanly filled; tile counts per layer respect each layer’s cell capacity.
        - **Layer silhouettes**: each layer’s allowed cells come from `layerShape`: `'full'` = same as base; `'pyramid'` = base shrunk by one tile per layer (inner pyramid); `'shift'` = base shifted by `(shiftDx, shiftDy)` per layer index.
        - Overlap density is controlled via `overlap` + `maxStackPerCell`.
        - **Each (x, y, z) position is used at most once** — only one tile per cell per layer.
        - Ensures at least **two layers** in every generated level.
    - Returns `{ levels, meta: { seed } }`.
  - **Shapes**: `tools/levelgen/shapes.js` provides silhouette helpers: `getFillOrder`, `shrinkSilhouette`, `pyramidSilhouettes`, `shiftSilhouette`, `getLayerSilhouette`.

- **Solver**: `tools/levelgen/solver.js`
  - `solveLevel(level, { mode, maxNodes })`:
    - `mode: 'exact'`:
      - DFS with memoization over:
        - Remaining board tiles (`removed` bitset).
        - Tray state (type counts mod 3, tray size).
      - Uses the same coverage footprint as `game.js`:
        - A tile is covered if any higher-`z` tile overlaps it in the MahJong-like footprint.
      - Returns `{ solvable, status, solution, stats }`.
    - `mode: 'beam'`:
      - Beam search / capped best-first for approximate checks (not currently used in the CLI).

- **Difficulty scoring**: `tools/levelgen/score.js`
  - `scoreLevel(level, options)`:
    - Runs `solveLevel(..., mode: 'exact')` to:
      - Confirm solvability.
      - Extract a solution path (sequence of tile indices).
    - Simulates the solution path to derive:
      - Average and minimum number of tappable tiles (branching factor).
      - Approximate forced-move ratio (how often only one “safe” move exists).
      - Minimum tray slack (how close tray size gets to overflow).
    - Runs multiple heuristic rollouts from the start state to estimate:
      - Dead-end susceptibility (fraction of runs that fail).
    - Combines metrics into a single `difficultyScore` in roughly \[0,1\):
      - Higher means harder (more forced moves, tighter tray, more dead ends, more search effort).
  - **Focus on strategic thinking**: The score is designed so that harder levels are those that require *strategic play* — balancing opening new tiles vs matching what’s already in the tray — not just “spot a visible 3-set and tap it.” Key signals:
    - **Tray pressure** (min slack): levels where the tray often gets full force the player to clear matches before opening more tiles.
    - **Forced moves**: levels where only one move looks “safe” (complete a triplet, extend a pair, or avoid filling the tray) reward planning and punish random or greedy tapping.
    - **Dead-end susceptibility**: levels where greedy/random play often loses reward looking ahead and managing the tray.
    - Branching (avg/min tappable) and search effort matter too, but the weights are tuned so tray pressure and forced choices dominate, ensuring the curve favors strategic difficulty over sheer size or variety.

- **CLI & output**: `tools/generate-levels.js`
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
       - Per band: level count, difficulty score min/max/mean, and for each metric (min tray slack, forced-move ratio, rollout failure rate, avg/min tappable tiles, solution steps, solver nodes expanded) min/max/mean.

- **Runtime loading**:
  - `index.html` includes:
    - `levels.generated.js` (plain script).
    - `game.js` (ES module).
  - `game.js` uses:
    - `window.__TRIPLET_GENERATED_LEVELS__` if available.
    - Otherwise, a small built-in `FALLBACK_LEVELS` array.

- **Random pool mode**: When `generationMode === 'randomPool'`, the CLI does not use the `levels` batches. Instead it generates `pool.count` candidate levels by sampling template, grid size, tile types, distribution, and layering from (optional) `pool.paramRanges` and built-in defaults. Each candidate is built with **random pick** sequence mode (tray-feasible but not greedy), so layouts tend to be less “solved-friendly” and the difficulty spread is wider. After generation, every candidate is scored; unsolvable levels are discarded. The remaining levels are sorted by `difficultyScore` ascending. If `pool.keep` is set, only the first `pool.keep` levels are written. This yields a full easy-to-hard curve from a single random pool and often produces harder levels than the batch mode, which is tuned for a gentle ramp.

---

### 3. Tile type distribution modes

Distribution controls how many tiles of each type are in a level. All modes ensure each tile type appears a multiple of 3 times (so it can form full triplets).

#### 3.1. Explicit counts (current)

- `distribution.mode: 'explicitCounts'`
- Fields:
  - `explicitCounts: { [typeId]: number }` (each `number` must be multiple of 3).
- Use when you want precise control, e.g.:
  - 30 leaf tiles, 30 flower tiles, 15 clover tiles, 15 star tiles.

#### 3.2. Weighted triplets (current)

- `distribution.mode: 'weightedTriplets'`
- Fields:
  - `totalTriplets: number` (total triplets over all types).
  - `weights: { [typeId]: number }` (relative weights).
- Behavior:
  - Computes ideal triplets per type proportional to weights.
  - Floors to integers, then distributes remaining triplets to highest-weight types.
  - Multiplies triplets by 3 to get final tile counts.
- Good default for:
  - “Soft” bias towards some types but without micromanaging exact counts.

#### 3.3. Tile type count and difficulty

The **number of tile types** in a level strongly affects difficulty: more types mean more distinct symbols in the tray, so the tray fills with singletons and pairs more often and the player must plan to avoid overflow. The game defines a fixed set of tile types in `game.js` (`TILE_TYPES`); the tray holds at most **7** tiles. So:

- **Upper bound**: The game defines a fixed set of types in `game.js` (currently **12**: leaf, flower, clover, star, acorn, mushroom, cherry, butterfly, sunflower, apple, carrot, bee). Levels cannot use more than that without changing the game.
- **Per-level**: Each batch's `tileTypes` array chooses a *subset*. Using more types in a batch (e.g. 8–12) increases tray pressure and strategic difficulty; using fewer (e.g. 2–4) keeps levels easier.
- **Setting it**: You can either set `tileTypes` explicitly per batch (as now) or derive it from a single list, e.g. `tileTypes: ALL_TYPES.slice(0, 4)` for "first 4 types" so type count is explicit and easy to tune. Letting the generator *choose* type count automatically (e.g. to hit a target difficulty) would require coupling generation to the solver/scorer and is usually not worth the complexity; configuring per batch is simpler and predictable.

So yes, the **fixed global cap** (currently 12 types in `game.js`) limits the "many types" dimension. The tray holds 7 tiles, so with up to 12 types you still avoid the "7 singletons = instant loss" case. To raise difficulty for medium/hard, use **more types** in those batches (e.g. all 12) and combine with more triplets, heavier overlap, and/or more layers.

#### 3.4. Zipf-based distribution (future design)

We can add a third mode, `zipf`, to approximate a **Zipf law** over tile types:

- **Rationale**:
  - Many natural distributions have a “few very common, many rare” pattern.
  - For Triplet Tiles, this maps well onto:
    - A small number of **common** types that are easy to match.
    - Several **rarer** types that introduce interest and tray risk.
  - Tuning the Zipf exponent smoothly interpolates between:
    - Almost uniform distributions (easy, lots of alternatives).
    - Strongly skewed distributions (harder, more trap potential).

- **Proposed API**:

```js
distribution: {
  mode: 'zipf',
  totalTriplets: 36,
  exponent: 1.1,            // s in 1 / k^s, controls skewness
  order: ['leaf', 'flower', 'clover', 'star', 'acorn', 'mushroom'] // rank order
}
```

- **Behavior** (conceptual):
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

This mode can be implemented by adding a `zipf` branch in `distributionToCounts` that computes weights as described above, then defers to the same rounding strategy used by `weightedTriplets`.

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
     - `levels` batches (templates, counts, tileTypes, distributions, layering).
     - `seed` if you want a different procedural “universe” of levels.

4. **Generate levels:**

```bash
node tools/generate-levels.js
```

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
  - **`'pyramid'`**: Layer 0 = full silhouette; layer 1 = silhouette **shrunk by one tile** (only cells that have all four cardinal neighbors in the set); layer 2 = shrunk again; etc. Each layer is fully filled in order, producing a pyramid-like stack.
  - **`'shift'`**: Layer 0 = base; layer *k* = base shifted by `(k * shiftDx, k * shiftDy)` (default `shiftDx: 1`, `shiftDy: 0`). Each layer is fully filled in order. Configure via `layerShapeOptions: { shiftDx, shiftDy }`.

**Trade-offs:** Fill + pyramid/shift improves **recognizability** and a clean stack; the fixed coverage graph can **increase solver reject rate** for some levels, so you may need to generate more candidates per batch or relax constraints. Tile count must be compatible with layer capacities (e.g. with pyramid, upper layers have fewer cells; the generator partitions tiles accordingly and throws if total capacity is exceeded).

- **Add new templates**: extend `getTemplateCells` in `templates.js` with new shapes (e.g. animals, letters, themed silhouettes) and new `templateId`s.
- **Tune difficulty curve**:
  - Adjust:
    - Templates (shape complexity).
    - Tile distributions (explicit/weighted/Zipf).
    - Layering (depth, overlap).
  - Use `tests/levelgen.spec.js` and/or additional tooling to inspect solver metrics and difficulty distribution across levels.
- **Implement Zipf mode**:
  - Add a `zipf` branch to `distributionToCounts` in `generator.js` as sketched in section 3.3.
  - Experiment with different exponents and orders per batch.

The solver and difficulty metrics are designed so you can safely push on shape, layering, and distribution, then let the pipeline filter out unsuitable levels and rank the rest automatically.

