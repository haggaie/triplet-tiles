/**
 * Thin wrapper around the native Rust DFS solver.
 * Build the addon first: npm run build:native
 */

const path = require('path');

const nativePath = path.resolve(
  __dirname,
  '../../crates/levelgen-solver/target/release/levelgen_solver.node'
);

const native = require(nativePath);

function solveLevel(level, options = {}) {
  const opts = { maxNodes: options.maxNodes ?? 200000 };
  return native.solveLevelExact(level, opts);
}

module.exports = {
  solveLevel
};
