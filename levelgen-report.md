# Level difficulty report

Generated: 2026-03-28T18:32:53.635Z  
Seed: 1337  
Levels: 30 (rejected: 2)

## Overall

Targets from `LEVELGEN.md` (Level configuration); metrics without entries leave target columns empty.

| Metric | Target range | Current generation target | Actual (this run) |
| --- | --- | --- | --- |
| Grid width | 7-8 | max 8 (batches + random pool) | 7 – 36 (mean 15.500) |
| Grid height | 7-13 | often ≥ width (portrait batches) | 7 – 37 (mean 16.533) |
| Tile count | 61-120 (most levels) | ~48-120 with emphasis on 60+ | 60 – 120 (mean 77) |
| Layers/depth | 4-10 (most levels) | 4-10 | 2 – 5 (mean 2.600) · distinct z with ≥1 tile |
| Tile type count | mostly 12 | 7-12 with medium/hard at 12 | 7 – 12 (mean 10.267) |
| Difficulty score | ~0.34-0.76 | intentionally pushed upward via deeper stacks and tighter slack constraints | 0.498 – 0.768 (mean 0.658) |
| Min tray slack | mostly 1 | medium/hard batches require solver minSlack <= 1 | 1 – 1 (mean 1) |
| Mean visibility hardness |  |  | 0.665 |
| Mean strategic pressure (slack + rollout) |  |  | 0.749 |
| Mean dig hardness |  |  | 0.582 |
| Mean skill reveal share |  |  | 0.227 |
| Mean chance reveal share |  |  | 0.773 |
| Mean forced-move ratio (report-only) |  |  | 0.311 |
| Mean forced-move ratio (depth-k lookahead, report-only) |  |  | 0.146 |
| Mean rollout failure rate |  |  | 0.831 |
| Mean solution steps |  |  | 77 |
| Mean difficulty range (in-level uniformity) |  |  | 0.207 |
| Mean difficulty variance (in-level uniformity) |  |  | 0.009 |

## By batch

Aggregate metrics for each config batch (before difficulty tertiles; level `id` order is by difficulty score).

### Batch 1 — `diamond`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 7 | 7 |
| Grid height | 9 | 15 | 12 |
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
| Grid width | 7 | 7 | 7 |
| Grid height | 7 | 11 | 9.400 |
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
| Grid width | 9 | 9 | 9 |
| Grid height | 12 | 12 | 12 |
| Tile count | 120 | 120 | 120 |
| Layer depth (distinct z with tiles) | 5 | 5 | 5 |
| Tile type count | 10 | 10 | 10 |
| Difficulty score | 0.757 | 0.757 | 0.757 |
| Visibility hardness (start) | 0.907 | 0.907 | 0.907 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.570 | 0.570 | 0.570 |
| Skill reveal share (same-column digs) | 0.267 | 0.267 | 0.267 |
| Chance reveal share (cross-cell digs) | 0.733 | 0.733 | 0.733 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.408 | 0.408 | 0.408 |
| Forced-move ratio (depth-k, report-only) | 0.208 | 0.208 | 0.208 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 7.867 | 7.867 | 7.867 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 120 | 120 | 120 |
| Solver nodes expanded | 659 | 659 | 659 |
| Difficulty range (in-level uniformity) | 0.101 | 0.101 | 0.101 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.002 | 0.002 |

**Level count:** 1

### Batch 4 — `hexagon`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 27 | 28 | 27.333 |
| Grid height | 28 | 29 | 28.667 |
| Tile count | 60 | 60 | 60 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.498 | 0.535 | 0.518 |
| Visibility hardness (start) | 0.277 | 0.350 | 0.313 |
| Strategic pressure (slack + rollout) | 0.633 | 0.683 | 0.661 |
| Dig hardness (skill + chance reveals) | 0.568 | 0.590 | 0.578 |
| Skill reveal share (same-column digs) | 0.200 | 0.273 | 0.241 |
| Chance reveal share (cross-cell digs) | 0.727 | 0.800 | 0.759 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.250 | 0.267 | 0.256 |
| Forced-move ratio (depth-k, report-only) | 0.083 | 0.150 | 0.122 |
| Dead-end (rollout) failure rate | 0.600 | 0.700 | 0.656 |
| Avg tappable tiles per step | 22.967 | 23.567 | 23.217 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 60 | 60 | 60 |
| Solver nodes expanded | 61 | 253 | 125 |
| Difficulty range (in-level uniformity) | 0.305 | 0.317 | 0.309 |
| Difficulty variance (in-level uniformity) | 0.015 | 0.017 | 0.016 |

**Level count:** 3

### Batch 5 — `triangle`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 15 | 15 | 15 |
| Grid height | 15 | 15 | 15 |
| Tile count | 63 | 63 | 63 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.655 | 0.658 | 0.657 |
| Visibility hardness (start) | 0.568 | 0.568 | 0.568 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.582 | 0.582 | 0.582 |
| Skill reveal share (same-column digs) | 0.226 | 0.226 | 0.226 |
| Chance reveal share (cross-cell digs) | 0.774 | 0.774 | 0.774 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.302 | 0.317 | 0.310 |
| Forced-move ratio (depth-k, report-only) | 0.048 | 0.079 | 0.063 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 14.222 | 15.063 | 14.643 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 63 | 63 | 63 |
| Solver nodes expanded | 70 | 152 | 111 |
| Difficulty range (in-level uniformity) | 0.268 | 0.325 | 0.297 |
| Difficulty variance (in-level uniformity) | 0.012 | 0.018 | 0.015 |

**Level count:** 2

### Batch 6 — `cross`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 10 | 10 | 10 |
| Grid height | 10 | 10 | 10 |
| Tile count | 78 | 96 | 90 |
| Layer depth (distinct z with tiles) | 2 | 3 | 2.667 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.676 | 0.768 | 0.731 |
| Visibility hardness (start) | 0.669 | 0.892 | 0.815 |
| Strategic pressure (slack + rollout) | 0.783 | 0.833 | 0.817 |
| Dig hardness (skill + chance reveals) | 0.577 | 0.597 | 0.585 |
| Skill reveal share (same-column digs) | 0.178 | 0.244 | 0.218 |
| Chance reveal share (cross-cell digs) | 0.756 | 0.822 | 0.782 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.282 | 0.417 | 0.340 |
| Forced-move ratio (depth-k, report-only) | 0.051 | 0.302 | 0.166 |
| Dead-end (rollout) failure rate | 0.900 | 1 | 0.967 |
| Avg tappable tiles per step | 9.531 | 14.885 | 11.929 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 78 | 96 | 90 |
| Solver nodes expanded | 136 | 8738 | 2242.833 |
| Difficulty range (in-level uniformity) | 0.098 | 0.244 | 0.159 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.010 | 0.005 |

**Level count:** 6

### Batch 7 — `ring`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 31 | 32 | 31.667 |
| Grid height | 31 | 32 | 31.333 |
| Tile count | 72 | 72 | 72 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.610 | 0.672 | 0.641 |
| Visibility hardness (start) | 0.519 | 0.581 | 0.557 |
| Strategic pressure (slack + rollout) | 0.717 | 0.833 | 0.772 |
| Dig hardness (skill + chance reveals) | 0.546 | 0.618 | 0.582 |
| Skill reveal share (same-column digs) | 0.108 | 0.346 | 0.227 |
| Chance reveal share (cross-cell digs) | 0.654 | 0.892 | 0.773 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.236 | 0.333 | 0.292 |
| Forced-move ratio (depth-k, report-only) | 0.153 | 0.236 | 0.199 |
| Dead-end (rollout) failure rate | 0.767 | 1 | 0.878 |
| Avg tappable tiles per step | 17.556 | 20.486 | 18.981 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 72 | 72 | 72 |
| Solver nodes expanded | 153 | 3164 | 1683.333 |
| Difficulty range (in-level uniformity) | 0.133 | 0.367 | 0.224 |
| Difficulty variance (in-level uniformity) | 0.004 | 0.022 | 0.011 |

**Level count:** 3

### Batch 8 — `t`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 20 | 20 | 20 |
| Grid height | 11 | 11 | 11 |
| Tile count | 75 | 75 | 75 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.619 | 0.653 | 0.636 |
| Visibility hardness (start) | 0.592 | 0.616 | 0.604 |
| Strategic pressure (slack + rollout) | 0.700 | 0.767 | 0.733 |
| Dig hardness (skill + chance reveals) | 0.542 | 0.573 | 0.558 |
| Skill reveal share (same-column digs) | 0.256 | 0.359 | 0.308 |
| Chance reveal share (cross-cell digs) | 0.641 | 0.744 | 0.692 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.267 | 0.320 | 0.293 |
| Forced-move ratio (depth-k, report-only) | 0.133 | 0.173 | 0.153 |
| Dead-end (rollout) failure rate | 0.733 | 0.867 | 0.800 |
| Avg tappable tiles per step | 15.667 | 16.987 | 16.327 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 75 | 75 | 75 |
| Solver nodes expanded | 895 | 3109 | 2002 |
| Difficulty range (in-level uniformity) | 0.112 | 0.122 | 0.117 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.003 | 0.003 |

**Level count:** 2

### Batch 9 — `u`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 36 | 36 | 36 |
| Grid height | 36 | 37 | 36.500 |
| Tile count | 63 | 63 | 63 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.560 | 0.637 | 0.598 |
| Visibility hardness (start) | 0.222 | 0.422 | 0.322 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.575 | 0.597 | 0.586 |
| Skill reveal share (same-column digs) | 0.176 | 0.250 | 0.213 |
| Chance reveal share (cross-cell digs) | 0.750 | 0.824 | 0.787 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.238 | 0.333 | 0.286 |
| Forced-move ratio (depth-k, report-only) | 0.190 | 0.238 | 0.214 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 23.921 | 25.587 | 24.754 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 63 | 63 | 63 |
| Solver nodes expanded | 164 | 2994 | 1579 |
| Difficulty range (in-level uniformity) | 0.083 | 0.314 | 0.199 |
| Difficulty variance (in-level uniformity) | 0.001 | 0.017 | 0.009 |

**Level count:** 2

## By difficulty band

Bands are **tertiles** (bottom/middle/top third by difficulty score).

### Easy (bottom third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 36 | 22.700 |
| Grid height | 11 | 37 | 24.200 |
| Tile count | 60 | 90 | 71.100 |
| Layer depth (distinct z with tiles) | 2 | 3 | 2.300 |
| Tile type count | 7 | 12 | 10.500 |
| Difficulty score | 0.498 | 0.637 | 0.581 |
| Visibility hardness (start) | 0.222 | 0.722 | 0.486 |
| Strategic pressure (slack + rollout) | 0.550 | 0.833 | 0.687 |
| Dig hardness (skill + chance reveals) | 0.542 | 0.608 | 0.577 |
| Skill reveal share (same-column digs) | 0.140 | 0.359 | 0.243 |
| Chance reveal share (cross-cell digs) | 0.641 | 0.860 | 0.757 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.236 | 0.333 | 0.264 |
| Forced-move ratio (depth-k, report-only) | 0.071 | 0.238 | 0.145 |
| Dead-end (rollout) failure rate | 0.433 | 1 | 0.707 |
| Avg tappable tiles per step | 10 | 25.587 | 18.976 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 60 | 90 | 71.100 |
| Solver nodes expanded | 61 | 3109 | 740.400 |
| Difficulty range (in-level uniformity) | 0.083 | 0.367 | 0.244 |
| Difficulty variance (in-level uniformity) | 0.001 | 0.022 | 0.012 |

**Level count:** 10

### Medium (middle third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 32 | 15.400 |
| Grid height | 9 | 32 | 15.500 |
| Tile count | 60 | 90 | 71.700 |
| Layer depth (distinct z with tiles) | 2 | 3 | 2.300 |
| Tile type count | 7 | 12 | 10.600 |
| Difficulty score | 0.642 | 0.678 | 0.664 |
| Visibility hardness (start) | 0.568 | 0.830 | 0.656 |
| Strategic pressure (slack + rollout) | 0.633 | 0.833 | 0.770 |
| Dig hardness (skill + chance reveals) | 0.573 | 0.618 | 0.588 |
| Skill reveal share (same-column digs) | 0.108 | 0.256 | 0.207 |
| Chance reveal share (cross-cell digs) | 0.744 | 0.892 | 0.793 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.282 | 0.348 | 0.319 |
| Forced-move ratio (depth-k, report-only) | 0.048 | 0.236 | 0.114 |
| Dead-end (rollout) failure rate | 0.600 | 1 | 0.873 |
| Avg tappable tiles per step | 9.303 | 18.903 | 14.171 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 60 | 90 | 71.700 |
| Solver nodes expanded | 70 | 3164 | 680 |
| Difficulty range (in-level uniformity) | 0.112 | 0.325 | 0.233 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.018 | 0.010 |

**Level count:** 10

### Hard (top third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 10 | 8.400 |
| Grid height | 7 | 12 | 9.900 |
| Tile count | 66 | 120 | 88.200 |
| Layer depth (distinct z with tiles) | 3 | 5 | 3.200 |
| Tile type count | 7 | 12 | 9.700 |
| Difficulty score | 0.680 | 0.768 | 0.728 |
| Visibility hardness (start) | 0.777 | 0.907 | 0.853 |
| Strategic pressure (slack + rollout) | 0.700 | 0.833 | 0.790 |
| Dig hardness (skill + chance reveals) | 0.570 | 0.592 | 0.581 |
| Skill reveal share (same-column digs) | 0.193 | 0.267 | 0.230 |
| Chance reveal share (cross-cell digs) | 0.733 | 0.807 | 0.770 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.302 | 0.417 | 0.351 |
| Forced-move ratio (depth-k, report-only) | 0.106 | 0.302 | 0.178 |
| Dead-end (rollout) failure rate | 0.733 | 1 | 0.913 |
| Avg tappable tiles per step | 7.424 | 11.167 | 9.418 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 66 | 120 | 88.200 |
| Solver nodes expanded | 96 | 8738 | 1485.400 |
| Difficulty range (in-level uniformity) | 0.094 | 0.294 | 0.146 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.015 | 0.005 |

**Level count:** 10

