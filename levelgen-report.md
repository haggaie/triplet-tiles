# Level difficulty report

Generated: 2026-03-21T08:00:08.662Z  
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
| Difficulty score | ~0.34-0.76 | intentionally pushed upward via deeper stacks and tighter slack constraints | 0.481 – 0.741 (mean 0.622) |
| Min tray slack | mostly 1 | medium/hard batches require solver minSlack <= 1 | 1 – 1 (mean 1) |
| Mean visibility hardness |  |  | 0.607 |
| Mean strategic pressure (slack + rollout) |  |  | 0.705 |
| Mean dig hardness |  |  | 0.565 |
| Mean skill reveal share |  |  | 0.284 |
| Mean chance reveal share |  |  | 0.716 |
| Mean forced-move ratio (report-only) |  |  | 0.317 |
| Mean forced-move ratio (depth-k lookahead, report-only) |  |  | 0.166 |
| Mean rollout failure rate |  |  | 0.743 |
| Mean solution steps |  |  | 59.739 |
| Mean difficulty range (in-level uniformity) |  |  | 0.189 |
| Mean difficulty variance (in-level uniformity) |  |  | 0.008 |

## By difficulty band

Bands are **tertiles** (bottom/middle/top third by difficulty score).

### Easy (bottom third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 8 | 7.714 |
| Grid height | 10 | 12 | 11.143 |
| Tile count | 36 | 60 | 51.429 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 7 | 12 | 9.429 |
| Difficulty score | 0.481 | 0.574 | 0.531 |
| Visibility hardness (start) | 0.333 | 0.672 | 0.515 |
| Strategic pressure (slack + rollout) | 0.400 | 0.617 | 0.552 |
| Dig hardness (skill + chance reveals) | 0.511 | 0.590 | 0.559 |
| Skill reveal share (same-column digs) | 0.200 | 0.464 | 0.304 |
| Chance reveal share (cross-cell digs) | 0.536 | 0.800 | 0.696 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.250 | 0.333 | 0.288 |
| Forced-move ratio (depth-k, report-only) | 0.056 | 0.233 | 0.124 |
| Dead-end (rollout) failure rate | 0.133 | 0.567 | 0.438 |
| Avg tappable tiles per step | 7.056 | 21.067 | 14.057 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 36 | 60 | 51.429 |
| Solver nodes expanded | 46 | 691 | 280.714 |
| Difficulty range (in-level uniformity) | 0.070 | 0.377 | 0.254 |
| Difficulty variance (in-level uniformity) | 0.001 | 0.025 | 0.013 |

**Level count:** 7

### Medium (middle third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 8 | 7.857 |
| Grid height | 10 | 14 | 12.286 |
| Tile count | 36 | 75 | 59.143 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 7 | 12 | 10.429 |
| Difficulty score | 0.590 | 0.662 | 0.629 |
| Visibility hardness (start) | 0.570 | 0.722 | 0.632 |
| Strategic pressure (slack + rollout) | 0.567 | 0.817 | 0.705 |
| Dig hardness (skill + chance reveals) | 0.535 | 0.590 | 0.564 |
| Skill reveal share (same-column digs) | 0.200 | 0.385 | 0.288 |
| Chance reveal share (cross-cell digs) | 0.615 | 0.800 | 0.712 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.227 | 0.370 | 0.294 |
| Forced-move ratio (depth-k, report-only) | 0.028 | 0.241 | 0.148 |
| Dead-end (rollout) failure rate | 0.467 | 0.967 | 0.743 |
| Avg tappable tiles per step | 7.167 | 18.120 | 13.817 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 36 | 75 | 59.143 |
| Solver nodes expanded | 37 | 2371 | 1153.429 |
| Difficulty range (in-level uniformity) | 0.029 | 0.317 | 0.166 |
| Difficulty variance (in-level uniformity) | 0.000 | 0.019 | 0.006 |

**Level count:** 7

### Hard (top third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 12 | 14 | 13.111 |
| Tile count | 63 | 72 | 66.667 |
| Layer depth (distinct z with tiles) | 2 | 6 | 3.222 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.665 | 0.741 | 0.688 |
| Visibility hardness (start) | 0.583 | 0.803 | 0.660 |
| Strategic pressure (slack + rollout) | 0.783 | 0.833 | 0.824 |
| Dig hardness (skill + chance reveals) | 0.526 | 0.600 | 0.570 |
| Skill reveal share (same-column digs) | 0.167 | 0.415 | 0.267 |
| Chance reveal share (cross-cell digs) | 0.585 | 0.833 | 0.733 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.292 | 0.476 | 0.359 |
| Forced-move ratio (depth-k, report-only) | 0.111 | 0.333 | 0.213 |
| Dead-end (rollout) failure rate | 0.900 | 1 | 0.981 |
| Avg tappable tiles per step | 8.746 | 15.848 | 14.014 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 63 | 72 | 66.667 |
| Solver nodes expanded | 470 | 44095 | 5734.222 |
| Difficulty range (in-level uniformity) | 0.020 | 0.337 | 0.156 |
| Difficulty variance (in-level uniformity) | 0.000 | 0.021 | 0.006 |

**Level count:** 9

