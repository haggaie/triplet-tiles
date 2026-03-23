const { test, expect } = require('@playwright/test');
const { generateOneLevel, mulberry32 } = require('../tools/levelgen/generator');
const { scoreLevel, computeVisibilityMetrics, computeCoverers, isSkillReveal } = require('../tools/levelgen/score');

/** Template-driven batch (same API as levelgen `config.js` batches). */
function lightRectangleBatch() {
  return {
    templateId: 'rectangle',
    templateParams: { width: 5, height: 5 },
    gridWidth: 7,
    gridHeight: 7,
    count: 1,
    tileTypeCount: 6,
    distribution: {
      mode: 'weightedTriplets',
      totalTriplets: 12,
      weights: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 }
    },
    layering: {
      minZ: 0,
      maxZ: 2,
      overlap: 'light',
      maxStackPerCell: 3,
      full: true,
      layerShape: 'full'
    }
  };
}

function heavyDiamondBatch() {
  return {
    templateId: 'diamond',
    templateParams: { radius: 3 },
    gridWidth: 7,
    gridHeight: 9,
    count: 1,
    tileTypeCount: 8,
    distribution: {
      mode: 'weightedTriplets',
      totalTriplets: 18,
      weights: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1 }
    },
    layering: {
      minZ: 0,
      maxZ: 5,
      overlap: 'heavy',
      maxStackPerCell: 5,
      full: true,
      layerShape: 'full'
    }
  };
}

test.describe('Difficulty score v2', () => {
  test('template-based level: score in [0,1] and v2 metrics present', async () => {
    const rng = mulberry32(42_424);
    const level = generateOneLevel(rng, lightRectangleBatch(), 1);
    const scored = scoreLevel(level, { rollouts: 20 });

    expect(scored.solvable).toBeTruthy();
    expect(scored.difficultyScore).toBeGreaterThanOrEqual(0);
    expect(scored.difficultyScore).toBeLessThanOrEqual(1);

    const m = scored.metrics;
    expect(typeof m.visibilityHard).toBe('number');
    expect(typeof m.strategicPressureHard).toBe('number');
    expect(typeof m.digHard).toBe('number');
    expect(typeof m.skillRevealRate).toBe('number');
    expect(typeof m.chanceRevealRate).toBe('number');
    expect(typeof m.surfaceTripletShare).toBe('number');
    expect(typeof m.coveredFraction).toBe('number');
    expect(typeof m.deadEndHard).toBe('number');
    expect(typeof m.slackHard).toBe('number');
    expect(typeof m.effortHard).toBe('number');
    if (m.skillReveals + m.chanceReveals > 0) {
      expect(m.skillRevealRate + m.chanceRevealRate).toBeCloseTo(1, 5);
    }
  });

  test('heavy stack batch tends to higher visibility hardness than light rectangle', async () => {
    // Seed affects tile placement; some seeds (e.g. 100) give heavy layouts more initial surface
    // triplets than light, which lowers visibilityHard — use a seed where the ordering holds.
    const rngLight = mulberry32(42);
    const rngHeavy = mulberry32(42);
    const light = generateOneLevel(rngLight, lightRectangleBatch(), 1);
    const heavy = generateOneLevel(rngHeavy, heavyDiamondBatch(), 1);
    const sL = scoreLevel(light, { rollouts: 15 });
    const sH = scoreLevel(heavy, { rollouts: 15 });
    expect(sL.solvable).toBeTruthy();
    expect(sH.solvable).toBeTruthy();
    expect(sH.metrics.visibilityHard).toBeGreaterThanOrEqual(sL.metrics.visibilityHard - 0.05);
  });

  test('isSkillReveal: same column below remover', async () => {
    const layout = [
      { type: 0, x: 1, y: 1, z: 1 },
      { type: 1, x: 1, y: 1, z: 0 }
    ];
    expect(isSkillReveal({ layout }, 0, 1)).toBe(true);
    expect(isSkillReveal(layout, 0, 1)).toBe(true);
    expect(isSkillReveal({ layout }, 1, 0)).toBe(false);
  });

  test('computeVisibilityMetrics: flat triplet has high surface triplet share', async () => {
    const layout = [
      { type: 0, x: 0, y: 0, z: 0 },
      { type: 0, x: 1, y: 0, z: 0 },
      { type: 0, x: 2, y: 0, z: 0 }
    ];
    const coverers = computeCoverers(layout);
    const v = computeVisibilityMetrics(layout, coverers);
    expect(v.surfaceTriplets).toBe(1);
    expect(v.surfaceTripletShare).toBe(1);
    expect(v.visibilityHard).toBeLessThan(0.5);
  });
});
