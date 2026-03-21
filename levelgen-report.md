# Level difficulty report

Generated: 2026-03-21T10:46:22.444Z  
Seed: 1337  
Levels: 26 (rejected: 0)

## Overall

Targets from `LEVELGEN.md` (Level configuration); metrics without entries leave target columns empty.

| Metric | Target range | Current generation target | Actual (this run) |
| --- | --- | --- | --- |
| Grid width | 7-8 | max 8 (batches + random pool) | 7 – 8 (mean 7.885) |
| Grid height | 7-13 | often ≥ width (portrait batches) | 7 – 14 (mean 11.577) |
| Tile count | 61-120 (most levels) | ~48-120 with emphasis on 60+ | 36 – 93 (mean 62.769) |
| Layers/depth | 4-10 (most levels) | 4-10 | 2 – 4 (mean 2.615) · distinct z with ≥1 tile |
| Tile type count | mostly 12 | 7-12 with medium/hard at 12 | 7 – 12 (mean 10.885) |
| Difficulty score | ~0.34-0.76 | intentionally pushed upward via deeper stacks and tighter slack constraints | 0.565 – 0.763 (mean 0.681) |
| Min tray slack | mostly 1 | medium/hard batches require solver minSlack <= 1 | 1 – 1 (mean 1) |
| Mean visibility hardness |  |  | 0.732 |
| Mean strategic pressure (slack + rollout) |  |  | 0.766 |
| Mean dig hardness |  |  | 0.566 |
| Mean skill reveal share |  |  | 0.279 |
| Mean chance reveal share |  |  | 0.721 |
| Mean forced-move ratio (report-only) |  |  | 0.360 |
| Mean forced-move ratio (depth-k lookahead, report-only) |  |  | 0.190 |
| Mean rollout failure rate |  |  | 0.865 |
| Mean solution steps |  |  | 62.769 |
| Mean difficulty range (in-level uniformity) |  |  | 0.179 |
| Mean difficulty variance (in-level uniformity) |  |  | 0.007 |

## By difficulty band

Bands are **tertiles** (bottom/middle/top third by difficulty score).

### Easy (bottom third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 7 | 8 | 7.625 |
| Grid height | 10 | 12 | 11 |
| Tile count | 36 | 60 | 48 |
| Layer depth (distinct z with tiles) | 2 | 2 | 2 |
| Tile type count | 7 | 12 | 8.625 |
| Difficulty score | 0.565 | 0.645 | 0.600 |
| Visibility hardness (start) | 0.557 | 0.744 | 0.661 |
| Strategic pressure (slack + rollout) | 0.483 | 0.817 | 0.631 |
| Dig hardness (skill + chance reveals) | 0.528 | 0.582 | 0.553 |
| Skill reveal share (same-column digs) | 0.227 | 0.407 | 0.324 |
| Chance reveal share (cross-cell digs) | 0.593 | 0.773 | 0.676 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.278 | 0.389 | 0.340 |
| Forced-move ratio (depth-k, report-only) | 0.028 | 0.233 | 0.129 |
| Dead-end (rollout) failure rate | 0.300 | 0.967 | 0.596 |
| Avg tappable tiles per step | 6.444 | 16.167 | 10.758 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 36 | 60 | 48 |
| Solver nodes expanded | 37 | 721 | 280.750 |
| Difficulty range (in-level uniformity) | 0.110 | 0.337 | 0.226 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.019 | 0.010 |

**Level count:** 8

### Medium (middle third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 7 | 14 | 11.875 |
| Tile count | 54 | 72 | 63.375 |
| Layer depth (distinct z with tiles) | 2 | 4 | 2.625 |
| Tile type count | 10 | 12 | 11.750 |
| Difficulty score | 0.656 | 0.714 | 0.690 |
| Visibility hardness (start) | 0.603 | 0.789 | 0.690 |
| Strategic pressure (slack + rollout) | 0.750 | 0.833 | 0.817 |
| Dig hardness (skill + chance reveals) | 0.521 | 0.622 | 0.567 |
| Skill reveal share (same-column digs) | 0.094 | 0.429 | 0.277 |
| Chance reveal share (cross-cell digs) | 0.571 | 0.906 | 0.723 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.296 | 0.421 | 0.352 |
| Forced-move ratio (depth-k, report-only) | 0.093 | 0.264 | 0.193 |
| Dead-end (rollout) failure rate | 0.833 | 1 | 0.967 |
| Avg tappable tiles per step | 8.444 | 15.536 | 12.734 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 54 | 72 | 63.375 |
| Solver nodes expanded | 116 | 25870 | 3819.500 |
| Difficulty range (in-level uniformity) | 0.096 | 0.329 | 0.176 |
| Difficulty variance (in-level uniformity) | 0.002 | 0.019 | 0.006 |

**Level count:** 8

### Hard (top third)

| Metric | Min | Max | Mean |
|--------|-----|-----|------|
| Grid width | 8 | 8 | 8 |
| Grid height | 8 | 14 | 11.800 |
| Tile count | 63 | 93 | 74.100 |
| Layer depth (distinct z with tiles) | 3 | 4 | 3.100 |
| Tile type count | 12 | 12 | 12 |
| Difficulty score | 0.716 | 0.763 | 0.739 |
| Visibility hardness (start) | 0.733 | 0.928 | 0.824 |
| Strategic pressure (slack + rollout) | 0.833 | 0.833 | 0.833 |
| Dig hardness (skill + chance reveals) | 0.542 | 0.604 | 0.577 |
| Skill reveal share (same-column digs) | 0.154 | 0.360 | 0.245 |
| Chance reveal share (cross-cell digs) | 0.640 | 0.846 | 0.755 |
| Min tray slack (7 - tray size) | 1 | 1 | 1 |
| Forced-move ratio (heuristic, report-only) | 0.320 | 0.432 | 0.383 |
| Forced-move ratio (depth-k, report-only) | 0.167 | 0.321 | 0.236 |
| Dead-end (rollout) failure rate | 1 | 1 | 1 |
| Avg tappable tiles per step | 8.208 | 12.440 | 10.517 |
| Min tappable tiles (bottleneck) | 1 | 1 | 1 |
| Solution steps | 63 | 93 | 74.100 |
| Solver nodes expanded | 299 | 10542 | 2093.700 |
| Difficulty range (in-level uniformity) | 0.092 | 0.325 | 0.143 |
| Difficulty variance (in-level uniformity) | 0.001 | 0.018 | 0.004 |

**Level count:** 10

