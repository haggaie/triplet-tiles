/**
 * Node native solver (exact / heuristic / forced-K). Run: node --test tests/solver-native.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { solveLevel, computeForcedRatioK } = require('../tools/levelgen/solver');

const flatTriple = {
  id: 1,
  gridSize: 3,
  layout: [
    { type: 'a', x: 0, y: 0, z: 0 },
    { type: 'a', x: 1, y: 0, z: 0 },
    { type: 'a', x: 2, y: 0, z: 0 }
  ]
};

test('exact solve flat triple', () => {
  const r = solveLevel(flatTriple, { mode: 'exact', maxNodes: 50000 });
  assert.equal(r.solvable, true);
  assert.equal(r.solution.length, 3);
});

test('heuristic solve flat triple', () => {
  const r = solveLevel(flatTriple, {
    mode: 'heuristic',
    searchDepth: 2,
    maxMovesPerNode: 8,
    maxSteps: 10
  });
  assert.equal(r.solvable, true);
  assert.equal(r.solution.length, 3);
});

test('computeForcedRatioK bounded', () => {
  const ex = solveLevel(flatTriple, { mode: 'exact', maxNodes: 50000 });
  const k = computeForcedRatioK(flatTriple, ex.solution, {
    lookaheadDepth: 2,
    maxMovesPerNode: 8,
    marginDelta: 100
  });
  assert.equal(k.ok, true);
  assert.ok(k.forcedRatioK >= 0 && k.forcedRatioK <= 1);
});
