# Level difficulty report

Generated: 2026-03-21T05:40:05.283Z  
Seed: 1337  
Levels: 25 (rejected: 0)

## Overall

Targets from `LEVELGEN.md` (Level configuration); metrics without entries leave target columns empty.

| Metric | Target range | Current generation target | Actual (this run) |
| --- | --- | --- | --- |
| Grid size | 7-10 | 7-10 | 7 – 10 (mean 9.040) |
| Tile count | 61-120 (most levels) | ~48-120 with emphasis on 60+ | 36 – 120 (mean 84.120) |
| Layers/depth | 4-10 (most levels) | 4-10 | 2 – 9 (mean 2.920) · distinct z with ≥1 tile |
| Tile type count | mostly 12 | 7-12 with medium/hard at 12 | 7 – 12 (mean 10.840) |
| Difficulty score | ~0.34-0.76 | intentionally pushed upward via deeper stacks and tighter slack constraints | 0.434 – 0.585 (mean 0.514) |
| Min tray slack | mostly 1 | medium/hard batches require solver minSlack <= 1 | 1 – 1 (mean 1) |
| Mean forced-move ratio |  |  | 0.298 |
| Mean forced-move ratio (depth-k lookahead) |  |  | 0.159 |
| Mean rollout failure rate |  |  | 0.777 |
| Mean solution steps |  |  | 84.120 |
| Mean difficulty range (in-level uniformity) |  |  | 0.194 |
| Mean difficulty variance (in-level uniformity) |  |  | 0.008 |

## By difficulty band

Bands are **tertiles** (bottom/middle/top third by difficulty score).

### Easy (bottom third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid size | 7 | 10 | 8.375 |
| Tile count | 36 | 108 | 64.125 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 7 | 12 | 9.250 |
| Difficulty score | 0.434 | 0.494 | 0.466 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio | 0.194 | 0.333 | 0.288 |
| Forced-move ratio (depth-k) | 0.056 | 0.198 | 0.124 |
| Dead-end (rollout) failure rate | 0.133 | 0.767 | 0.529 |
| Avg tappable tiles per step | 7.056 | 28.500 | 14.675 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 36 | 108 | 64.125 |
| Solver nodes expanded | 46 | 1894 | 541 |
| Difficulty range (in-level uniformity) | 0.070 | 0.377 | 0.253 |
| Difficulty variance (in-level uniformity) | 0.001 | 0.025 | 0.013 |

**Level count:** 8

### Medium (middle third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid size | 7 | 10 | 9 |
| Tile count | 36 | 108 | 81.750 |
| Layer depth (distinct z with tiles) | 2 | 4 | 2.375 |
| Tile type count | 7 | 12 | 11.125 |
| Difficulty score | 0.498 | 0.530 | 0.514 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio | 0.250 | 0.333 | 0.289 |
| Forced-move ratio (depth-k) | 0.028 | 0.250 | 0.151 |
| Dead-end (rollout) failure rate | 0.467 | 0.933 | 0.804 |
| Avg tappable tiles per step | 7.167 | 23.648 | 16.266 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 36 | 108 | 81.750 |
| Solver nodes expanded | 37 | 13432 | 2141.875 |
| Difficulty range (in-level uniformity) | 0.092 | 0.317 | 0.160 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.019 | 0.006 |

**Level count:** 8

### Hard (top third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid size | 9 | 10 | 9.667 |
| Tile count | 84 | 120 | 104 |
| Layer depth (distinct z with tiles) | 2 | 9 | 4.222 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.532 | 0.585 | 0.555 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio | 0.237 | 0.367 | 0.315 |
| Forced-move ratio (depth-k) | 0.096 | 0.256 | 0.198 |
| Dead-end (rollout) failure rate | 0.867 | 1 | 0.974 |
| Avg tappable tiles per step | 12.308 | 17.317 | 14.351 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 84 | 120 | 104 |
| Solver nodes expanded | 983 | 96171 | 14563.667 |
| Difficulty range (in-level uniformity) | 0.118 | 0.321 | 0.173 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.017 | 0.006 |

**Level count:** 9

