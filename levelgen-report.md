# Level difficulty report

Generated: 2026-03-28T19:22:27.188Z  
Seed: 1337  
Levels: 30 (rejected: 12)

## Overall

Targets from `LEVELGEN.md` (Level configuration); metrics without entries leave target columns empty.

| Metric | Target range | Current generation target | Actual (this run) |
| --- | --- | --- | --- |
| Grid width | 7-8 | max 8 (batches + random pool) | 7 – 15 (mean 9.300) |
| Grid height | 7-13 | often ≥ width (portrait batches) | 7 – 15 (mean 10.733) |
| Tile count | 61-120 (most levels) | ~48-120 with emphasis on 60+ | 60 – 546 (mean 175.700) |
| Layers/depth | 4-10 (most levels) | 4-10 | 2 – 10 (mean 4.933) · distinct z with ≥1 tile |
| Tile type count | mostly 12 | 7-12 with medium/hard at 12 | 7 – 12 (mean 10.267) |
| Difficulty score | ~0.34-0.76 | intentionally pushed upward via deeper stacks and tighter slack constraints | 0.602 – 0.786 (mean 0.727) |
| Min tray slack | mostly 1 | medium/hard batches require solver minSlack <= 1 | 1 – 1 (mean 1) |
| Mean visibility hardness |  |  | 0.842 |
| Mean strategic pressure (slack + rollout) |  |  | 0.779 |
| Mean dig hardness |  |  | 0.582 |
| Mean skill reveal share |  |  | 0.227 |
| Mean chance reveal share |  |  | 0.773 |
| Mean forced-move ratio (report-only) |  |  | 0.321 |
| Mean forced-move ratio (depth-k lookahead, report-only) |  |  | 0.172 |
| Mean rollout failure rate |  |  | 0.891 |
| Mean solution steps |  |  | 175.700 |
| Mean difficulty range (in-level uniformity) |  |  | 0.156 |
| Mean difficulty variance (in-level uniformity) |  |  | 0.005 |

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
| Grid width | 7 | 7 | 7 |
| Grid height | 8 | 8 | 8 |
| Tile count | 126 | 126 | 126 |
| Layer depth (distinct z with tiles) | 6 | 6 | 6 |
| Tile type count | 10 | 10 | 10 |
| Difficulty score | 0.778 | 0.778 | 0.778 |
| Visibility hardness (start) | 0.957 | 0.957 | 0.957 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.581 | 0.581 | 0.581 |
| Skill reveal share (same-column digs) | 0.231 | 0.231 | 0.231 |
| Chance reveal share (cross-cell digs) | 0.769 | 0.769 | 0.769 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.341 | 0.341 | 0.341 |
| Forced-move ratio (depth-k, report-only) | 0.183 | 0.183 | 0.183 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 7.690 | 7.690 | 7.690 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 126 | 126 | 126 |
| Solver nodes expanded | 1341 | 1341 | 1341 |
| Difficulty range (in-level uniformity) | 0.095 | 0.095 | 0.095 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.002 | 0.002 |

**Level count:** 1

### Batch 4 — `hexagon`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 9 | 9 | 9 |
| Grid height | 9 | 9 | 9 |
| Tile count | 180 | 180 | 180 |
| Layer depth (distinct z with tiles) | 6 | 6 | 6 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.772 | 0.781 | 0.777 |
| Visibility hardness (start) | 0.893 | 0.923 | 0.907 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.573 | 0.576 | 0.575 |
| Skill reveal share (same-column digs) | 0.245 | 0.258 | 0.249 |
| Chance reveal share (cross-cell digs) | 0.742 | 0.755 | 0.751 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.350 | 0.417 | 0.376 |
| Forced-move ratio (depth-k, report-only) | 0.211 | 0.294 | 0.243 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 10.111 | 10.928 | 10.522 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 180 | 180 | 180 |
| Solver nodes expanded | 3665 | 72112 | 42866 |
| Difficulty range (in-level uniformity) | 0.107 | 0.123 | 0.114 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.003 | 0.002 |

**Level count:** 3

### Batch 5 — `triangle`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 15 | 15 | 15 |
| Grid height | 15 | 15 | 15 |
| Tile count | 234 | 234 | 234 |
| Layer depth (distinct z with tiles) | 7 | 7 | 7 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.747 | 0.754 | 0.750 |
| Visibility hardness (start) | 0.800 | 0.808 | 0.804 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.595 | 0.602 | 0.598 |
| Skill reveal share (same-column digs) | 0.161 | 0.183 | 0.172 |
| Chance reveal share (cross-cell digs) | 0.817 | 0.839 | 0.828 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.261 | 0.303 | 0.282 |
| Forced-move ratio (depth-k, report-only) | 0.167 | 0.192 | 0.179 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 19.538 | 19.769 | 19.654 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 234 | 234 | 234 |
| Solver nodes expanded | 8310 | 14867 | 11588.500 |
| Difficulty range (in-level uniformity) | 0.133 | 0.136 | 0.134 |
| Difficulty variance (in-level uniformity) | 0.003 | 0.003 | 0.003 |

**Level count:** 2

### Batch 6 — `cross`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 10 | 10 | 10 |
| Grid height | 10 | 10 | 10 |
| Tile count | 78 | 96 | 90 |
| Layer depth (distinct z with tiles) | 2 | 3 | 2.667 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.678 | 0.758 | 0.732 |
| Visibility hardness (start) | 0.692 | 0.910 | 0.819 |
| Strategic pressure (slack + rollout) | 0.783 | 0.833 | 0.817 |
| Dig hardness (skill + chance reveals) | 0.570 | 0.597 | 0.584 |
| Skill reveal share (same-column digs) | 0.178 | 0.266 | 0.221 |
| Chance reveal share (cross-cell digs) | 0.734 | 0.822 | 0.779 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.282 | 0.375 | 0.339 |
| Forced-move ratio (depth-k, report-only) | 0.051 | 0.260 | 0.179 |
| Dead-end (rollout) failure rate | 0.900 | 1 | 0.967 |
| Avg tappable tiles per step | 9.531 | 16.679 | 12.097 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 78 | 96 | 90 |
| Solver nodes expanded | 136 | 3614 | 1276 |
| Difficulty range (in-level uniformity) | 0.128 | 0.207 | 0.147 |
| Difficulty variance (in-level uniformity) | 0.003 | 0.007 | 0.004 |

**Level count:** 6

### Batch 7 — `ring`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 10 | 10 | 10 |
| Grid height | 10 | 10 | 10 |
| Tile count | 375 | 375 | 375 |
| Layer depth (distinct z with tiles) | 9 | 9 | 9 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.781 | 0.784 | 0.783 |
| Visibility hardness (start) | 0.919 | 0.929 | 0.924 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.573 | 0.575 | 0.574 |
| Skill reveal share (same-column digs) | 0.250 | 0.256 | 0.253 |
| Chance reveal share (cross-cell digs) | 0.744 | 0.750 | 0.747 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.307 | 0.341 | 0.319 |
| Forced-move ratio (depth-k, report-only) | 0.200 | 0.227 | 0.218 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 12.024 | 13.603 | 12.596 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 375 | 375 | 375 |
| Solver nodes expanded | 26519 | 31735 | 29023.333 |
| Difficulty range (in-level uniformity) | 0.097 | 0.108 | 0.101 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.002 | 0.002 |

**Level count:** 3

### Batch 8 — `t`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 12 | 12 | 12 |
| Grid height | 12 | 12 | 12 |
| Tile count | 264 | 264 | 264 |
| Layer depth (distinct z with tiles) | 7 | 7 | 7 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.785 | 0.786 | 0.786 |
| Visibility hardness (start) | 0.944 | 0.944 | 0.944 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.564 | 0.589 | 0.577 |
| Skill reveal share (same-column digs) | 0.204 | 0.286 | 0.245 |
| Chance reveal share (cross-cell digs) | 0.714 | 0.796 | 0.755 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.307 | 0.330 | 0.318 |
| Forced-move ratio (depth-k, report-only) | 0.193 | 0.208 | 0.201 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 10.557 | 11.284 | 10.920 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 264 | 264 | 264 |
| Solver nodes expanded | 8555 | 28215 | 18385 |
| Difficulty range (in-level uniformity) | 0.116 | 0.122 | 0.119 |
| Difficulty variance (in-level uniformity) | 0.003 | 0.003 | 0.003 |

**Level count:** 2

### Batch 9 — `u`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 12 | 12 | 12 |
| Grid height | 12 | 12 | 12 |
| Tile count | 546 | 546 | 546 |
| Layer depth (distinct z with tiles) | 10 | 10 | 10 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.779 | 0.785 | 0.782 |
| Visibility hardness (start) | 0.917 | 0.917 | 0.917 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.556 | 0.565 | 0.560 |
| Skill reveal share (same-column digs) | 0.282 | 0.315 | 0.298 |
| Chance reveal share (cross-cell digs) | 0.685 | 0.718 | 0.702 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.245 | 0.266 | 0.255 |
| Forced-move ratio (depth-k, report-only) | 0.152 | 0.262 | 0.207 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 15.046 | 15.718 | 15.382 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 546 | 546 | 546 |
| Solver nodes expanded | 55661 | 114627 | 85144 |
| Difficulty range (in-level uniformity) | 0.102 | 0.108 | 0.105 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.002 | 0.002 |

**Level count:** 2

## By difficulty band

Bands are **tertiles** (bottom/middle/top third by difficulty score).

### Easy (bottom third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 10 | 7.300 |
| Grid height | 9 | 15 | 11.300 |
| Tile count | 60 | 90 | 78.600 |
| Layer depth (distinct z with tiles) | 2 | 3 | 2.900 |
| Tile type count | 7 | 12 | 7.800 |
| Difficulty score | 0.602 | 0.694 | 0.658 |
| Visibility hardness (start) | 0.692 | 0.830 | 0.756 |
| Strategic pressure (slack + rollout) | 0.550 | 0.783 | 0.688 |
| Dig hardness (skill + chance reveals) | 0.574 | 0.608 | 0.588 |
| Skill reveal share (same-column digs) | 0.140 | 0.254 | 0.206 |
| Chance reveal share (cross-cell digs) | 0.746 | 0.860 | 0.794 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.244 | 0.379 | 0.314 |
| Forced-move ratio (depth-k, report-only) | 0.051 | 0.167 | 0.106 |
| Dead-end (rollout) failure rate | 0.433 | 0.900 | 0.710 |
| Avg tappable tiles per step | 7.621 | 14.692 | 10.597 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 60 | 90 | 78.600 |
| Solver nodes expanded | 96 | 340 | 169.500 |
| Difficulty range (in-level uniformity) | 0.116 | 0.329 | 0.232 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.018 | 0.010 |

**Level count:** 10

### Medium (middle third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 15 | 10.300 |
| Grid height | 7 | 15 | 10.500 |
| Tile count | 66 | 234 | 125.400 |
| Layer depth (distinct z with tiles) | 2 | 7 | 4 |
| Tile type count | 8 | 12 | 11.200 |
| Difficulty score | 0.697 | 0.772 | 0.741 |
| Visibility hardness (start) | 0.692 | 0.923 | 0.845 |
| Strategic pressure (slack + rollout) | 0.750 | 0.833 | 0.815 |
| Dig hardness (skill + chance reveals) | 0.570 | 0.602 | 0.585 |
| Skill reveal share (same-column digs) | 0.161 | 0.266 | 0.217 |
| Chance reveal share (cross-cell digs) | 0.734 | 0.839 | 0.783 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.261 | 0.375 | 0.328 |
| Forced-move ratio (depth-k, report-only) | 0.152 | 0.260 | 0.193 |
| Dead-end (rollout) failure rate | 0.833 | 1 | 0.963 |
| Avg tappable tiles per step | 7.424 | 19.769 | 12.501 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 66 | 234 | 125.400 |
| Solver nodes expanded | 169 | 14867 | 3493.600 |
| Difficulty range (in-level uniformity) | 0.094 | 0.143 | 0.130 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.004 | 0.003 |

**Level count:** 10

### Hard (top third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 12 | 10.300 |
| Grid height | 8 | 12 | 10.400 |
| Tile count | 126 | 546 | 323.100 |
| Layer depth (distinct z with tiles) | 6 | 10 | 7.900 |
| Tile type count | 10 | 12 | 11.800 |
| Difficulty score | 0.778 | 0.786 | 0.782 |
| Visibility hardness (start) | 0.893 | 0.957 | 0.925 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.556 | 0.589 | 0.573 |
| Skill reveal share (same-column digs) | 0.204 | 0.315 | 0.258 |
| Chance reveal share (cross-cell digs) | 0.685 | 0.796 | 0.742 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.245 | 0.417 | 0.322 |
| Forced-move ratio (depth-k, report-only) | 0.152 | 0.294 | 0.217 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 7.690 | 15.718 | 11.872 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 126 | 546 | 323.100 |
| Solver nodes expanded | 1341 | 114627 | 42040.200 |
| Difficulty range (in-level uniformity) | 0.095 | 0.122 | 0.106 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.003 | 0.002 |

**Level count:** 10

