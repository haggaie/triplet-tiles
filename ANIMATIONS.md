# Tile animations design

This document describes how tile fly-to-tray and trio-combine animations work, including overlapping behavior, snap-to-end, and blocking when the tray is full.

## Overview

- **Fly to tray**: A clicked tile animates from the board to a tray slot (by shape grouping). At most one fly is in progress at a time; starting a new one snaps the current fly to its target first.
- **Combine**: When three identical tiles sit in the tray, they animate together into the center and disappear. Multiple types can combine in parallel.
- **Block when full**: If the tray has 7 tiles and the only way to free a slot is an in-flight combine, the next click is queued until that combine (and compact) finishes, then the new tile flies.

## Snap-to-end

When the user clicks a tile while another is already flying to the tray:

1. The current fly is **snapped** to its target: the animation is cancelled, the flying element is removed, and that tile’s move is applied immediately (tray state and DOM updated).
2. The new tile’s fly then starts from the board to the correct slot (computed from the updated tray).

So the next animation always has a well-defined target and correct slot index, without waiting for the previous fly to finish naturally.

## Projected tray

**Projected tray** is the logical tray we use for “is there room?” and “where does the next tile go?”:

- Current `state.trayTiles`
- Plus the current flying tile (if any), as if it had already landed
- Minus tiles that are being removed by in-flight combine animations

When the tray is full (7 tiles) but a combine is in progress, projected length drops below 7 after the combine, so we know room will appear and we can wait instead of losing.

## Blocking when tray is full

If projected tray length is 7 and there is **no** in-flight combine, we trigger loss (tray overflow).

If projected length is 7 and there **is** an in-flight combine (so a slot will free up when it finishes), we do **not** start a new fly. We push the clicked tile’s id onto `_waitingForRoom`. When the current combine (and compact) finishes, we call `checkAllIdle()`, which then starts the next waiting move so that tile flies to the newly freed slot.

## Parallel combines

When the tray has three or more of several types (e.g. three flowers and three leaves), we start **all** matching combine animations at once. When every one has finished, we:

- Remove all those types from `state.trayTiles` (one pass)
- Update score and stats
- Run a single compact animation for the union of removed slot indices
- Clear `_combiningTypes` and run the completion callback

So multiple trios can overlap on screen; state and compact run once after all of them complete.

## Apply queue

When a fly completes (without being snapped), we don’t apply the move immediately. We **enqueue** an apply thunk. A single worker runs one thunk at a time. Each thunk:

- Marks the tile removed, inserts it into the tray by shape, re-renders board and tray
- Calls `handleMatchingInTrayAnimated`, which may start combine(s)

This keeps state updates ordered and avoids races when multiple flies could complete close together. When we **snap** a fly, we run that move’s apply **synchronously** (no enqueue) so the next fly sees the updated tray immediately.

## Idle and tests

We consider the game **idle** when:

- No fly is in progress (`_currentFly` is null)
- No combine is in progress (`_combiningTypes` is empty)
- The apply queue is empty

When we become idle we set `_isMoveAnimating = false`, resolve the E2E hook’s `waitForActionComplete()` promise if it exists, and process the next entry in `_waitingForRoom` (start that tile’s fly). So tests can await “all animations for this move are done” and the wait-for-room queue is drained when combines free space.
