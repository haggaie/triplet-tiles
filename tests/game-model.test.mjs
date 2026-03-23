import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAY_MAX_TILES,
  getTrayInsertIndexForType,
  insertTrayTileByShape,
  removeMatchingTriplesOneRound,
  removeTriplesForTypesSequential,
  getProjectedTray,
  shouldQueueWaitForRoom,
  shouldTriggerTrayOverflowLoss,
  applyCommittedPick
} from '../lib/game-model.js';

test('getTrayInsertIndexForType: new type goes to end', () => {
  const tray = [{ id: 'a', type: 'leaf' }, { id: 'b', type: 'flower' }];
  assert.equal(getTrayInsertIndexForType(tray, 'grapes'), 2);
});

test('getTrayInsertIndexForType: groups after last same type', () => {
  const tray = [
    { id: '1', type: 'leaf' },
    { id: '2', type: 'flower' },
    { id: '3', type: 'leaf' }
  ];
  assert.equal(getTrayInsertIndexForType(tray, 'leaf'), 3);
});

test('insertTrayTileByShape: ordering and immutability', () => {
  const tray = [{ id: '1', type: 'a' }, { id: '2', type: 'b' }, { id: '3', type: 'a' }];
  const next = insertTrayTileByShape(tray, { id: 'n', type: 'a' });
  assert.deepEqual(
    next.map(t => t.id),
    ['1', '2', '3', 'n']
  );
  assert.equal(tray.length, 3);
});

test('removeMatchingTriplesOneRound: multiple types in one round', () => {
  const tray = [
    { id: '1', type: 'x' },
    { id: '2', type: 'x' },
    { id: '3', type: 'x' },
    { id: '4', type: 'y' },
    { id: '5', type: 'y' },
    { id: '6', type: 'y' }
  ];
  const { trayTiles, scoreDelta, removedTypes } = removeMatchingTriplesOneRound(tray);
  assert.equal(trayTiles.length, 0);
  assert.equal(scoreDelta, 60);
  assert.deepEqual(removedTypes, ['x', 'y']);
});

test('removeMatchingTriplesOneRound: first-appearance order when types differ left-to-right', () => {
  const tray = [
    { id: '1', type: 'y' },
    { id: '2', type: 'y' },
    { id: '3', type: 'y' },
    { id: '4', type: 'x' },
    { id: '5', type: 'x' },
    { id: '6', type: 'x' }
  ];
  const { trayTiles, scoreDelta, removedTypes } = removeMatchingTriplesOneRound(tray);
  assert.equal(trayTiles.length, 0);
  assert.equal(scoreDelta, 60);
  assert.deepEqual(removedTypes, ['y', 'x']);
});

test('removeMatchingTriplesOneRound: only types with initial count ≥ 3', () => {
  const tray = [
    { id: '1', type: 'x' },
    { id: '2', type: 'x' },
    { id: '3', type: 'x' },
    { id: '4', type: 'y' },
    { id: '5', type: 'y' }
  ];
  const { trayTiles, scoreDelta, removedTypes } = removeMatchingTriplesOneRound(tray);
  assert.equal(trayTiles.length, 2);
  assert.ok(trayTiles.every(t => t.type === 'y'));
  assert.equal(scoreDelta, 30);
  assert.deepEqual(removedTypes, ['x']);
});

test('getProjectedTray: adds flying tile and does not mutate input', () => {
  const committed = [{ id: '1', type: 'leaf' }];
  const fly = { id: 'f', type: 'flower' };
  const projected = getProjectedTray(committed, fly);
  assert.equal(projected.length, 2);
  assert.deepEqual(projected.trayTiles[1], fly);
  assert.equal(committed.length, 1);
});

test('getProjectedTray: null flying leaves copy of committed', () => {
  const committed = [{ id: '1', type: 'leaf' }];
  const projected = getProjectedTray(committed, null);
  assert.equal(projected.length, 1);
  assert.notStrictEqual(projected.trayTiles, committed);
});

test('overflow / wait policy matches engine', () => {
  assert.equal(shouldTriggerTrayOverflowLoss(TRAY_MAX_TILES, 0), true);
  assert.equal(shouldTriggerTrayOverflowLoss(TRAY_MAX_TILES - 1, 0), false);
  assert.equal(shouldQueueWaitForRoom(TRAY_MAX_TILES, 1), true);
  assert.equal(shouldQueueWaitForRoom(TRAY_MAX_TILES, 0), false);
});

test('applyCommittedPick: full pick and triple clear', () => {
  let boardTiles = [
    { id: 't0', type: 'leaf', removed: false },
    { id: 't1', type: 'leaf', removed: false },
    { id: 't2', type: 'leaf', removed: false }
  ];
  let trayTiles = [];
  let score = 0;
  for (const id of ['t0', 't1', 't2']) {
    const r = applyCommittedPick({ boardTiles, trayTiles, score }, id);
    assert.equal(r.ok, true);
    boardTiles = r.boardTiles;
    trayTiles = r.trayTiles;
    score = r.score;
  }
  const last = applyCommittedPick({ boardTiles, trayTiles, score }, 't0');
  assert.equal(last.ok, false);
  assert.equal(last.error, 'invalid_tile');
  assert.equal(trayTiles.length, 0);
  assert.equal(score, 30);
});

test('applyCommittedPick: tray_full', () => {
  const trayTiles = Array.from({ length: TRAY_MAX_TILES }, (_, i) => ({ id: `x${i}`, type: 'z' }));
  const boardTiles = [{ id: 'b', type: 'z', removed: false }];
  const r = applyCommittedPick({ boardTiles, trayTiles, score: 0 }, 'b');
  assert.equal(r.ok, false);
  assert.equal(r.error, 'tray_full');
});

test('removeTriplesForTypesSequential: only listed types', () => {
  const tray = [
    { id: '1', type: 'a' },
    { id: '2', type: 'a' },
    { id: '3', type: 'a' },
    { id: '4', type: 'b' },
    { id: '5', type: 'b' },
    { id: '6', type: 'b' }
  ];
  const { trayTiles, scoreDelta } = removeTriplesForTypesSequential(tray, ['b']);
  assert.equal(trayTiles.length, 3);
  assert.ok(trayTiles.every(t => t.type === 'a'));
  assert.equal(scoreDelta, 30);
});
