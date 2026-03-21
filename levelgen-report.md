# Level difficulty report

Generated: 2026-03-21T15:18:59.862Z  
Seed: 1337  
Levels: 32 (rejected: 0)

## Overall

Targets from `LEVELGEN.md` (Level configuration); metrics without entries leave target columns empty.

| Metric | Target range | Current generation target | Actual (this run) |
| --- | --- | --- | --- |
| Grid width | 7-8 | max 8 (batches + random pool) | 7 – 8 (mean 7.813) |
| Grid height | 7-13 | often ≥ width (portrait batches) | 7 – 15 (mean 11.656) |
| Tile count | 61-120 (most levels) | ~48-120 with emphasis on 60+ | 54 – 93 (mean 70.875) |
| Layers/depth | 4-10 (most levels) | 4-10 | 2 – 4 (mean 2.813) · distinct z with ≥1 tile |
| Tile type count | mostly 12 | 7-12 with medium/hard at 12 | 7 – 12 (mean 10.250) |
| Difficulty score | ~0.34-0.76 | intentionally pushed upward via deeper stacks and tighter slack constraints | 0.602 – 0.771 (mean 0.687) |
| Min tray slack | mostly 1 | medium/hard batches require solver minSlack <= 1 | 1 – 1 (mean 1) |
| Mean visibility hardness |  |  | 0.741 |
| Mean strategic pressure (slack + rollout) |  |  | 0.772 |
| Mean dig hardness |  |  | 0.577 |
| Mean skill reveal share |  |  | 0.242 |
| Mean chance reveal share |  |  | 0.758 |
| Mean forced-move ratio (report-only) |  |  | 0.343 |
| Mean forced-move ratio (depth-k lookahead, report-only) |  |  | 0.162 |
| Mean rollout failure rate |  |  | 0.877 |
| Mean solution steps |  |  | 70.875 |
| Mean difficulty range (in-level uniformity) |  |  | 0.184 |
| Mean difficulty variance (in-level uniformity) |  |  | 0.007 |

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
| Grid height | 7 | 12 | 9.800 |
| Tile count | 66 | 90 | 80.400 |
| Layer depth (distinct z with tiles) | 3 | 3 | 3 |
| Tile type count | 8 | 8 | 8 |
| Difficulty score | 0.672 | 0.717 | 0.697 |
| Visibility hardness (start) | 0.758 | 0.894 | 0.805 |
| Strategic pressure (slack + rollout) | 0.733 | 0.783 | 0.757 |
| Dig hardness (skill + chance reveals) | 0.574 | 0.592 | 0.580 |
| Skill reveal share (same-column digs) | 0.193 | 0.254 | 0.232 |
| Chance reveal share (cross-cell digs) | 0.746 | 0.807 | 0.768 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.311 | 0.333 | 0.322 |
| Forced-move ratio (depth-k, report-only) | 0.089 | 0.179 | 0.140 |
| Dead-end (rollout) failure rate | 0.800 | 0.900 | 0.847 |
| Avg tappable tiles per step | 7.424 | 10.433 | 9.426 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 66 | 90 | 80.400 |
| Solver nodes expanded | 116 | 405 | 243.800 |
| Difficulty range (in-level uniformity) | 0.094 | 0.294 | 0.197 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.015 | 0.008 |

**Level count:** 5

### Batch 3 — `heart`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 12 | 12 | 12 |
| Tile count | 54 | 54 | 54 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 10 | 10 | 10 |
| Difficulty score | 0.636 | 0.687 | 0.654 |
| Visibility hardness (start) | 0.593 | 0.719 | 0.672 |
| Strategic pressure (slack + rollout) | 0.650 | 0.783 | 0.733 |
| Dig hardness (skill + chance reveals) | 0.546 | 0.624 | 0.594 |
| Skill reveal share (same-column digs) | 0.088 | 0.346 | 0.186 |
| Chance reveal share (cross-cell digs) | 0.654 | 0.912 | 0.814 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.333 | 0.370 | 0.358 |
| Forced-move ratio (depth-k, report-only) | 0.167 | 0.185 | 0.173 |
| Dead-end (rollout) failure rate | 0.633 | 0.900 | 0.800 |
| Avg tappable tiles per step | 11.167 | 11.481 | 11.321 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 54 | 54 | 54 |
| Solver nodes expanded | 187 | 237 | 206.333 |
| Difficulty range (in-level uniformity) | 0.210 | 0.263 | 0.232 |
| Difficulty variance (in-level uniformity) | 0.008 | 0.012 | 0.009 |

**Level count:** 3

### Batch 4 — `hexagon`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 12 | 12 | 12 |
| Tile count | 60 | 60 | 60 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.661 | 0.704 | 0.686 |
| Visibility hardness (start) | 0.640 | 0.700 | 0.668 |
| Strategic pressure (slack + rollout) | 0.800 | 0.833 | 0.817 |
| Dig hardness (skill + chance reveals) | 0.559 | 0.622 | 0.583 |
| Skill reveal share (same-column digs) | 0.094 | 0.303 | 0.223 |
| Chance reveal share (cross-cell digs) | 0.697 | 0.906 | 0.777 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.350 | 0.433 | 0.389 |
| Forced-move ratio (depth-k, report-only) | 0.067 | 0.200 | 0.133 |
| Dead-end (rollout) failure rate | 0.933 | 1 | 0.967 |
| Avg tappable tiles per step | 11.850 | 13.350 | 12.556 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 60 | 60 | 60 |
| Solver nodes expanded | 122 | 1424 | 764.667 |
| Difficulty range (in-level uniformity) | 0.131 | 0.143 | 0.139 |
| Difficulty variance (in-level uniformity) | 0.003 | 0.004 | 0.003 |

**Level count:** 3

### Batch 5 — `triangle`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 12 | 12 | 12 |
| Tile count | 63 | 63 | 63 |
| Layer depth (distinct z with tiles) | 3 | 3 | 3 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.688 | 0.708 | 0.698 |
| Visibility hardness (start) | 0.705 | 0.733 | 0.719 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.565 | 0.581 | 0.573 |
| Skill reveal share (same-column digs) | 0.231 | 0.282 | 0.256 |
| Chance reveal share (cross-cell digs) | 0.718 | 0.769 | 0.744 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.349 | 0.365 | 0.357 |
| Forced-move ratio (depth-k, report-only) | 0.032 | 0.143 | 0.087 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 11.857 | 11.952 | 11.905 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 63 | 63 | 63 |
| Solver nodes expanded | 72 | 324 | 198 |
| Difficulty range (in-level uniformity) | 0.173 | 0.314 | 0.244 |
| Difficulty variance (in-level uniformity) | 0.005 | 0.018 | 0.012 |

**Level count:** 2

### Batch 6 — `cross`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 7 | 11 | 9.167 |
| Tile count | 57 | 93 | 76 |
| Layer depth (distinct z with tiles) | 2 | 3 | 2.667 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.666 | 0.771 | 0.736 |
| Visibility hardness (start) | 0.670 | 0.909 | 0.820 |
| Strategic pressure (slack + rollout) | 0.783 | 0.833 | 0.822 |
| Dig hardness (skill + chance reveals) | 0.559 | 0.589 | 0.572 |
| Skill reveal share (same-column digs) | 0.203 | 0.303 | 0.260 |
| Chance reveal share (cross-cell digs) | 0.697 | 0.797 | 0.740 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.333 | 0.439 | 0.365 |
| Forced-move ratio (depth-k, report-only) | 0.058 | 0.281 | 0.205 |
| Dead-end (rollout) failure rate | 0.900 | 1 | 0.978 |
| Avg tappable tiles per step | 9.198 | 13.681 | 11.166 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 57 | 93 | 76 |
| Solver nodes expanded | 76 | 60139 | 11757.833 |
| Difficulty range (in-level uniformity) | 0.099 | 0.288 | 0.151 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.014 | 0.005 |

**Level count:** 6

### Batch 7 — `ring`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 14 | 14 | 14 |
| Tile count | 72 | 72 | 72 |
| Layer depth (distinct z with tiles) | 3 | 4 | 3.667 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.666 | 0.722 | 0.694 |
| Visibility hardness (start) | 0.611 | 0.742 | 0.687 |
| Strategic pressure (slack + rollout) | 0.817 | 0.833 | 0.828 |
| Dig hardness (skill + chance reveals) | 0.543 | 0.581 | 0.557 |
| Skill reveal share (same-column digs) | 0.229 | 0.357 | 0.309 |
| Chance reveal share (cross-cell digs) | 0.643 | 0.771 | 0.691 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.333 | 0.333 | 0.333 |
| Forced-move ratio (depth-k, report-only) | 0.236 | 0.306 | 0.282 |
| Dead-end (rollout) failure rate | 0.967 | 1 | 0.989 |
| Avg tappable tiles per step | 11.861 | 14.167 | 13.190 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 72 | 72 | 72 |
| Solver nodes expanded | 808 | 3338 | 1820 |
| Difficulty range (in-level uniformity) | 0.123 | 0.153 | 0.137 |
| Difficulty variance (in-level uniformity) | 0.003 | 0.004 | 0.003 |

**Level count:** 3

### Batch 8 — `t`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 14 | 14 | 14 |
| Tile count | 75 | 75 | 75 |
| Layer depth (distinct z with tiles) | 3 | 3 | 3 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.707 | 0.715 | 0.711 |
| Visibility hardness (start) | 0.747 | 0.747 | 0.747 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.542 | 0.554 | 0.548 |
| Skill reveal share (same-column digs) | 0.320 | 0.360 | 0.340 |
| Chance reveal share (cross-cell digs) | 0.640 | 0.680 | 0.660 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.347 | 0.347 | 0.347 |
| Forced-move ratio (depth-k, report-only) | 0.200 | 0.240 | 0.220 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 11.320 | 11.440 | 11.380 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 75 | 75 | 75 |
| Solver nodes expanded | 986 | 2302 | 1644 |
| Difficulty range (in-level uniformity) | 0.131 | 0.237 | 0.184 |
| Difficulty variance (in-level uniformity) | 0.003 | 0.010 | 0.006 |

**Level count:** 2

### Batch 9 — `u`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 14 | 14 | 14 |
| Tile count | 63 | 63 | 63 |
| Layer depth (distinct z with tiles) | 3 | 3 | 3 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.623 | 0.707 | 0.665 |
| Visibility hardness (start) | 0.483 | 0.733 | 0.608 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.541 | 0.604 | 0.572 |
| Skill reveal share (same-column digs) | 0.154 | 0.364 | 0.259 |
| Chance reveal share (cross-cell digs) | 0.636 | 0.846 | 0.741 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.302 | 0.349 | 0.325 |
| Forced-move ratio (depth-k, report-only) | 0.111 | 0.111 | 0.111 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 10.587 | 17.778 | 14.183 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 63 | 63 | 63 |
| Solver nodes expanded | 78 | 138 | 108 |
| Difficulty range (in-level uniformity) | 0.118 | 0.129 | 0.123 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.004 | 0.003 |

**Level count:** 2

## By difficulty band

Bands are **tertiles** (bottom/middle/top third by difficulty score).

### Easy (bottom third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 8 | 7.600 |
| Grid height | 10 | 15 | 12.700 |
| Tile count | 54 | 90 | 69.600 |
| Layer depth (distinct z with tiles) | 2 | 3 | 2.600 |
| Tile type count | 7 | 12 | 9.600 |
| Difficulty score | 0.602 | 0.666 | 0.638 |
| Visibility hardness (start) | 0.483 | 0.830 | 0.669 |
| Strategic pressure (slack + rollout) | 0.550 | 0.833 | 0.705 |
| Dig hardness (skill + chance reveals) | 0.541 | 0.612 | 0.579 |
| Skill reveal share (same-column digs) | 0.125 | 0.364 | 0.237 |
| Chance reveal share (cross-cell digs) | 0.636 | 0.875 | 0.763 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.244 | 0.383 | 0.324 |
| Forced-move ratio (depth-k, report-only) | 0.058 | 0.306 | 0.135 |
| Dead-end (rollout) failure rate | 0.433 | 1 | 0.743 |
| Avg tappable tiles per step | 9.303 | 17.778 | 12.402 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 54 | 90 | 69.600 |
| Solver nodes expanded | 76 | 1314 | 279.500 |
| Difficulty range (in-level uniformity) | 0.126 | 0.329 | 0.205 |
| Difficulty variance (in-level uniformity) | 0.003 | 0.018 | 0.008 |

**Level count:** 10

### Medium (middle third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 8 | 7.800 |
| Grid height | 7 | 14 | 11.200 |
| Tile count | 54 | 90 | 69 |
| Layer depth (distinct z with tiles) | 2 | 4 | 2.800 |
| Tile type count | 7 | 12 | 9.600 |
| Difficulty score | 0.671 | 0.703 | 0.688 |
| Visibility hardness (start) | 0.700 | 0.830 | 0.741 |
| Strategic pressure (slack + rollout) | 0.700 | 0.833 | 0.780 |
| Dig hardness (skill + chance reveals) | 0.543 | 0.624 | 0.575 |
| Skill reveal share (same-column digs) | 0.088 | 0.357 | 0.250 |
| Chance reveal share (cross-cell digs) | 0.643 | 0.912 | 0.750 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.311 | 0.439 | 0.346 |
| Forced-move ratio (depth-k, report-only) | 0.032 | 0.281 | 0.139 |
| Dead-end (rollout) failure rate | 0.733 | 1 | 0.893 |
| Avg tappable tiles per step | 7.621 | 13.542 | 10.871 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 54 | 90 | 69 |
| Solver nodes expanded | 72 | 1772 | 510.900 |
| Difficulty range (in-level uniformity) | 0.116 | 0.305 | 0.207 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.018 | 0.008 |

**Level count:** 10

### Hard (top third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 7 | 14 | 11.167 |
| Tile count | 60 | 93 | 73.500 |
| Layer depth (distinct z with tiles) | 2 | 4 | 3 |
| Tile type count | 8 | 12 | 11.333 |
| Difficulty score | 0.704 | 0.771 | 0.728 |
| Visibility hardness (start) | 0.663 | 0.909 | 0.800 |
| Strategic pressure (slack + rollout) | 0.750 | 0.833 | 0.821 |
| Dig hardness (skill + chance reveals) | 0.542 | 0.622 | 0.578 |
| Skill reveal share (same-column digs) | 0.094 | 0.360 | 0.240 |
| Chance reveal share (cross-cell digs) | 0.640 | 0.906 | 0.760 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.333 | 0.433 | 0.355 |
| Forced-move ratio (depth-k, report-only) | 0.111 | 0.306 | 0.202 |
| Dead-end (rollout) failure rate | 0.833 | 1 | 0.975 |
| Avg tappable tiles per step | 7.424 | 13.350 | 10.714 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 60 | 93 | 73.500 |
| Solver nodes expanded | 78 | 60139 | 6420.750 |
| Difficulty range (in-level uniformity) | 0.094 | 0.314 | 0.146 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.018 | 0.005 |

**Level count:** 12

