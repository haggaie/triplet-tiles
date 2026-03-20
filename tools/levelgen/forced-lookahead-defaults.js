/**
 * Single source of truth for depth-k forced-move evaluation (`forcedRatioK`).
 * Change `lookaheadDepth` here only unless you pass overrides in `config.forcedLookahead`.
 */
module.exports = {
  lookaheadDepth: 3,
  maxMovesPerNode: 8,
  marginDelta: 100
};
