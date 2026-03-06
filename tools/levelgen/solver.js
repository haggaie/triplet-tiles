function tileKey(x, y, z) {
  return `${x},${y},${z}`;
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

function bitsetClone(bits) {
  return new Uint32Array(bits);
}

function bitsetAllSet(bits, n) {
  // removedBits: 1 means removed
  const fullWords = Math.floor(n / 32);
  for (let i = 0; i < fullWords; i += 1) {
    if (bits[i] !== 0xffffffff) return false;
  }
  const rem = n % 32;
  if (rem === 0) return true;
  const lastMask = (1 << rem) - 1;
  return (bits[fullWords] & lastMask) === lastMask;
}

function bitsKey(bits) {
  // Compact enough for memo keys in JS.
  let out = '';
  for (let i = 0; i < bits.length; i += 1) {
    out += bits[i].toString(16).padStart(8, '0');
  }
  return out;
}

function trayKey(trayCounts) {
  const parts = [];
  Object.keys(trayCounts)
    .sort()
    .forEach(t => {
      const c = trayCounts[t] || 0;
      if (c > 0) parts.push(`${t}${c}`);
    });
  return parts.join(',');
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

function computeCoverers(tiles) {
  // Mirrors game.js isTileCovered():
  // other covers tile if other.z > tile.z and:
  // -1 <= other.x - tile.x <= 0 AND 0 <= other.y - tile.y <= 1
  const coverers = Array.from({ length: tiles.length }, () => []);
  for (let i = 0; i < tiles.length; i += 1) {
    const a = tiles[i];
    for (let j = 0; j < tiles.length; j += 1) {
      if (i === j) continue;
      const b = tiles[j];
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

function getTappableIndices(tiles, removedBits, coverers) {
  const tappable = [];
  for (let i = 0; i < tiles.length; i += 1) {
    if (bitsetHas(removedBits, i)) continue;
    const cov = coverers[i];
    let covered = false;
    for (let k = 0; k < cov.length; k += 1) {
      if (!bitsetHas(removedBits, cov[k])) {
        covered = true;
        break;
      }
    }
    if (!covered) tappable.push(i);
  }
  return tappable;
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

function solveExact(level, options) {
  const tiles = level.layout.map((t, idx) => ({
    idx,
    type: t.type,
    x: t.x,
    y: t.y,
    z: t.z,
    _k: tileKey(t.x, t.y, t.z)
  }));
  const coverers = computeCoverers(tiles);
  const removed0 = makeBitset(tiles.length);

  const maxNodes = options.maxNodes || 200000;
  const memo = new Set();
  let nodesExpanded = 0;

  function dfs(removedBits, trayCounts, traySize, path) {
    nodesExpanded += 1;
    if (nodesExpanded > maxNodes) return { status: 'capped' };

    if (traySize > 7) return { status: 'fail' };
    if (bitsetAllSet(removedBits, tiles.length) && traySize === 0) {
      return { status: 'win', path };
    }

    const key = `${bitsKey(removedBits)}|${trayKey(trayCounts)}`;
    if (memo.has(key)) return { status: 'fail' };

    const tappable = getTappableIndices(tiles, removedBits, coverers);
    if (tappable.length === 0) {
      memo.add(key);
      return { status: 'fail' };
    }

    // Order moves by a tray-safety heuristic.
    tappable.sort((i, j) => {
      const si = moveOrderingScore(trayCounts, traySize, tiles[i].type);
      const sj = moveOrderingScore(trayCounts, traySize, tiles[j].type);
      return sj - si;
    });

    for (const idx of tappable) {
      const type = tiles[idx].type;
      // Match game rule: if tray already has 7 tiles, any pick loses immediately.
      // In our canonical tray representation, traySize is current tile count.
      if (traySize >= 7) {
        return { status: 'fail' };
      }

      const nextRemoved = bitsetClone(removedBits);
      bitsetAdd(nextRemoved, idx);
      const nextTray = applyTrayAdd(trayCounts, traySize, type);

      const res = dfs(nextRemoved, nextTray.trayCounts, nextTray.traySize, path.concat(idx));
      if (res.status === 'win') return res;
      if (res.status === 'capped') return res;
    }

    memo.add(key);
    return { status: 'fail' };
  }

  const result = dfs(removed0, {}, 0, []);
  return {
    solvable: result.status === 'win',
    status: result.status,
    solution: result.status === 'win' ? result.path : null,
    stats: { nodesExpanded, memoSize: memo.size }
  };
}

function beamSolve(level, options) {
  const tiles = level.layout.map((t, idx) => ({
    idx,
    type: t.type,
    x: t.x,
    y: t.y,
    z: t.z
  }));
  const coverers = computeCoverers(tiles);
  const maxNodes = options.maxNodes || 50000;
  const beamWidth = options.beamWidth || 200;

  let nodesExpanded = 0;
  const seen = new Set();

  function heuristic(trayCounts, traySize, tappableCount) {
    // Higher is better. Prefer low tray size and more options.
    const distinct = Object.values(trayCounts).filter(c => c > 0).length;
    return tappableCount * 5 - traySize * 10 - distinct * 3;
  }

  const start = { removedBits: makeBitset(tiles.length), trayCounts: {}, traySize: 0, path: [] };
  let frontier = [start];

  while (frontier.length > 0) {
    const nextFrontier = [];

    for (const state of frontier) {
      nodesExpanded += 1;
      if (nodesExpanded > maxNodes) {
        return { solvable: false, status: 'capped', solution: null, stats: { nodesExpanded } };
      }

      if (state.traySize > 7) continue;
      if (bitsetAllSet(state.removedBits, tiles.length) && state.traySize === 0) {
        return { solvable: true, status: 'win', solution: state.path, stats: { nodesExpanded } };
      }

      const key = `${bitsKey(state.removedBits)}|${trayKey(state.trayCounts)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const tappable = getTappableIndices(tiles, state.removedBits, coverers);
      if (tappable.length === 0) continue;

      // Expand best-looking moves first.
      tappable.sort((i, j) => {
        const si = moveOrderingScore(state.trayCounts, state.traySize, tiles[i].type);
        const sj = moveOrderingScore(state.trayCounts, state.traySize, tiles[j].type);
        return sj - si;
      });

      for (const idx of tappable) {
        if (state.traySize >= 7) break;
        const type = tiles[idx].type;
        const nextRemoved = bitsetClone(state.removedBits);
        bitsetAdd(nextRemoved, idx);
        const nextTray = applyTrayAdd(state.trayCounts, state.traySize, type);
        const nextState = {
          removedBits: nextRemoved,
          trayCounts: nextTray.trayCounts,
          traySize: nextTray.traySize,
          path: state.path.concat(idx)
        };
        const nextTappable = getTappableIndices(tiles, nextRemoved, coverers).length;
        nextState._score = heuristic(nextState.trayCounts, nextState.traySize, nextTappable);
        nextFrontier.push(nextState);
      }
    }

    nextFrontier.sort((a, b) => (b._score || 0) - (a._score || 0));
    frontier = nextFrontier.slice(0, beamWidth);
  }

  return { solvable: false, status: 'fail', solution: null, stats: { nodesExpanded } };
}

function solveLevel(level, options = {}) {
  const mode = options.mode || 'exact';
  if (mode === 'beam') return beamSolve(level, options);
  return solveExact(level, options);
}

module.exports = {
  solveLevel
};

