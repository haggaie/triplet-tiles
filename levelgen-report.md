# Level difficulty report

Generated: 2026-03-28T18:43:20.424Z  
Seed: 1337  
Levels: 30 (rejected: 0)

## Overall

Targets from `LEVELGEN.md` (Level configuration); metrics without entries leave target columns empty.

| Metric | Target range | Current generation target | Actual (this run) |
| --- | --- | --- | --- |
| Grid width | 7-8 | max 8 (batches + random pool) | 7 – 20 (mean 9.900) |
| Grid height | 7-13 | often ≥ width (portrait batches) | 7 – 15 (mean 10.800) |
| Tile count | 61-120 (most levels) | ~48-120 with emphasis on 60+ | 60 – 120 (mean 77) |
| Layers/depth | 4-10 (most levels) | 4-10 | 2 – 5 (mean 2.600) · distinct z with ≥1 tile |
| Tile type count | mostly 12 | 7-12 with medium/hard at 12 | 7 – 12 (mean 10.267) |
| Difficulty score | ~0.34-0.76 | intentionally pushed upward via deeper stacks and tighter slack constraints | 0.414 – 0.768 (mean 0.653) |
| Min tray slack | mostly 1 | medium/hard batches require solver minSlack <= 1 | 1 – 1 (mean 1) |
| Mean visibility hardness |  |  | 0.677 |
| Mean strategic pressure (slack + rollout) |  |  | 0.728 |
| Mean dig hardness |  |  | 0.580 |
| Mean skill reveal share |  |  | 0.235 |
| Mean chance reveal share |  |  | 0.765 |
| Mean forced-move ratio (report-only) |  |  | 0.306 |
| Mean forced-move ratio (depth-k lookahead, report-only) |  |  | 0.146 |
| Mean rollout failure rate |  |  | 0.790 |
| Mean solution steps |  |  | 77 |
| Mean difficulty range (in-level uniformity) |  |  | 0.202 |
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
| Grid width | 9 | 9 | 9 |
| Grid height | 9 | 9 | 9 |
| Tile count | 60 | 60 | 60 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.414 | 0.460 | 0.435 |
| Visibility hardness (start) | 0.277 | 0.277 | 0.277 |
| Strategic pressure (slack + rollout) | 0.433 | 0.517 | 0.467 |
| Dig hardness (skill + chance reveals) | 0.560 | 0.560 | 0.560 |
| Skill reveal share (same-column digs) | 0.300 | 0.300 | 0.300 |
| Chance reveal share (cross-cell digs) | 0.700 | 0.700 | 0.700 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.233 | 0.283 | 0.250 |
| Forced-move ratio (depth-k, report-only) | 0.050 | 0.200 | 0.111 |
| Dead-end (rollout) failure rate | 0.200 | 0.367 | 0.267 |
| Avg tappable tiles per step | 24.267 | 25.133 | 24.633 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 60 | 60 | 60 |
| Solver nodes expanded | 61 | 995 | 527 |
| Difficulty range (in-level uniformity) | 0.209 | 0.305 | 0.244 |
| Difficulty variance (in-level uniformity) | 0.007 | 0.018 | 0.011 |

**Level count:** 3

### Batch 5 — `triangle`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 15 | 15 | 15 |
| Grid height | 15 | 15 | 15 |
| Tile count | 63 | 63 | 63 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.680 | 0.687 | 0.683 |
| Visibility hardness (start) | 0.625 | 0.654 | 0.640 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.592 | 0.592 | 0.592 |
| Skill reveal share (same-column digs) | 0.194 | 0.194 | 0.194 |
| Chance reveal share (cross-cell digs) | 0.806 | 0.806 | 0.806 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.349 | 0.365 | 0.357 |
| Forced-move ratio (depth-k, report-only) | 0.127 | 0.175 | 0.151 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 13.603 | 15.206 | 14.405 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 63 | 63 | 63 |
| Solver nodes expanded | 205 | 263 | 234 |
| Difficulty range (in-level uniformity) | 0.140 | 0.348 | 0.244 |
| Difficulty variance (in-level uniformity) | 0.004 | 0.021 | 0.013 |

**Level count:** 2

### Batch 6 — `cross`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 10 | 10 | 10 |
| Grid height | 10 | 10 | 10 |
| Tile count | 78 | 96 | 90 |
| Layer depth (distinct z with tiles) | 2 | 3 | 2.667 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.665 | 0.768 | 0.734 |
| Visibility hardness (start) | 0.669 | 0.910 | 0.824 |
| Strategic pressure (slack + rollout) | 0.750 | 0.833 | 0.817 |
| Dig hardness (skill + chance reveals) | 0.559 | 0.590 | 0.578 |
| Skill reveal share (same-column digs) | 0.200 | 0.304 | 0.240 |
| Chance reveal share (cross-cell digs) | 0.696 | 0.800 | 0.760 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.256 | 0.417 | 0.328 |
| Forced-move ratio (depth-k, report-only) | 0.115 | 0.302 | 0.217 |
| Dead-end (rollout) failure rate | 0.833 | 1 | 0.967 |
| Avg tappable tiles per step | 10.260 | 16.897 | 12.826 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 78 | 96 | 90 |
| Solver nodes expanded | 340 | 8738 | 2398.667 |
| Difficulty range (in-level uniformity) | 0.098 | 0.216 | 0.131 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.008 | 0.004 |

**Level count:** 6

### Batch 7 — `ring`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 10 | 10 | 10 |
| Grid height | 10 | 10 | 10 |
| Tile count | 72 | 72 | 72 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.645 | 0.694 | 0.666 |
| Visibility hardness (start) | 0.622 | 0.672 | 0.639 |
| Strategic pressure (slack + rollout) | 0.767 | 0.817 | 0.783 |
| Dig hardness (skill + chance reveals) | 0.560 | 0.612 | 0.592 |
| Skill reveal share (same-column digs) | 0.125 | 0.300 | 0.192 |
| Chance reveal share (cross-cell digs) | 0.700 | 0.875 | 0.808 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.250 | 0.319 | 0.292 |
| Forced-move ratio (depth-k, report-only) | 0.069 | 0.194 | 0.134 |
| Dead-end (rollout) failure rate | 0.867 | 0.967 | 0.900 |
| Avg tappable tiles per step | 15.056 | 16.139 | 15.708 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 72 | 72 | 72 |
| Solver nodes expanded | 285 | 400 | 346 |
| Difficulty range (in-level uniformity) | 0.123 | 0.347 | 0.269 |
| Difficulty variance (in-level uniformity) | 0.003 | 0.021 | 0.015 |

**Level count:** 3

### Batch 8 — `t`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 20 | 20 | 20 |
| Grid height | 11 | 11 | 11 |
| Tile count | 75 | 75 | 75 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.601 | 0.641 | 0.621 |
| Visibility hardness (start) | 0.616 | 0.616 | 0.616 |
| Strategic pressure (slack + rollout) | 0.650 | 0.750 | 0.700 |
| Dig hardness (skill + chance reveals) | 0.535 | 0.550 | 0.542 |
| Skill reveal share (same-column digs) | 0.333 | 0.385 | 0.359 |
| Chance reveal share (cross-cell digs) | 0.615 | 0.667 | 0.641 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.227 | 0.253 | 0.240 |
| Forced-move ratio (depth-k, report-only) | 0.080 | 0.187 | 0.133 |
| Dead-end (rollout) failure rate | 0.633 | 0.833 | 0.733 |
| Avg tappable tiles per step | 16.987 | 17.173 | 17.080 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 75 | 75 | 75 |
| Solver nodes expanded | 660 | 2443 | 1551.500 |
| Difficulty range (in-level uniformity) | 0.025 | 0.151 | 0.088 |
| Difficulty variance (in-level uniformity) | 0.000 | 0.004 | 0.002 |

**Level count:** 2

### Batch 9 — `u`

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 12 | 12 | 12 |
| Grid height | 12 | 12 | 12 |
| Tile count | 63 | 63 | 63 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.585 | 0.596 | 0.590 |
| Visibility hardness (start) | 0.317 | 0.317 | 0.317 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.586 | 0.586 | 0.586 |
| Skill reveal share (same-column digs) | 0.214 | 0.214 | 0.214 |
| Chance reveal share (cross-cell digs) | 0.786 | 0.786 | 0.786 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.254 | 0.270 | 0.262 |
| Forced-move ratio (depth-k, report-only) | 0.048 | 0.190 | 0.119 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 22.381 | 22.635 | 22.508 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 63 | 63 | 63 |
| Solver nodes expanded | 68 | 535 | 301.500 |
| Difficulty range (in-level uniformity) | 0.302 | 0.314 | 0.308 |
| Difficulty variance (in-level uniformity) | 0.018 | 0.018 | 0.018 |

**Level count:** 2

## By difficulty band

Bands are **tertiles** (bottom/middle/top third by difficulty score).

### Easy (bottom third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 20 | 11.200 |
| Grid height | 9 | 15 | 11.400 |
| Tile count | 60 | 90 | 71.400 |
| Layer depth (distinct z with tiles) | 2 | 3 | 2.300 |
| Tile type count | 7 | 12 | 10.500 |
| Difficulty score | 0.414 | 0.641 | 0.556 |
| Visibility hardness (start) | 0.277 | 0.722 | 0.486 |
| Strategic pressure (slack + rollout) | 0.433 | 0.833 | 0.622 |
| Dig hardness (skill + chance reveals) | 0.535 | 0.608 | 0.571 |
| Skill reveal share (same-column digs) | 0.140 | 0.385 | 0.262 |
| Chance reveal share (cross-cell digs) | 0.615 | 0.860 | 0.738 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.227 | 0.298 | 0.256 |
| Forced-move ratio (depth-k, report-only) | 0.048 | 0.200 | 0.116 |
| Dead-end (rollout) failure rate | 0.200 | 1 | 0.577 |
| Avg tappable tiles per step | 10 | 25.133 | 18.752 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 60 | 90 | 71.400 |
| Solver nodes expanded | 61 | 2443 | 589.600 |
| Difficulty range (in-level uniformity) | 0.025 | 0.329 | 0.215 |
| Difficulty variance (in-level uniformity) | 0.000 | 0.018 | 0.010 |

**Level count:** 10

### Medium (middle third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 15 | 9.500 |
| Grid height | 9 | 15 | 11.300 |
| Tile count | 60 | 90 | 72 |
| Layer depth (distinct z with tiles) | 2 | 3 | 2.500 |
| Tile type count | 7 | 12 | 9.700 |
| Difficulty score | 0.645 | 0.690 | 0.671 |
| Visibility hardness (start) | 0.622 | 0.830 | 0.712 |
| Strategic pressure (slack + rollout) | 0.633 | 0.833 | 0.753 |
| Dig hardness (skill + chance reveals) | 0.560 | 0.605 | 0.587 |
| Skill reveal share (same-column digs) | 0.149 | 0.300 | 0.211 |
| Chance reveal share (cross-cell digs) | 0.700 | 0.851 | 0.789 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.250 | 0.379 | 0.323 |
| Forced-move ratio (depth-k, report-only) | 0.067 | 0.205 | 0.134 |
| Dead-end (rollout) failure rate | 0.600 | 1 | 0.840 |
| Avg tappable tiles per step | 7.621 | 16.154 | 12.288 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 60 | 90 | 72 |
| Solver nodes expanded | 96 | 691 | 245.400 |
| Difficulty range (in-level uniformity) | 0.116 | 0.348 | 0.236 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.021 | 0.011 |

**Level count:** 10

### Hard (top third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 10 | 9 |
| Grid height | 7 | 12 | 9.700 |
| Tile count | 66 | 120 | 87.600 |
| Layer depth (distinct z with tiles) | 2 | 5 | 3 |
| Tile type count | 8 | 12 | 10.600 |
| Difficulty score | 0.693 | 0.768 | 0.731 |
| Visibility hardness (start) | 0.672 | 0.910 | 0.833 |
| Strategic pressure (slack + rollout) | 0.750 | 0.833 | 0.810 |
| Dig hardness (skill + chance reveals) | 0.559 | 0.612 | 0.581 |
| Skill reveal share (same-column digs) | 0.125 | 0.304 | 0.231 |
| Chance reveal share (cross-cell digs) | 0.696 | 0.875 | 0.769 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.256 | 0.417 | 0.340 |
| Forced-move ratio (depth-k, report-only) | 0.115 | 0.302 | 0.189 |
| Dead-end (rollout) failure rate | 0.833 | 1 | 0.953 |
| Avg tappable tiles per step | 7.424 | 16.897 | 11.159 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 66 | 120 | 87.600 |
| Solver nodes expanded | 169 | 8738 | 1562.700 |
| Difficulty range (in-level uniformity) | 0.094 | 0.347 | 0.154 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.021 | 0.006 |

**Level count:** 10

