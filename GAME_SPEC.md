## Triplet Tiles Specification

### 1. High-Level Vision

- **Game type**: Casual, offline-capable, single-player tile-matching puzzle.
- **Core loop**: Tap tiles from a layered board into a 7-slot tray; match 3 identical tiles to clear them; clear all tiles to win; tray overflow loses the level.
- **Platforms**: Mobile (Android, iOS) and web (WebGL/HTML5) with shared design and adaptable UI.
- **Tone**: Relaxing, visually pleasing, low cognitive overhead but with meaningful planning.

### 2. Core Gameplay Mechanics

- **Board layout**
  - **Structure**: 2.5D/stacked layout of tiles in multiple layers, similar to mahjong.
  - **Visual layering**: Tiles use a fixed grid position `(x, y)`; odd `z` shifts the drawn tile by half a cell along the board diagonal `(+x, −y)`; even `z` has no extra shift (so even layers align with each other, and odd layers align with each other). Depth is still conveyed via stacking order / z-index.
  - **Tile access rules**: A tile is tappable if no tile in a higher layer overlaps (“covers”) it. Coverage matches **geometric overlap** of 1×1 cell squares centered at the same positions used for rendering: `other` covers `tile` when `other.z > tile.z` and those squares overlap in 2D (edge-touching does not count). This is shared with `tile-layering.js`, levelgen scoring, and the native solver.
  - **Level variants (all levels are multi-layer)**:
    - Every level uses 2+ layers from Level 1 onward; early levels use shallow stacks and light overlap so many tiles remain tappable.
    - Later levels increase overlap density and stack depth to create more dependencies (“unlocking”).
    - Layout silhouettes (“shapes”) like hearts, spirals, letters, animals are used for thematic variety and for tuning difficulty via shape complexity.
- **Tray (holding area)**
  - **Capacity**: 7 slots visible at bottom of the screen.
  - **Behavior**:
    - New tiles are added from left to right.
    - When 3 identical tiles are present anywhere in tray, they auto-merge and disappear.
    - No reordering by default (advanced power-ups can allow rearranging).
    - Overflow condition: If a tile would occupy the 8th position, the level fails.
- **Matching rule**
  - **Match size**: Exactly 3 identical tiles.
  - **Scoring**:
    - Base score per match (e.g. 10 points per tile).
    - Optional combo multiplier if multiple matches occur in quick succession.
    - Bonus for clearing the last group that completes the level.
- **Win / loss conditions**
  - **Win**: All tiles on the board have been moved and matched; tray is empty or partially filled.
  - **Loss**: Tray overflow; optional loss if move limit is introduced in special modes.
  - **Retry**: One-tap restart from result screen.

### 3. Progression & Level Structure

- **Level flow**
  - Linear sequence of levels; player starts at Level 1 and unlocks sequentially.
  - Optional star rating (1–3) based on score or completion speed.
  - Optional world map (scrollable) for visual progression.
- **Difficulty curve**
  - Early levels: Small boards, 3–4 tile types, **always multi-layer** (typically 2 layers) with low overlap density and many tappable tiles at any time.
  - Midgame: More tile types (6–10), deeper stacks, more blocking tiles.
  - Late game: Complex shapes, partial blocking, and reliance on power-ups/advanced tactics.
- **Session length**
  - Target 60–180 seconds per level.
  - Quick fail/retry loops to encourage “one more try” behavior.

### 3.1 Level Design: Shapes, Solvability, Difficulty, and Generation

- **Board “shape” (layout silhouette)**
  - **Definition**: The visible 2D silhouette formed by the union of all tile footprints (across layers) and how that silhouette is distributed (single cluster vs multiple islands, holes, narrow corridors).
  - **Design knob — number of shapes**:
    - A single level should read as **one primary shape** (clear silhouette). Avoid mixing multiple competing silhouettes in one level unless intentionally difficult.
    - Across a level pack/world, vary the number of distinct silhouettes gradually (repeat a shape with small variations before introducing a brand-new one).
  - **Shape complexity heuristics (higher = harder)**:
    - More **disconnected islands**, more **holes/voids**, more **thin bridges**, and higher **concavity** generally reduce the number of available moves and increase forced sequences.

- **Tile set and counts**
  - Total tile count must be a multiple of 3.
  - Each tile type count must be a multiple of 3 (unless/when wild tiles are introduced).
  - Early levels prefer fewer types and more repeats (creates more “safe” merges and reduces tray clogging).

- **Solvability (what it means)**
  - A level is **solvable** if there exists a sequence of valid taps that:
    - Only taps tiles that are currently tappable (not covered),
    - Never exceeds tray capacity (7),
    - Clears all tiles (board empty and tray empty).
  - **Important**: “Solvable” is about existence of at least one successful path; easier levels intentionally have *many* such paths.

- **Difficulty (what it means)**
  - **Easier levels**:
    - High average number of tappable tiles (large branching factor),
    - Many alternative routes to complete triplets,
    - High “tray slack” (player rarely reaches 6–7 tiles in tray),
    - Low chance of irreversible mistakes.
  - **Harder levels**:
    - Low branching factor and more forced move sequences,
    - More dependency chains (unlocking tiles requires clearing specific covers),
    - Higher chance of entering “tray deadlock” states (many distinct singles in tray),
    - Fewer alternative paths; mistakes more often require restart or power-up use.

- **Can we generate levels algorithmically? Yes.**
  - **Approach A — constructive layout from a type sequence**
    - Assign tile types from a **random shuffle** of the multiset (counts are multiples of 3). There is **no** simulated tray when building this sequence — order is not constrained to be pick-feasible.
    - Map that sequence onto the 3D grid using layer silhouettes and fill/stack rules (`generator.js`), then **reject** candidates that fail the exact solver (batch mode retries per level until constraints pass).
    - Tune difficulty by controlling:
      - Layer count and max depth,
      - Overlap density / dependency depth,
      - Tile type count and distribution,
      - Shape complexity (islands/holes/bridges).
  - **Approach B — generate-then-validate**
    - Randomly generate candidate layouts under constraints (shape + layers + counts),
    - Then run an automated solver to reject unsolvable or out-of-band difficulty levels.

- **Can we evaluate solvability and difficulty algorithmically? Yes.**
  - **Solvability check (automated solver)**
    - Model a state as: remaining board (including which tiles are removed/unlocked) + tray multiset/sequence.
    - A move is: pick any currently tappable tile, add it to tray, auto-remove any triplets, lose if tray would exceed 7.
    - For small/medium levels, use **search with memoization** (DFS/BFS/A\*), pruning symmetric states (e.g., tray order-insensitive representation if matches are order-independent).
    - For larger levels, use **beam search** or **MCTS rollouts** to estimate solvability quickly, then run an exact search only on promising candidates.
  - **Difficulty scoring (practical metrics)**
    - **Branching factor curve**: average and minimum number of tappable tiles across the best path; lower tends to be harder.
    - **Forced-move ratio**: fraction of steps where there is only 1 “safe” move (or very few moves that don’t quickly lead to loss).
    - **Tray slack**: minimum \(7 - \text{traySize}\) reached along the best path; lower slack (tray often near full) is harder.
    - **Dead-end susceptibility**: from the start state, run many random/heuristic-guided playthroughs and measure the % that fail; higher failure rate indicates a level with fewer viable paths.
    - **Search effort proxy**: number of nodes expanded by the solver to find a solution; more expansions often correlates with fewer alternative paths (harder).

### 4. Tile & Object Design

- **Tile themes**
  - **Base set**: 12–16 tile icons (e.g., leaves, flowers, fruits, shapes).
  - **Visual requirements**:
    - High contrast between tiles and background.
    - Distinct silhouettes and color schemes to reduce confusion.
- **Special tiles (optional later)**
  - **Locked tiles**: Require one extra match instance (e.g., appear with a lock overlay that disappears after first collection).
  - **Stone/block tiles**: Non-collectible; must clear adjacent or linked tiles to remove.
  - **Wild tiles**: Can count as any icon when forming a triplet.

### 5. Power-Ups & Helpers

- **In-level power-ups**
  - **Undo Last Move**: Revert last tile placed into the tray.
  - **Shuffle Tray**: Reorder tiles in the tray optimally (group similar types together).
  - **Remove Tile Type**: Eliminate all tiles of a selected icon from both tray and board.
- **Acquisition**
  - Granted as level-completion rewards or occasional milestone bonuses.
  - No daily login rewards or achievement-based rewards (explicitly out of scope).

### 6. Controls & UX

- **Input model**
  - Single-tap to select a board tile and send it to tray.
  - Long-press or dedicated UI (optional later) to show hints or remaining count per tile type.
  - Drag support (optional) for accessibility but not required.
- **Feedback & clarity**
  - Subtle animation when a tile is tappable vs. blocked.
  - Entry animation when tile moves from board to tray.
  - Match animation when 3 tiles disappear (particle effect, sound cue).
  - Gentle camera pan/zoom on level start to show board layout.
- **Error prevention**
  - Clear highlighting of tappable vs blocked tiles.
  - Optional hint button to suggest a safe tile (won’t immediately cause tray overflow unless no safe move exists).

### 7. Visual & Audio Direction

- **Art style**
  - Stylized, soft 3D or pseudo-3D tiles with clean edges and vibrant colors.
  - Calm park/garden backgrounds with subtle depth and soft lighting.
- **Animation**
  - Short and snappy animations (<300ms where possible) to keep game responsive.
  - Idle micro-animations on tiles and background elements.
- **Audio**
  - Gentle ambient music loop per theme.
  - SFX: tile pick, tray placement, match, level win, and fail sounds.
  - Separate volume sliders for music and SFX.

### 8. Meta & Events (Lightweight)

- **Progress tracking**
  - Track highest unlocked level and basic aggregate stats (levels completed, tiles cleared) for tuning and analytics.
  - No user-facing achievements list or badges.
- **Events**
  - Optional: time-limited level packs with unique layouts or tile skins.
  - Events reuse the same core loop; they do not introduce separate daily rewards.

### 9. Technical & Platform Requirements

- **Performance targets**
  - 60 FPS on mid-range phones and modern browsers.
  - Low battery usage; minimal background processing.
- **Offline behavior**
  - Fully playable offline.
  - Local save of progression and settings; optional cloud sync can be added later.
- **Input & layout**
  - Responsive layout for portrait orientation on mobile.
  - Adaptive UI for various aspect ratios on web (desktop and tablet).

### 10. Analytics & Telemetry (Design Hooks Only)

- **Key events**
  - Level start/finish, win/loss, number of retries.
  - Power-ups used per level.
  - Session length.
- **Privacy**
  - Aligns with platform standards; no personally identifiable information in analytics by default.
  - Crash and debugging telemetry is allowed.

### 11. Roadmap & Phasing

- **Phase 1 – MVP (Core Loop)**
  - Implement tray mechanics, simple multi-layer boards, base tiles, win/loss, and basic scoring.
- **Phase 2 – Content & Polish**
  - Add themed tiles, improved animations, sound design, and 100+ handcrafted levels.

