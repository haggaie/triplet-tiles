## Triplet Tiles Specification

### 1. High-Level Vision

- **Game type**: Casual, offline-capable, single-player tile-matching puzzle.
- **Core loop**: Tap tiles from a layered board into a 7-slot tray; match 3 identical tiles to clear them; clear all tiles to win; tray overflow loses the level.
- **Platforms**: Mobile (Android, iOS) and web (WebGL/HTML5) with shared design and adaptable UI.
- **Tone**: Relaxing, visually pleasing, low cognitive overhead but with meaningful planning.

### 2. Core Gameplay Mechanics

- **Board layout**
  - **Structure**: 2.5D/stacked layout of tiles in multiple layers, similar to mahjong.
  - **Tile access rules**: A tile is tappable if it is not fully covered by another tile and is visually reachable.
  - **Level variants**:
    - Flat boards (single layer) for early levels.
    - Multi-layer boards with overlapping columns.
    - Special shapes (hearts, spirals, letters, animals) used for thematic variety.
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
  - Early levels: Small boards, 3–4 tile types, mostly single layer.
  - Midgame: More tile types (6–10), deeper stacks, more blocking tiles.
  - Late game: Complex shapes, partial blocking, and reliance on power-ups/advanced tactics.
- **Session length**
  - Target 60–180 seconds per level.
  - Quick fail/retry loops to encourage “one more try” behavior.

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
  - Implement tray mechanics, simple boards, base tiles, win/loss, and basic scoring.
- **Phase 2 – Content & Polish**
  - Add themed tiles, improved animations, sound design, and 100+ handcrafted levels.

