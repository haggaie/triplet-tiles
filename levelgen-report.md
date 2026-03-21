# Level difficulty report

Generated: 2026-03-21T14:51:38.799Z  
Seed: 1337  
Levels: 29 (rejected: 0)

## Overall

Targets from `LEVELGEN.md` (Level configuration); metrics without entries leave target columns empty.

| Metric | Target range | Current generation target | Actual (this run) |
| --- | --- | --- | --- |
| Grid width | 7-8 | max 8 (batches + random pool) | 7 – 8 (mean 7.793) |
| Grid height | 7-13 | often ≥ width (portrait batches) | 7 – 15 (mean 11.931) |
| Tile count | 61-120 (most levels) | ~48-120 with emphasis on 60+ | 54 – 93 (mean 68.069) |
| Layers/depth | 4-10 (most levels) | 4-10 | 2 – 4 (mean 2.759) · distinct z with ≥1 tile |
| Tile type count | mostly 12 | 7-12 with medium/hard at 12 | 7 – 12 (mean 10.483) |
| Difficulty score | ~0.34-0.76 | intentionally pushed upward via deeper stacks and tighter slack constraints | 0.581 – 0.770 (mean 0.681) |
| Min tray slack | mostly 1 | medium/hard batches require solver minSlack <= 1 | 1 – 1 (mean 1) |
| Mean visibility hardness |  |  | 0.732 |
| Mean strategic pressure (slack + rollout) |  |  | 0.760 |
| Mean dig hardness |  |  | 0.573 |
| Mean skill reveal share |  |  | 0.256 |
| Mean chance reveal share |  |  | 0.744 |
| Mean forced-move ratio (report-only) |  |  | 0.351 |
| Mean forced-move ratio (depth-k lookahead, report-only) |  |  | 0.176 |
| Mean rollout failure rate |  |  | 0.853 |
| Mean solution steps |  |  | 68.069 |
| Mean difficulty range (in-level uniformity) |  |  | 0.152 |
| Mean difficulty variance (in-level uniformity) |  |  | 0.005 |

## By difficulty band

Bands are **tertiles** (bottom/middle/top third by difficulty score).

### Easy (bottom third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 8 | 7.667 |
| Grid height | 11 | 15 | 12.444 |
| Tile count | 54 | 90 | 65.333 |
| Layer depth (distinct z with tiles) | 2 | 3 | 2.333 |
| Tile type count | 7 | 12 | 8.778 |
| Difficulty score | 0.581 | 0.654 | 0.615 |
| Visibility hardness (start) | 0.578 | 0.722 | 0.660 |
| Strategic pressure (slack + rollout) | 0.550 | 0.817 | 0.652 |
| Dig hardness (skill + chance reveals) | 0.511 | 0.608 | 0.567 |
| Skill reveal share (same-column digs) | 0.140 | 0.464 | 0.277 |
| Chance reveal share (cross-cell digs) | 0.536 | 0.860 | 0.723 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.244 | 0.352 | 0.301 |
| Forced-move ratio (depth-k, report-only) | 0.071 | 0.200 | 0.137 |
| Dead-end (rollout) failure rate | 0.433 | 0.967 | 0.637 |
| Avg tappable tiles per step | 10 | 14.867 | 12.138 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 54 | 90 | 65.333 |
| Solver nodes expanded | 142 | 1096 | 387.333 |
| Difficulty range (in-level uniformity) | 0.095 | 0.329 | 0.189 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.018 | 0.008 |

**Level count:** 9

### Medium (middle third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 8 | 7.667 |
| Grid height | 7 | 14 | 11.333 |
| Tile count | 57 | 72 | 63.667 |
| Layer depth (distinct z with tiles) | 2 | 4 | 2.667 |
| Tile type count | 7 | 12 | 10.333 |
| Difficulty score | 0.660 | 0.701 | 0.684 |
| Visibility hardness (start) | 0.642 | 0.830 | 0.716 |
| Strategic pressure (slack + rollout) | 0.633 | 0.833 | 0.778 |
| Dig hardness (skill + chance reveals) | 0.568 | 0.605 | 0.584 |
| Skill reveal share (same-column digs) | 0.149 | 0.273 | 0.220 |
| Chance reveal share (cross-cell digs) | 0.727 | 0.851 | 0.780 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.333 | 0.433 | 0.370 |
| Forced-move ratio (depth-k, report-only) | 0.067 | 0.250 | 0.171 |
| Dead-end (rollout) failure rate | 0.600 | 1 | 0.889 |
| Avg tappable tiles per step | 7.621 | 14.130 | 11.327 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 57 | 72 | 63.667 |
| Solver nodes expanded | 96 | 1974 | 621.111 |
| Difficulty range (in-level uniformity) | 0.095 | 0.311 | 0.162 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.018 | 0.006 |

**Level count:** 9

### Hard (top third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 8 | 14 | 12 |
| Tile count | 63 | 93 | 73.909 |
| Layer depth (distinct z with tiles) | 3 | 4 | 3.182 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.704 | 0.770 | 0.733 |
| Visibility hardness (start) | 0.733 | 0.928 | 0.802 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.542 | 0.612 | 0.569 |
| Skill reveal share (same-column digs) | 0.128 | 0.360 | 0.268 |
| Chance reveal share (cross-cell digs) | 0.640 | 0.872 | 0.732 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.307 | 0.472 | 0.376 |
| Forced-move ratio (depth-k, report-only) | 0.147 | 0.258 | 0.211 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 9.083 | 12.254 | 10.749 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 63 | 93 | 73.909 |
| Solver nodes expanded | 434 | 20420 | 4716.727 |
| Difficulty range (in-level uniformity) | 0.083 | 0.152 | 0.114 |
| Difficulty variance (in-level uniformity) | 0.001 | 0.004 | 0.002 |

**Level count:** 11

