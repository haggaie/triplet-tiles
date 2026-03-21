# Level difficulty report

Generated: 2026-03-21T07:15:30.720Z  
Seed: 1337  
Levels: 25 (rejected: 1)

## Overall

Targets from `LEVELGEN.md` (Level configuration); metrics without entries leave target columns empty.

| Metric | Target range | Current generation target | Actual (this run) |
| --- | --- | --- | --- |
| Grid size | 7-10 | 7-10 | 10 – 13 (mean 12.040) |
| Tile count | 61-120 (most levels) | ~48-120 with emphasis on 60+ | 36 – 120 (mean 84.120) |
| Layers/depth | 4-10 (most levels) | 4-10 | 2 – 5 (mean 2.720) · distinct z with ≥1 tile |
| Tile type count | mostly 12 | 7-12 with medium/hard at 12 | 7 – 12 (mean 10.840) |
| Difficulty score | ~0.34-0.76 | intentionally pushed upward via deeper stacks and tighter slack constraints | 0.390 – 0.585 (mean 0.512) |
| Min tray slack | mostly 1 | medium/hard batches require solver minSlack <= 1 | 1 – 1 (mean 1) |
| Mean forced-move ratio |  |  | 0.287 |
| Mean forced-move ratio (depth-k lookahead) |  |  | 0.158 |
| Mean rollout failure rate |  |  | 0.783 |
| Mean solution steps |  |  | 84.120 |
| Mean difficulty range (in-level uniformity) |  |  | 0.201 |
| Mean difficulty variance (in-level uniformity) |  |  | 0.009 |

## By difficulty band

Bands are **tertiles** (bottom/middle/top third by difficulty score).

### Easy (bottom third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid size | 10 | 13 | 11.500 |
| Tile count | 36 | 108 | 67.500 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 7 | 12 | 9.250 |
| Difficulty score | 0.390 | 0.490 | 0.449 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio | 0.148 | 0.333 | 0.264 |
| Forced-move ratio (depth-k) | 0.056 | 0.324 | 0.123 |
| Dead-end (rollout) failure rate | 0.133 | 0.767 | 0.475 |
| Avg tappable tiles per step | 7.056 | 36.148 | 17.709 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 36 | 108 | 67.500 |
| Solver nodes expanded | 46 | 564 | 244 |
| Difficulty range (in-level uniformity) | 0.070 | 0.377 | 0.249 |
| Difficulty variance (in-level uniformity) | 0.001 | 0.025 | 0.013 |

**Level count:** 8

### Medium (middle third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid size | 10 | 13 | 12 |
| Tile count | 36 | 114 | 81.375 |
| Layer depth (distinct z with tiles) | 2 | 4 | 2.500 |
| Tile type count | 7 | 12 | 11.125 |
| Difficulty score | 0.498 | 0.535 | 0.522 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio | 0.247 | 0.333 | 0.288 |
| Forced-move ratio (depth-k) | 0.028 | 0.210 | 0.144 |
| Dead-end (rollout) failure rate | 0.467 | 1 | 0.854 |
| Avg tappable tiles per step | 7.167 | 17.774 | 15.042 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 36 | 114 | 81.375 |
| Solver nodes expanded | 37 | 1812 | 682.625 |
| Difficulty range (in-level uniformity) | 0.109 | 0.337 | 0.212 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.019 | 0.009 |

**Level count:** 8

### Hard (top third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid size | 12 | 13 | 12.556 |
| Tile count | 84 | 120 | 101.333 |
| Layer depth (distinct z with tiles) | 3 | 5 | 3.556 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.545 | 0.585 | 0.558 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio | 0.238 | 0.378 | 0.307 |
| Forced-move ratio (depth-k) | 0.167 | 0.256 | 0.202 |
| Dead-end (rollout) failure rate | 0.967 | 1 | 0.993 |
| Avg tappable tiles per step | 12.611 | 19.952 | 15.835 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 84 | 120 | 101.333 |
| Solver nodes expanded | 795 | 96171 | 14824.556 |
| Difficulty range (in-level uniformity) | 0.102 | 0.258 | 0.149 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.013 | 0.005 |

**Level count:** 9

