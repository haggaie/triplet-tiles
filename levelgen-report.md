# Level difficulty report

Generated: 2026-03-21T07:26:58.185Z  
Seed: 1337  
Levels: 23 (rejected: 0)

## Overall

Targets from `LEVELGEN.md` (Level configuration); metrics without entries leave target columns empty.

| Metric | Target range | Current generation target | Actual (this run) |
| --- | --- | --- | --- |
| Grid width | 7-8 | max 8 (batches + random pool) | 7 – 8 (mean 7.870) |
| Grid height | 7-13 | often ≥ width (portrait batches) | 10 – 14 (mean 12.261) |
| Tile count | 61-120 (most levels) | ~48-120 with emphasis on 60+ | 36 – 75 (mean 59.739) |
| Layers/depth | 4-10 (most levels) | 4-10 | 2 – 6 (mean 2.478) · distinct z with ≥1 tile |
| Tile type count | mostly 12 | 7-12 with medium/hard at 12 | 7 – 12 (mean 10.739) |
| Difficulty score | ~0.34-0.76 | intentionally pushed upward via deeper stacks and tighter slack constraints | 0.427 – 0.627 (mean 0.513) |
| Min tray slack | mostly 1 | medium/hard batches require solver minSlack <= 1 | 1 – 1 (mean 1) |
| Mean forced-move ratio |  |  | 0.317 |
| Mean forced-move ratio (depth-k lookahead) |  |  | 0.166 |
| Mean rollout failure rate |  |  | 0.743 |
| Mean solution steps |  |  | 59.739 |
| Mean difficulty range (in-level uniformity) |  |  | 0.189 |
| Mean difficulty variance (in-level uniformity) |  |  | 0.008 |

## By difficulty band

Bands are **tertiles** (bottom/middle/top third by difficulty score).

### Easy (bottom third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 8 | 7.857 |
| Grid height | 10 | 12 | 11.429 |
| Tile count | 36 | 60 | 54 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 7 | 12 | 9.857 |
| Difficulty score | 0.427 | 0.471 | 0.450 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio | 0.250 | 0.370 | 0.293 |
| Forced-move ratio (depth-k) | 0.056 | 0.233 | 0.124 |
| Dead-end (rollout) failure rate | 0.133 | 0.567 | 0.462 |
| Avg tappable tiles per step | 7.056 | 21.067 | 14.789 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 36 | 60 | 54 |
| Solver nodes expanded | 46 | 691 | 336 |
| Difficulty range (in-level uniformity) | 0.070 | 0.323 | 0.234 |
| Difficulty variance (in-level uniformity) | 0.001 | 0.018 | 0.010 |

**Level count:** 7

### Medium (middle third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 8 | 7.714 |
| Grid height | 10 | 14 | 12 |
| Tile count | 36 | 75 | 56.571 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 7 | 12 | 10 |
| Difficulty score | 0.472 | 0.545 | 0.506 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio | 0.227 | 0.333 | 0.289 |
| Forced-move ratio (depth-k) | 0.028 | 0.241 | 0.148 |
| Dead-end (rollout) failure rate | 0.333 | 0.967 | 0.719 |
| Avg tappable tiles per step | 7.167 | 18.120 | 13.086 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 36 | 75 | 56.571 |
| Solver nodes expanded | 37 | 2371 | 1098.143 |
| Difficulty range (in-level uniformity) | 0.029 | 0.377 | 0.186 |
| Difficulty variance (in-level uniformity) | 0.000 | 0.025 | 0.008 |

**Level count:** 7

### Hard (top third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 12 | 14 | 13.111 |
| Tile count | 63 | 72 | 66.667 |
| Layer depth (distinct z with tiles) | 2 | 6 | 3.222 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.545 | 0.627 | 0.568 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio | 0.292 | 0.476 | 0.359 |
| Forced-move ratio (depth-k) | 0.111 | 0.333 | 0.213 |
| Dead-end (rollout) failure rate | 0.900 | 1 | 0.981 |
| Avg tappable tiles per step | 8.746 | 15.848 | 14.014 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 63 | 72 | 66.667 |
| Solver nodes expanded | 470 | 44095 | 5734.222 |
| Difficulty range (in-level uniformity) | 0.020 | 0.337 | 0.156 |
| Difficulty variance (in-level uniformity) | 0.000 | 0.021 | 0.006 |

**Level count:** 9

