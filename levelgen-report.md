# Level difficulty report

Generated: 2026-03-21T08:14:08.156Z  
Seed: 1337  
Levels: 23 (rejected: 0)

## Overall

Targets from `LEVELGEN.md` (Level configuration); metrics without entries leave target columns empty.

| Metric | Target range | Current generation target | Actual (this run) |
| --- | --- | --- | --- |
| Grid width | 7-8 | max 8 (batches + random pool) | 7 – 8 (mean 7.870) |
| Grid height | 7-13 | often ≥ width (portrait batches) | 10 – 14 (mean 12.261) |
| Tile count | 61-120 (most levels) | ~48-120 with emphasis on 60+ | 36 – 75 (mean 59.739) |
| Layers/depth | 4-10 (most levels) | 4-10 | 2 – 4 (mean 2.652) · distinct z with ≥1 tile |
| Tile type count | mostly 12 | 7-12 with medium/hard at 12 | 7 – 12 (mean 10.739) |
| Difficulty score | ~0.34-0.76 | intentionally pushed upward via deeper stacks and tighter slack constraints | 0.497 – 0.741 (mean 0.653) |
| Min tray slack | mostly 1 | medium/hard batches require solver minSlack <= 1 | 1 – 1 (mean 1) |
| Mean visibility hardness |  |  | 0.661 |
| Mean strategic pressure (slack + rollout) |  |  | 0.754 |
| Mean dig hardness |  |  | 0.559 |
| Mean skill reveal share |  |  | 0.303 |
| Mean chance reveal share |  |  | 0.697 |
| Mean forced-move ratio (report-only) |  |  | 0.340 |
| Mean forced-move ratio (depth-k lookahead, report-only) |  |  | 0.174 |
| Mean rollout failure rate |  |  | 0.841 |
| Mean solution steps |  |  | 59.739 |
| Mean difficulty range (in-level uniformity) |  |  | 0.201 |
| Mean difficulty variance (in-level uniformity) |  |  | 0.009 |

## By difficulty band

Bands are **tertiles** (bottom/middle/top third by difficulty score).

### Easy (bottom third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 8 | 7.571 |
| Grid height | 10 | 14 | 11.143 |
| Tile count | 36 | 63 | 47.571 |
| Layer depth (distinct z with tiles) | 2 | 3 | 2.143 |
| Tile type count | 7 | 12 | 8.429 |
| Difficulty score | 0.497 | 0.612 | 0.572 |
| Visibility hardness (start) | 0.502 | 0.722 | 0.620 |
| Strategic pressure (slack + rollout) | 0.400 | 0.833 | 0.600 |
| Dig hardness (skill + chance reveals) | 0.494 | 0.590 | 0.548 |
| Skill reveal share (same-column digs) | 0.200 | 0.520 | 0.339 |
| Chance reveal share (cross-cell digs) | 0.480 | 0.800 | 0.661 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.270 | 0.333 | 0.310 |
| Forced-move ratio (depth-k, report-only) | 0.028 | 0.167 | 0.086 |
| Dead-end (rollout) failure rate | 0.133 | 1 | 0.533 |
| Avg tappable tiles per step | 7.056 | 15.762 | 10.642 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 36 | 63 | 47.571 |
| Solver nodes expanded | 37 | 564 | 136.429 |
| Difficulty range (in-level uniformity) | 0.070 | 0.377 | 0.279 |
| Difficulty variance (in-level uniformity) | 0.001 | 0.025 | 0.015 |

**Level count:** 7

### Medium (middle third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 12 | 14 | 12.571 |
| Tile count | 54 | 72 | 61.286 |
| Layer depth (distinct z with tiles) | 2 | 4 | 2.571 |
| Tile type count | 10 | 12 | 11.429 |
| Difficulty score | 0.622 | 0.678 | 0.656 |
| Visibility hardness (start) | 0.463 | 0.674 | 0.612 |
| Strategic pressure (slack + rollout) | 0.733 | 0.833 | 0.807 |
| Dig hardness (skill + chance reveals) | 0.520 | 0.586 | 0.547 |
| Skill reveal share (same-column digs) | 0.214 | 0.432 | 0.343 |
| Chance reveal share (cross-cell digs) | 0.568 | 0.786 | 0.657 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.254 | 0.417 | 0.337 |
| Forced-move ratio (depth-k, report-only) | 0.037 | 0.317 | 0.191 |
| Dead-end (rollout) failure rate | 0.800 | 1 | 0.948 |
| Avg tappable tiles per step | 12.204 | 19.937 | 14.390 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 54 | 72 | 61.286 |
| Solver nodes expanded | 55 | 1452 | 575.286 |
| Difficulty range (in-level uniformity) | 0.071 | 0.305 | 0.179 |
| Difficulty variance (in-level uniformity) | 0.001 | 0.016 | 0.007 |

**Level count:** 7

### Hard (top third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 12 | 14 | 12.889 |
| Tile count | 60 | 75 | 68 |
| Layer depth (distinct z with tiles) | 2 | 4 | 3.111 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.680 | 0.741 | 0.713 |
| Visibility hardness (start) | 0.640 | 0.819 | 0.731 |
| Strategic pressure (slack + rollout) | 0.817 | 0.833 | 0.831 |
| Dig hardness (skill + chance reveals) | 0.536 | 0.623 | 0.577 |
| Skill reveal share (same-column digs) | 0.091 | 0.380 | 0.243 |
| Chance reveal share (cross-cell digs) | 0.620 | 0.909 | 0.757 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.283 | 0.429 | 0.365 |
| Forced-move ratio (depth-k, report-only) | 0.117 | 0.318 | 0.230 |
| Dead-end (rollout) failure rate | 0.967 | 1 | 0.996 |
| Avg tappable tiles per step | 10.097 | 13.350 | 11.866 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 60 | 75 | 68 |
| Solver nodes expanded | 77 | 6993 | 2157.556 |
| Difficulty range (in-level uniformity) | 0.083 | 0.365 | 0.158 |
| Difficulty variance (in-level uniformity) | 0.001 | 0.022 | 0.005 |

**Level count:** 9

