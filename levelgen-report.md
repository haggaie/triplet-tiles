# Level difficulty report

Generated: 2026-03-21T10:23:15.175Z  
Seed: 1337  
Levels: 23 (rejected: 0)

## Overall

Targets from `LEVELGEN.md` (Level configuration); metrics without entries leave target columns empty.

| Metric | Target range | Current generation target | Actual (this run) |
| --- | --- | --- | --- |
| Grid width | 7-8 | max 8 (batches + random pool) | 7 – 8 (mean 7.870) |
| Grid height | 7-13 | often ≥ width (portrait batches) | 10 – 14 (mean 12.261) |
| Tile count | 61-120 (most levels) | ~48-120 with emphasis on 60+ | 36 – 96 (mean 63.652) |
| Layers/depth | 4-10 (most levels) | 4-10 | 2 – 4 (mean 2.652) · distinct z with ≥1 tile |
| Tile type count | mostly 12 | 7-12 with medium/hard at 12 | 7 – 12 (mean 10.739) |
| Difficulty score | ~0.34-0.76 | intentionally pushed upward via deeper stacks and tighter slack constraints | 0.565 – 0.764 (mean 0.665) |
| Min tray slack | mostly 1 | medium/hard batches require solver minSlack <= 1 | 1 – 1 (mean 1) |
| Mean visibility hardness |  |  | 0.693 |
| Mean strategic pressure (slack + rollout) |  |  | 0.758 |
| Mean dig hardness |  |  | 0.558 |
| Mean skill reveal share |  |  | 0.308 |
| Mean chance reveal share |  |  | 0.692 |
| Mean forced-move ratio (report-only) |  |  | 0.349 |
| Mean forced-move ratio (depth-k lookahead, report-only) |  |  | 0.175 |
| Mean rollout failure rate |  |  | 0.849 |
| Mean solution steps |  |  | 63.652 |
| Mean difficulty range (in-level uniformity) |  |  | 0.180 |
| Mean difficulty variance (in-level uniformity) |  |  | 0.007 |

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
| Difficulty score | 0.565 | 0.608 | 0.589 |
| Visibility hardness (start) | 0.435 | 0.744 | 0.646 |
| Strategic pressure (slack + rollout) | 0.483 | 0.833 | 0.614 |
| Dig hardness (skill + chance reveals) | 0.476 | 0.582 | 0.548 |
| Skill reveal share (same-column digs) | 0.227 | 0.579 | 0.340 |
| Chance reveal share (cross-cell digs) | 0.421 | 0.773 | 0.660 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.278 | 0.389 | 0.345 |
| Forced-move ratio (depth-k, report-only) | 0.028 | 0.254 | 0.137 |
| Dead-end (rollout) failure rate | 0.300 | 1 | 0.562 |
| Avg tappable tiles per step | 6.444 | 19.397 | 11.082 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 36 | 63 | 47.571 |
| Solver nodes expanded | 37 | 3288 | 630.143 |
| Difficulty range (in-level uniformity) | 0.110 | 0.337 | 0.213 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.019 | 0.009 |

**Level count:** 7

### Medium (middle third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 12 | 14 | 12.571 |
| Tile count | 54 | 72 | 60.429 |
| Layer depth (distinct z with tiles) | 2 | 4 | 2.429 |
| Tile type count | 10 | 12 | 11.429 |
| Difficulty score | 0.643 | 0.686 | 0.663 |
| Visibility hardness (start) | 0.557 | 0.681 | 0.623 |
| Strategic pressure (slack + rollout) | 0.750 | 0.833 | 0.810 |
| Dig hardness (skill + chance reveals) | 0.516 | 0.622 | 0.553 |
| Skill reveal share (same-column digs) | 0.094 | 0.448 | 0.323 |
| Chance reveal share (cross-cell digs) | 0.552 | 0.906 | 0.677 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.296 | 0.417 | 0.349 |
| Forced-move ratio (depth-k, report-only) | 0.093 | 0.250 | 0.173 |
| Dead-end (rollout) failure rate | 0.833 | 1 | 0.952 |
| Avg tappable tiles per step | 11.722 | 16.167 | 13.682 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 54 | 72 | 60.429 |
| Solver nodes expanded | 116 | 6082 | 1245.571 |
| Difficulty range (in-level uniformity) | 0.118 | 0.329 | 0.211 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.019 | 0.009 |

**Level count:** 7

### Hard (top third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 12 | 14 | 12.889 |
| Tile count | 63 | 96 | 78.667 |
| Layer depth (distinct z with tiles) | 3 | 4 | 3.222 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.690 | 0.764 | 0.726 |
| Visibility hardness (start) | 0.689 | 0.892 | 0.784 |
| Strategic pressure (slack + rollout) | 0.800 | 0.833 | 0.830 |
| Dig hardness (skill + chance reveals) | 0.531 | 0.604 | 0.568 |
| Skill reveal share (same-column digs) | 0.154 | 0.395 | 0.272 |
| Chance reveal share (cross-cell digs) | 0.605 | 0.846 | 0.728 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.278 | 0.429 | 0.351 |
| Forced-move ratio (depth-k, report-only) | 0.083 | 0.286 | 0.206 |
| Dead-end (rollout) failure rate | 0.933 | 1 | 0.993 |
| Avg tappable tiles per step | 10.604 | 12.053 | 11.240 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 63 | 96 | 78.667 |
| Solver nodes expanded | 532 | 10870 | 2629.556 |
| Difficulty range (in-level uniformity) | 0.112 | 0.186 | 0.132 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.006 | 0.003 |

**Level count:** 9

