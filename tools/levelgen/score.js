const { solveLevel } = require('./solver');

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function computeCoverers(layout) {
  const coverers = Array.from({ length: layout.length }, () => []);
  for (let i = 0; i < layout.length; i += 1) {
    const a = layout[i];
    for (let j = 0; j < layout.length; j += 1) {
      if (i === j) continue;
      const b = layout[j];
      if (b.z <= a.z) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (dx >= -1 && dx <= 0 && dy >= 0 && dy <= 1) {
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

  for (const idx of solution) {
    if (traySize >= 7) break;
    const tappable = getTappable(layout, removed, coverers);
    const tappableCount = tappable.length;

    sumTappable += tappableCount;
    minTappable = Math.min(minTappable, tappableCount);

    // Approx forced move: count how many tappable moves look “safe” by tray heuristic.
    // If only 1 looks safe, treat as forced-ish.
    const scored = tappable.map(i => ({
      i,
      s: moveOrderingScore(trayCounts, traySize, layout[i].type)
    }));
    scored.sort((a, b) => b.s - a.s);
    const best = scored[0]?.s ?? -Infinity;
    const safeCount = scored.filter(m => m.s >= best - 10).length;
    if (safeCount <= 1) forcedMoves += 1;

    // Apply the intended move.
    bitsetAdd(removed, idx);
    const type = layout[idx].type;
    const next = applyTrayAdd(trayCounts, traySize, type);
    trayCounts = next.trayCounts;
    traySize = next.traySize;
    minSlack = Math.min(minSlack, 7 - traySize);
    steps += 1;
  }

  const avgTappable = steps > 0 ? sumTappable / steps : 0;
  const forcedRatio = steps > 0 ? forcedMoves / steps : 1;

  return {
    steps,
    avgTappable,
    minTappable: Number.isFinite(minTappable) ? minTappable : 0,
    forcedRatio,
    minSlack
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

      // Epsilon-greedy: mostly pick best tray heuristic, sometimes random.
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
        // Should not happen; defensive exit.
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

  const pathMetrics = simulatePathMetrics(level, exact.solution);
  const rng = mulberry32((options.rolloutSeed || 9001) ^ (level.id * 2654435761));
  const failureRate = rolloutFailureRate(level, options.rollouts || 30, rng);

  // Normalize metrics into [0,1]-ish difficulty components.
  const avgChoiceHard = clamp01(1 - pathMetrics.avgTappable / 12); // 0 if ~12+ choices, 1 if ~0
  const minChoiceHard = clamp01(1 - pathMetrics.minTappable / 6);
  const forcedHard = clamp01(pathMetrics.forcedRatio);
  const slackHard = clamp01((3 - pathMetrics.minSlack) / 3); // minSlack>=3 => 0, minSlack=0 => 1
  const deadEndHard = clamp01(failureRate);
  const effortHard = clamp01(Math.log10(1 + exact.stats.nodesExpanded) / 6); // ~1 at 1e6

  // Weighted sum: tuned so tray pressure and dead-end risk dominate at high difficulty.
  const difficultyScore =
    avgChoiceHard * 0.18 +
    minChoiceHard * 0.12 +
    forcedHard * 0.20 +
    slackHard * 0.22 +
    deadEndHard * 0.18 +
    effortHard * 0.10;

  return {
    solvable: true,
    difficultyScore,
    metrics: {
      ...pathMetrics,
      failureRate,
      nodesExpanded: exact.stats.nodesExpanded,
      memoSize: exact.stats.memoSize
    }
  };
}

module.exports = {
  scoreLevel
};

