# Level difficulty report

Generated: 2026-03-21T14:57:45.651Z  
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

## By batch

Aggregate metrics for each config batch (before difficulty tertiles; level `id` order is by difficulty score).

### Batch 1 — `diamond`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 7 | 7 |
| Grid height | 10 | 15 | 12.500 |
| Tile count | 60 | 90 | 75 |
| Layer depth (distinct z with tiles) | 3 | 3 | 3 |
| Tile type count | 7 | 7 | 7 |
| Difficulty score | 0.602 | 0.680 | 0.640 |
| Visibility hardness (start) | 0.710 | 0.830 | 0.756 |
| Strategic pressure (slack + rollout) | 0.550 | 0.767 | 0.642 |
| Dig hardness (skill + chance reveals) | 0.581 | 0.608 | 0.592 |
| Skill reveal share (same-column digs) | 0.140 | 0.231 | 0.194 |
| Chance reveal share (cross-cell digs) | 0.769 | 0.860 | 0.806 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.244 | 0.379 | 0.311 |
| Forced-move ratio (depth-k, report-only) | 0.067 | 0.143 | 0.106 |
| Dead-end (rollout) failure rate | 0.433 | 0.867 | 0.617 |
| Avg tappable tiles per step | 7.621 | 12.422 | 10.173 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 60 | 90 | 75 |
| Solver nodes expanded | 96 | 223 | 152.333 |
| Difficulty range (in-level uniformity) | 0.116 | 0.329 | 0.226 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.018 | 0.011 |

**Level count:** 6

### Batch 2 — `circle`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 11 | 11 | 11 |
| Tile count | 54 | 54 | 54 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 8 | 8 | 8 |
| Difficulty score | 0.581 | 0.604 | 0.593 |
| Visibility hardness (start) | 0.615 | 0.641 | 0.628 |
| Strategic pressure (slack + rollout) | 0.600 | 0.683 | 0.642 |
| Dig hardness (skill + chance reveals) | 0.511 | 0.536 | 0.523 |
| Skill reveal share (same-column digs) | 0.379 | 0.464 | 0.422 |
| Chance reveal share (cross-cell digs) | 0.536 | 0.621 | 0.578 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.259 | 0.296 | 0.278 |
| Forced-move ratio (depth-k, report-only) | 0.130 | 0.167 | 0.148 |
| Dead-end (rollout) failure rate | 0.533 | 0.700 | 0.617 |
| Avg tappable tiles per step | 11.926 | 12.352 | 12.139 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 54 | 54 | 54 |
| Solver nodes expanded | 235 | 1096 | 665.500 |
| Difficulty range (in-level uniformity) | 0.110 | 0.297 | 0.203 |
| Difficulty variance (in-level uniformity) | 0.003 | 0.015 | 0.009 |

**Level count:** 2

### Batch 3 — `heart`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 12 | 12 | 12 |
| Tile count | 54 | 54 | 54 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 10 | 10 | 10 |
| Difficulty score | 0.593 | 0.642 | 0.620 |
| Visibility hardness (start) | 0.578 | 0.711 | 0.646 |
| Strategic pressure (slack + rollout) | 0.633 | 0.733 | 0.672 |
| Dig hardness (skill + chance reveals) | 0.563 | 0.595 | 0.579 |
| Skill reveal share (same-column digs) | 0.182 | 0.292 | 0.238 |
| Chance reveal share (cross-cell digs) | 0.708 | 0.818 | 0.762 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.315 | 0.352 | 0.333 |
| Forced-move ratio (depth-k, report-only) | 0.111 | 0.167 | 0.136 |
| Dead-end (rollout) failure rate | 0.600 | 0.800 | 0.678 |
| Avg tappable tiles per step | 11.037 | 12.611 | 11.883 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 54 | 54 | 54 |
| Solver nodes expanded | 142 | 556 | 283 |
| Difficulty range (in-level uniformity) | 0.123 | 0.297 | 0.190 |
| Difficulty variance (in-level uniformity) | 0.003 | 0.015 | 0.007 |

**Level count:** 3

### Batch 4 — `hexagon`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 12 | 12 | 12 |
| Tile count | 60 | 60 | 60 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.654 | 0.701 | 0.685 |
| Visibility hardness (start) | 0.587 | 0.700 | 0.660 |
| Strategic pressure (slack + rollout) | 0.817 | 0.833 | 0.828 |
| Dig hardness (skill + chance reveals) | 0.542 | 0.584 | 0.568 |
| Skill reveal share (same-column digs) | 0.219 | 0.360 | 0.274 |
| Chance reveal share (cross-cell digs) | 0.640 | 0.781 | 0.726 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.350 | 0.433 | 0.389 |
| Forced-move ratio (depth-k, report-only) | 0.167 | 0.250 | 0.206 |
| Dead-end (rollout) failure rate | 0.967 | 1 | 0.989 |
| Avg tappable tiles per step | 12.467 | 14.867 | 13.361 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 60 | 60 | 60 |
| Solver nodes expanded | 368 | 697 | 552.667 |
| Difficulty range (in-level uniformity) | 0.095 | 0.155 | 0.115 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.004 | 0.002 |

**Level count:** 3

### Batch 5 — `triangle`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 12 | 12 | 12 |
| Tile count | 63 | 63 | 63 |
| Layer depth (distinct z with tiles) | 3 | 3 | 3 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.718 | 0.726 | 0.722 |
| Visibility hardness (start) | 0.733 | 0.762 | 0.748 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.596 | 0.612 | 0.604 |
| Skill reveal share (same-column digs) | 0.128 | 0.179 | 0.154 |
| Chance reveal share (cross-cell digs) | 0.821 | 0.872 | 0.846 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.333 | 0.381 | 0.357 |
| Forced-move ratio (depth-k, report-only) | 0.159 | 0.206 | 0.183 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 12.222 | 12.254 | 12.238 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 63 | 63 | 63 |
| Solver nodes expanded | 434 | 935 | 684.500 |
| Difficulty range (in-level uniformity) | 0.083 | 0.152 | 0.118 |
| Difficulty variance (in-level uniformity) | 0.001 | 0.004 | 0.003 |

**Level count:** 2

### Batch 6 — `cross`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 7 | 11 | 9.167 |
| Tile count | 57 | 93 | 76 |
| Layer depth (distinct z with tiles) | 2 | 3 | 2.667 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.660 | 0.770 | 0.732 |
| Visibility hardness (start) | 0.642 | 0.928 | 0.810 |
| Strategic pressure (slack + rollout) | 0.767 | 0.833 | 0.822 |
| Dig hardness (skill + chance reveals) | 0.560 | 0.588 | 0.574 |
| Skill reveal share (same-column digs) | 0.205 | 0.299 | 0.253 |
| Chance reveal share (cross-cell digs) | 0.701 | 0.795 | 0.747 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.321 | 0.472 | 0.383 |
| Forced-move ratio (depth-k, report-only) | 0.188 | 0.258 | 0.222 |
| Dead-end (rollout) failure rate | 0.867 | 1 | 0.978 |
| Avg tappable tiles per step | 9.083 | 14.130 | 11.035 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 57 | 93 | 76 |
| Solver nodes expanded | 395 | 20420 | 4678.667 |
| Difficulty range (in-level uniformity) | 0.092 | 0.134 | 0.112 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.004 | 0.002 |

**Level count:** 6

### Batch 7 — `ring`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 14 | 14 | 14 |
| Tile count | 72 | 72 | 72 |
| Layer depth (distinct z with tiles) | 4 | 4 | 4 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.690 | 0.733 | 0.717 |
| Visibility hardness (start) | 0.694 | 0.792 | 0.747 |
| Strategic pressure (slack + rollout) | 0.800 | 0.833 | 0.822 |
| Dig hardness (skill + chance reveals) | 0.552 | 0.600 | 0.573 |
| Skill reveal share (same-column digs) | 0.167 | 0.326 | 0.255 |
| Chance reveal share (cross-cell digs) | 0.674 | 0.833 | 0.745 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.375 | 0.403 | 0.384 |
| Forced-move ratio (depth-k, report-only) | 0.208 | 0.236 | 0.222 |
| Dead-end (rollout) failure rate | 0.933 | 1 | 0.978 |
| Avg tappable tiles per step | 10.264 | 11.861 | 10.981 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 72 | 72 | 72 |
| Solver nodes expanded | 609 | 19792 | 7458.333 |
| Difficulty range (in-level uniformity) | 0.093 | 0.143 | 0.117 |
| Difficulty variance (in-level uniformity) | 0.001 | 0.003 | 0.002 |

**Level count:** 3

### Batch 8 — `t`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 14 | 14 | 14 |
| Tile count | 75 | 75 | 75 |
| Layer depth (distinct z with tiles) | 3 | 3 | 3 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.710 | 0.711 | 0.710 |
| Visibility hardness (start) | 0.747 | 0.747 | 0.747 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.542 | 0.548 | 0.545 |
| Skill reveal share (same-column digs) | 0.340 | 0.360 | 0.350 |
| Chance reveal share (cross-cell digs) | 0.640 | 0.660 | 0.650 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.307 | 0.360 | 0.333 |
| Forced-move ratio (depth-k, report-only) | 0.147 | 0.213 | 0.180 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 11.387 | 11.613 | 11.500 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 75 | 75 | 75 |
| Solver nodes expanded | 1255 | 2166 | 1710.500 |
| Difficulty range (in-level uniformity) | 0.131 | 0.141 | 0.136 |
| Difficulty variance (in-level uniformity) | 0.003 | 0.003 | 0.003 |

**Level count:** 2

### Batch 9 — `u`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 14 | 14 | 14 |
| Tile count | 63 | 63 | 63 |
| Layer depth (distinct z with tiles) | 3 | 3 | 3 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.691 | 0.704 | 0.697 |
| Visibility hardness (start) | 0.673 | 0.740 | 0.706 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.545 | 0.579 | 0.562 |
| Skill reveal share (same-column digs) | 0.235 | 0.350 | 0.293 |
| Chance reveal share (cross-cell digs) | 0.650 | 0.765 | 0.707 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.349 | 0.413 | 0.381 |
| Forced-move ratio (depth-k, report-only) | 0.175 | 0.238 | 0.206 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 9.587 | 12.159 | 10.873 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 63 | 63 | 63 |
| Solver nodes expanded | 347 | 624 | 485.500 |
| Difficulty range (in-level uniformity) | 0.083 | 0.118 | 0.100 |
| Difficulty variance (in-level uniformity) | 0.001 | 0.002 | 0.002 |

**Level count:** 2

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

