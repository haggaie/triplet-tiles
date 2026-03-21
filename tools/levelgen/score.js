const { solveLevel, computeForcedRatioK } = require('./solver');
const forcedLookaheadDefaults = require('./forced-lookahead-defaults');
const { tileCovers } = require('../../tile-layering.js');

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/** Blend (1 - surfaceTripletShare) vs coveredFraction in visibility family [PLACEHOLDER — tune with playtests] */
const W_VISIBILITY_TRIPLET = 0.6;
/** Slack vs rollout failure in strategicPressureHard */
const W_STRATEGIC_SLACK = 0.5;
/** Chance vs skill dig contribution inside digHard */
const DIG_WEIGHT_CHANCE = 0.65;
const DIG_WEIGHT_SKILL = 0.35;
/** Final difficultyScore weights (sum = 1) [PLACEHOLDER] */
const W_SCORE_VISIBILITY = 0.28;
const W_SCORE_STRATEGIC = 0.38;
const W_SCORE_DIG = 0.27;
const W_SCORE_EFFORT = 0.07;

function computeCoverers(layout) {
  const coverers = Array.from({ length: layout.length }, () => []);
  for (let i = 0; i < layout.length; i += 1) {
    const a = layout[i];
    for (let j = 0; j < layout.length; j += 1) {
      if (i === j) continue;
      const b = layout[j];
      if (tileCovers(b, a)) {
        coverers[i].push(j);
      }
    }
  }
  return coverers;
}

function makeBitset(n) {
  return new Uint32Array(Math.ceil(n / 32));
}

function bitsetHas(bits, idx) {
  const word = idx >>> 5;
  const mask = 1 << (idx & 31);
  return (bits[word] & mask) !== 0;
}

function bitsetAdd(bits, idx) {
  const word = idx >>> 5;
  const mask = 1 << (idx & 31);
  // eslint-disable-next-line no-param-reassign
  bits[word] |= mask;
}

function bitsetAllSet(bits, n) {
  const fullWords = Math.floor(n / 32);
  for (let i = 0; i < fullWords; i += 1) {
    if (bits[i] !== 0xffffffff) return false;
  }
  const rem = n % 32;
  if (rem === 0) return true;
  const lastMask = (1 << rem) - 1;
  return (bits[fullWords] & lastMask) === lastMask;
}

function applyTrayAdd(trayCounts, traySize, type) {
  const nextCounts = { ...trayCounts };
  const prev = nextCounts[type] || 0;
  const now = prev + 1;
  nextCounts[type] = now % 3;
  let nextSize = traySize + 1;
  if (now >= 3) nextSize -= 3;
  return { trayCounts: nextCounts, traySize: nextSize };
}

function getTappable(layout, removedBits, coverers) {
  const out = [];
  for (let i = 0; i < layout.length; i += 1) {
    if (bitsetHas(removedBits, i)) continue;
    let covered = false;
    for (const j of coverers[i]) {
      if (!bitsetHas(removedBits, j)) {
        covered = true;
        break;
      }
    }
    if (!covered) out.push(i);
  }
  return out;
}

function moveOrderingScore(trayCounts, traySize, type) {
  const inTray = trayCounts[type] || 0;
  let score = 0;
  if (inTray === 2) score += 100;
  if (inTray === 1) score += 25;
  if (inTray === 0) score -= 5;
  if (traySize >= 5 && inTray === 0) score -= 20;
  if (traySize >= 6 && inTray === 0) score -= 50;
  return score;
}

/**
 * Initial-board visibility: surface triplet share + covered fraction → one scalar (anti double-count).
 */
function computeVisibilityMetrics(layout, coverers) {
  const removed = makeBitset(layout.length);
  const tap0 = getTappable(layout, removed, coverers);
  const N = layout.length;
  if (N === 0) {
    return {
      surfaceTripletShare: 0,
      coveredFraction: 0,
      visibilityHard: 0,
      surfaceTriplets: 0
    };
  }
  const byType = Object.create(null);
  for (const i of tap0) {
    const k = String(layout[i].type);
    byType[k] = (byType[k] || 0) + 1;
  }
  let surfaceTriplets = 0;
  for (const k of Object.keys(byType)) {
    surfaceTriplets += Math.floor(byType[k] / 3);
  }
  const totalTriplets = Math.max(1, Math.floor(N / 3));
  const surfaceTripletShare = surfaceTriplets / totalTriplets;
  const coveredFraction = 1 - tap0.length / N;
  const visibilityHard = clamp01(
    W_VISIBILITY_TRIPLET * (1 - surfaceTripletShare) +
      (1 - W_VISIBILITY_TRIPLET) * coveredFraction
  );
  return { surfaceTripletShare, coveredFraction, visibilityHard, surfaceTriplets };
}

function layoutArray(levelOrLayout) {
  return Array.isArray(levelOrLayout) ? levelOrLayout : levelOrLayout.layout;
}

function isSkillReveal(levelOrLayout, removerIdx, revealedIdx) {
  const layout = layoutArray(levelOrLayout);
  const r = layout[removerIdx];
  const t = layout[revealedIdx];
  if (!r || !t) return false;
  return r.x === t.x && r.y === t.y && r.z > t.z;
}

function simulatePathMetrics(level, solution) {
  const layout = level.layout;
  const coverers = computeCoverers(layout);
  const removed = makeBitset(layout.length);
  let trayCounts = {};
  let traySize = 0;

  let sumTappable = 0;
  let minTappable = Infinity;
  let forcedMoves = 0;
  let steps = 0;
  let minSlack = 7;

  let skillReveals = 0;
  let chanceReveals = 0;

  const stepSlacks = [];
  const stepForced = [];
  const stepTappable = [];

  for (const idx of solution) {
    if (traySize >= 7) break;
    const tappableBefore = getTappable(layout, removed, coverers);
    const beforeSet = new Set(tappableBefore);
    const tappableCount = tappableBefore.length;

    sumTappable += tappableCount;
    minTappable = Math.min(minTappable, tappableCount);

    const scored = tappableBefore.map(i => ({
      i,
      s: moveOrderingScore(trayCounts, traySize, layout[i].type)
    }));
    scored.sort((a, b) => b.s - a.s);
    const best = scored[0]?.s ?? -Infinity;
    const safeCount = scored.filter(m => m.s >= best - 10).length;
    const isForced = safeCount <= 1;
    if (isForced) forcedMoves += 1;

    stepTappable.push(tappableCount);
    stepForced.push(isForced ? 1 : 0);

    bitsetAdd(removed, idx);
    const tappableAfter = getTappable(layout, removed, coverers);
    for (const i of tappableAfter) {
      if (!beforeSet.has(i)) {
        if (isSkillReveal(level, idx, i)) skillReveals += 1;
        else chanceReveals += 1;
      }
    }

    const type = layout[idx].type;
    const next = applyTrayAdd(trayCounts, traySize, type);
    trayCounts = next.trayCounts;
    traySize = next.traySize;
    const slackAfter = 7 - traySize;
    minSlack = Math.min(minSlack, slackAfter);
    stepSlacks.push(slackAfter);
    steps += 1;
  }

  const avgTappable = steps > 0 ? sumTappable / steps : 0;
  const forcedRatio = steps > 0 ? forcedMoves / steps : 1;

  const totalRevealEvents = skillReveals + chanceReveals;
  const skillRevealRate = totalRevealEvents > 0 ? skillReveals / totalRevealEvents : 0;
  const chanceRevealRate = totalRevealEvents > 0 ? chanceReveals / totalRevealEvents : 0;
  let digHard = 0;
  if (totalRevealEvents > 0) {
    digHard = clamp01(
      DIG_WEIGHT_CHANCE * chanceRevealRate + DIG_WEIGHT_SKILL * skillRevealRate
    );
  }

  const NUM_DIFFICULTY_WINDOWS = 3;
  let difficultyVariance = 0;
  let difficultyRange = 0;
  const windowHardnesses = [];
  if (steps >= NUM_DIFFICULTY_WINDOWS) {
    const windowSize = steps / NUM_DIFFICULTY_WINDOWS;
    for (let w = 0; w < NUM_DIFFICULTY_WINDOWS; w += 1) {
      const start = Math.floor(w * windowSize);
      const end = w < NUM_DIFFICULTY_WINDOWS - 1
        ? Math.floor((w + 1) * windowSize)
        : steps;
      let wMinSlack = 7;
      let wForced = 0;
      let wMinTappable = Infinity;
      for (let i = start; i < end; i += 1) {
        wMinSlack = Math.min(wMinSlack, stepSlacks[i]);
        wForced += stepForced[i];
        wMinTappable = Math.min(wMinTappable, stepTappable[i]);
      }
      const wSteps = end - start;
      const wForcedRatio = wSteps > 0 ? wForced / wSteps : 0;
      const wMinTapp = Number.isFinite(wMinTappable) ? wMinTappable : 0;
      const slackHard = clamp01((3 - wMinSlack) / 3);
      const forcedHard = clamp01(wForcedRatio);
      const minChoiceHard = clamp01(1 - wMinTapp / 6);
      windowHardnesses.push(slackHard * 0.26 + forcedHard * 0.24 + minChoiceHard * 0.1);
    }
    const mean = windowHardnesses.reduce((a, b) => a + b, 0) / windowHardnesses.length;
    difficultyVariance = windowHardnesses.reduce((sum, x) => sum + (x - mean) ** 2, 0) / windowHardnesses.length;
    difficultyRange = Math.max(...windowHardnesses) - Math.min(...windowHardnesses);
  }

  return {
    steps,
    avgTappable,
    minTappable: Number.isFinite(minTappable) ? minTappable : 0,
    forcedRatio,
    minSlack,
    difficultyVariance,
    difficultyRange,
    windowHardnesses,
    skillReveals,
    chanceReveals,
    skillRevealRate,
    chanceRevealRate,
    digHard
  };
}

function rolloutFailureRate(level, trials, rng) {
  const layout = level.layout;
  const coverers = computeCoverers(layout);

  function rand() {
    return rng();
  }

  function playOne() {
    const removed = makeBitset(layout.length);
    let trayCounts = {};
    let traySize = 0;

    let safetySteps = 0;
    while (true) {
      if (traySize >= 7) return false;
      if (bitsetAllSet(removed, layout.length) && traySize === 0) return true;
      const tappable = getTappable(layout, removed, coverers);
      if (tappable.length === 0) return false;

      let pickIdx;
      if (rand() < 0.15) {
        pickIdx = tappable[Math.floor(rand() * tappable.length)];
      } else {
        let best = tappable[0];
        let bestScore = -Infinity;
        for (const i of tappable) {
          const s = moveOrderingScore(trayCounts, traySize, layout[i].type) + rand() * 0.01;
          if (s > bestScore) {
            bestScore = s;
            best = i;
          }
        }
        pickIdx = best;
      }

      bitsetAdd(removed, pickIdx);
      const next = applyTrayAdd(trayCounts, traySize, layout[pickIdx].type);
      trayCounts = next.trayCounts;
      traySize = next.traySize;

      safetySteps += 1;
      if (safetySteps > layout.length + 5) {
        return false;
      }
    }
  }

  let wins = 0;
  for (let t = 0; t < trials; t += 1) {
    if (playOne()) wins += 1;
  }
  return 1 - wins / trials;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scoreLevel(level, options = {}) {
  const exact = solveLevel(level, { mode: 'exact', maxNodes: options.maxSolveNodes || 200000 });
  if (!exact.solvable) {
    return {
      solvable: false,
      difficultyScore: Infinity,
      metrics: { status: exact.status, nodesExpanded: exact.stats.nodesExpanded }
    };
  }

  const layout = level.layout;
  const coverers = computeCoverers(layout);
  const visibility = computeVisibilityMetrics(layout, coverers);
  const pathMetrics = simulatePathMetrics(level, exact.solution);

  const forcedExtras = {};
  const fl = options.forcedLookahead;
  if (fl != null && typeof fl === 'object') {
    const scan = computeForcedRatioK(level, exact.solution, {
      lookaheadDepth: fl.lookaheadDepth ?? forcedLookaheadDefaults.lookaheadDepth,
      maxMovesPerNode: fl.maxMovesPerNode ?? forcedLookaheadDefaults.maxMovesPerNode,
      marginDelta: fl.marginDelta ?? forcedLookaheadDefaults.marginDelta
    });
    if (scan.ok) {
      forcedExtras.forcedRatioK = scan.forcedRatioK;
      forcedExtras.forcedStepsK = scan.forcedStepsK;
      forcedExtras.forcedLookaheadNodes = scan.lookaheadNodes;
    }
  }
  const rng = mulberry32((options.rolloutSeed || 9001) ^ (level.id * 2654435761));
  const failureRate = rolloutFailureRate(level, options.rollouts || 30, rng);

  const slackHard = clamp01((3 - pathMetrics.minSlack) / 3);
  const deadEndHard = clamp01(failureRate);
  const strategicPressureHard = clamp01(
    W_STRATEGIC_SLACK * slackHard + (1 - W_STRATEGIC_SLACK) * deadEndHard
  );
  const effortHard = clamp01(Math.log10(1 + exact.stats.nodesExpanded) / 6);

  const difficultyScore = clamp01(
    W_SCORE_VISIBILITY * visibility.visibilityHard +
      W_SCORE_STRATEGIC * strategicPressureHard +
      W_SCORE_DIG * pathMetrics.digHard +
      W_SCORE_EFFORT * effortHard
  );

  return {
    solvable: true,
    difficultyScore,
    metrics: {
      ...pathMetrics,
      ...forcedExtras,
      ...visibility,
      strategicPressureHard,
      slackHard,
      deadEndHard,
      failureRate,
      effortHard,
      nodesExpanded: exact.stats.nodesExpanded,
      memoSize: exact.stats.memoSize
    }
  };
}

module.exports = {
  scoreLevel,
  computeCoverers,
  computeVisibilityMetrics,
  isSkillReveal
};
