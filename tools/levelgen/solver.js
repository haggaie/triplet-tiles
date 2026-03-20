/**
 * Native levelgen solver: exact DFS (default), heuristic depth-k (optional), forced-ratio-K scan.
 * Build the addon first: npm run build:native
 */

const path = require('path');

const nativePath = path.resolve(
  __dirname,
  '../../crates/levelgen-solver/target/release/levelgen_solver.node'
);

const native = require(nativePath);
const forcedLookaheadDefaults = require('./forced-lookahead-defaults');

/**
 * @param {object} level - { layout: [...], gridSize?, id? }
 * @param {object} [options]
 * @param {'exact'|'heuristic'} [options.mode='exact']
 * @param {number} [options.maxNodes=200000] - exact mode
 * @param {number} [options.searchDepth=3] - heuristic lookahead plies
 * @param {number} [options.maxMovesPerNode=8] - heuristic / forced scan branching cap
 * @param {number} [options.maxSteps=200] - heuristic greedy step cap
 */
function solveLevel(level, options = {}) {
  const mode = options.mode || 'exact';
  const opts = { mode, maxNodes: options.maxNodes ?? 200000 };
  if (mode === 'heuristic') {
    if (options.searchDepth != null) opts.searchDepth = options.searchDepth;
    if (options.maxMovesPerNode != null) opts.maxMovesPerNode = options.maxMovesPerNode;
    if (options.maxSteps != null) opts.maxSteps = options.maxSteps;
  }
  return native.solveLevel(level, opts);
}

/**
 * Depth-k forced-move ratio along an exact solution path (native scan).
 * @param {object} level
 * @param {number[]} solution - tile indices from exact solve
 * @param {object} [options]
 * @param {number} [options.lookaheadDepth] - default: forced-lookahead-defaults.js
 * @param {number} [options.maxMovesPerNode]
 * @param {number} [options.marginDelta] - soft tie band in eval units
 * @returns {{ ok: boolean, forcedRatioK?: number, forcedStepsK?: number, steps?: number, lookaheadNodes?: number, stepForcedK?: number[], reason?: string }}
 */
function computeForcedRatioK(level, solution, options = {}) {
  const opts = {
    solution,
    lookaheadDepth: options.lookaheadDepth ?? forcedLookaheadDefaults.lookaheadDepth,
    maxMovesPerNode: options.maxMovesPerNode ?? forcedLookaheadDefaults.maxMovesPerNode,
    marginDelta: options.marginDelta ?? forcedLookaheadDefaults.marginDelta
  };
  return native.computeForcedRatioK(level, opts);
}

module.exports = {
  solveLevel,
  computeForcedRatioK
};
