const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const { solveLevel, computeForcedRatioK } = require('../tools/levelgen/solver');

function loadGeneratedLevels() {
  const projectRoot = path.resolve(__dirname, '..');
  const filePath = path.resolve(projectRoot, 'levels.generated.js');
  const src = fs.readFileSync(filePath, 'utf8');
  const marker = 'window.__TRIPLET_GENERATED_LEVELS__ = ';
  const start = src.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const jsonStart = start + marker.length;
  const jsonEnd = src.lastIndexOf(';\n');
  expect(jsonEnd).toBeGreaterThan(jsonStart);
  const jsonText = src.slice(jsonStart, jsonEnd).trim();
  return JSON.parse(jsonText);
}

test.describe('Generated levels', () => {
  test('levels.generated.js exists and is sorted by difficulty', async () => {
    const levels = loadGeneratedLevels();
    expect(Array.isArray(levels)).toBeTruthy();
    expect(levels.length).toBeGreaterThanOrEqual(1);

    // Basic schema checks.
    for (const lvl of levels.slice(0, 10)) {
      expect(typeof lvl.id).toBe('number');
      expect(typeof lvl.name).toBe('string');
      expect(typeof lvl.gridWidth).toBe('number');
      expect(typeof lvl.gridHeight).toBe('number');
      expect(Array.isArray(lvl.layout)).toBeTruthy();
      expect(typeof lvl.difficultyScore).toBe('number');
    }

    // Sorted ascending by difficultyScore.
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i].difficultyScore).toBeGreaterThanOrEqual(levels[i - 1].difficultyScore);
    }

    // Multi-layer from the start.
    const zSet = new Set(levels[0].layout.map(t => t.z));
    expect(zSet.size).toBeGreaterThanOrEqual(2);
  });

  test('every level has at most one tile per (x,y,z) position', async () => {
    const levels = loadGeneratedLevels();
    for (const lvl of levels) {
      const positions = new Set();
      for (const t of lvl.layout) {
        const key = `${t.x},${t.y},${t.z}`;
        expect(positions.has(key)).toBeFalsy();
        positions.add(key);
      }
    }
  });

  test('a sample of generated levels are solver-solvable', async () => {
    const levels = loadGeneratedLevels();
    const sample = [0, 1, 2, 10, 25, 50, levels.length - 1].filter(i => i >= 0 && i < levels.length);
    for (const idx of sample) {
      const lvl = levels[idx];
      const res = solveLevel(lvl, { mode: 'exact', maxNodes: 250000 });
      expect(res.solvable).toBeTruthy();
    }
  });

  test('heuristic solver wins on a flat triple', async () => {
    const lvl = {
      id: 999,
      gridWidth: 3,
      gridHeight: 3,
      layout: [
        { type: 't0', x: 0, y: 0, z: 0 },
        { type: 't0', x: 1, y: 0, z: 0 },
        { type: 't0', x: 2, y: 0, z: 0 }
      ]
    };
    const res = solveLevel(lvl, {
      mode: 'heuristic',
      searchDepth: 2,
      maxMovesPerNode: 8,
      maxSteps: 10
    });
    expect(res.solvable).toBeTruthy();
    expect(res.solution).toHaveLength(3);
  });

  test('computeForcedRatioK returns bounded ratio for exact path', async () => {
    const lvl = {
      id: 998,
      gridWidth: 3,
      gridHeight: 3,
      layout: [
        { type: 't0', x: 0, y: 0, z: 0 },
        { type: 't0', x: 1, y: 0, z: 0 },
        { type: 't0', x: 2, y: 0, z: 0 }
      ]
    };
    const ex = solveLevel(lvl, { mode: 'exact', maxNodes: 50000 });
    expect(ex.solvable).toBeTruthy();
    const scan = computeForcedRatioK(lvl, ex.solution, {
      lookaheadDepth: 2,
      maxMovesPerNode: 8,
      marginDelta: 100
    });
    expect(scan.ok).toBeTruthy();
    expect(scan.forcedRatioK).toBeGreaterThanOrEqual(0);
    expect(scan.forcedRatioK).toBeLessThanOrEqual(1);
    expect(scan.stepForcedK).toHaveLength(ex.solution.length);
  });
});

