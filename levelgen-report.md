# Level difficulty report

Generated: 2026-03-21T10:41:58.472Z  
Seed: 1337  
Levels: 23 (rejected: 1)

## Overall

Targets from `LEVELGEN.md` (Level configuration); metrics without entries leave target columns empty.

| Metric | Target range | Current generation target | Actual (this run) |
| --- | --- | --- | --- |
| Grid width | 7-8 | max 8 (batches + random pool) | 7 – 8 (mean 7.870) |
| Grid height | 7-13 | often ≥ width (portrait batches) | 10 – 14 (mean 12.130) |
| Tile count | 61-120 (most levels) | ~48-120 with emphasis on 60+ | 36 – 171 (mean 68.739) |
| Layers/depth | 4-10 (most levels) | 4-10 | 2 – 5 (mean 2.783) · distinct z with ≥1 tile |
| Tile type count | mostly 12 | 7-12 with medium/hard at 12 | 7 – 12 (mean 10.739) |
| Difficulty score | ~0.34-0.76 | intentionally pushed upward via deeper stacks and tighter slack constraints | 0.565 – 0.743 (mean 0.667) |
| Min tray slack | mostly 1 | medium/hard batches require solver minSlack <= 1 | 1 – 1 (mean 1) |
| Mean visibility hardness |  |  | 0.699 |
| Mean strategic pressure (slack + rollout) |  |  | 0.759 |
| Mean dig hardness |  |  | 0.560 |
| Mean skill reveal share |  |  | 0.299 |
| Mean chance reveal share |  |  | 0.701 |
| Mean forced-move ratio (report-only) |  |  | 0.342 |
| Mean forced-move ratio (depth-k lookahead, report-only) |  |  | 0.170 |
| Mean rollout failure rate |  |  | 0.852 |
| Mean solution steps |  |  | 68.739 |
| Mean difficulty range (in-level uniformity) |  |  | 0.183 |
| Mean difficulty variance (in-level uniformity) |  |  | 0.007 |

## By difficulty band

Bands are **tertiles** (bottom/middle/top third by difficulty score).

### Easy (bottom third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 8 | 7.571 |
| Grid height | 10 | 12 | 10.857 |
| Tile count | 36 | 60 | 47.143 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 7 | 12 | 8.429 |
| Difficulty score | 0.565 | 0.643 | 0.594 |
| Visibility hardness (start) | 0.557 | 0.744 | 0.664 |
| Strategic pressure (slack + rollout) | 0.483 | 0.817 | 0.612 |
| Dig hardness (skill + chance reveals) | 0.528 | 0.582 | 0.556 |
| Skill reveal share (same-column digs) | 0.227 | 0.407 | 0.314 |
| Chance reveal share (cross-cell digs) | 0.593 | 0.773 | 0.686 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.278 | 0.389 | 0.341 |
| Forced-move ratio (depth-k, report-only) | 0.028 | 0.233 | 0.134 |
| Dead-end (rollout) failure rate | 0.300 | 0.967 | 0.557 |
| Avg tappable tiles per step | 6.444 | 16.167 | 10.620 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 36 | 60 | 47.143 |
| Solver nodes expanded | 37 | 721 | 263.429 |
| Difficulty range (in-level uniformity) | 0.110 | 0.337 | 0.223 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.019 | 0.010 |

**Level count:** 7

### Medium (middle third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 12 | 14 | 12.857 |
| Tile count | 54 | 72 | 60.857 |
| Layer depth (distinct z with tiles) | 2 | 4 | 2.571 |
| Tile type count | 10 | 12 | 11.429 |
| Difficulty score | 0.645 | 0.690 | 0.672 |
| Visibility hardness (start) | 0.584 | 0.714 | 0.654 |
| Strategic pressure (slack + rollout) | 0.750 | 0.833 | 0.812 |
| Dig hardness (skill + chance reveals) | 0.516 | 0.622 | 0.553 |
| Skill reveal share (same-column digs) | 0.094 | 0.448 | 0.324 |
| Chance reveal share (cross-cell digs) | 0.552 | 0.906 | 0.676 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.296 | 0.367 | 0.343 |
| Forced-move ratio (depth-k, report-only) | 0.093 | 0.208 | 0.163 |
| Dead-end (rollout) failure rate | 0.833 | 1 | 0.957 |
| Avg tappable tiles per step | 11.528 | 14.063 | 12.771 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 54 | 72 | 60.857 |
| Solver nodes expanded | 116 | 6082 | 1290.857 |
| Difficulty range (in-level uniformity) | 0.118 | 0.329 | 0.205 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.019 | 0.008 |

**Level count:** 7

### Hard (top third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 10 | 14 | 12.556 |
| Tile count | 63 | 171 | 91.667 |
| Layer depth (distinct z with tiles) | 3 | 5 | 3.556 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.706 | 0.743 | 0.721 |
| Visibility hardness (start) | 0.671 | 0.886 | 0.762 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.540 | 0.604 | 0.569 |
| Skill reveal share (same-column digs) | 0.154 | 0.365 | 0.268 |
| Chance reveal share (cross-cell digs) | 0.635 | 0.846 | 0.732 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.240 | 0.429 | 0.342 |
| Forced-move ratio (depth-k, report-only) | 0.083 | 0.286 | 0.203 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 8.444 | 17.620 | 11.615 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 63 | 171 | 91.667 |
| Solver nodes expanded | 298 | 5504 | 2034 |
| Difficulty range (in-level uniformity) | 0.109 | 0.186 | 0.135 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.006 | 0.003 |

**Level count:** 9

