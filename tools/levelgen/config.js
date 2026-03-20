/**
 * Level generator configuration.
 *
 * This is a JS file (not JSON) so we can add helper constants and comments
 * without complicating parsing. The generator CLI imports this module.
 *
 * Schema (high-level):
 * - seed: number
 * - generationMode: "batches" | "randomPool"
 * - output:
 *   - outFile: string (path relative to project root)
 *   - includeSolverStats: boolean
 * - levels: array of level “batches”
 *   - batch fields:
 *     - templateId: string
 *     - templateParams: object (template-specific)
 *     - gridSize: number (odd-ish recommended; must match template output range)
 *     - count: number (how many levels to generate for this batch)
 *     - tileTypes: string[] | number[] — tile id strings (from game’s TILE_TYPES) or 0-based integer indices into TILE_TYPES
 *     - distribution:
 *       - mode: "explicitCounts" | "weightedTriplets" | "zipf"
 *       - explicitCounts: { [typeId]: number } (typeId = string or integer; each count multiple of 3)
 *         OR
 *       - totalTriplets: number (totalTiles = totalTriplets*3)
 *       - weights: { [typeId]: number } (typeId = string or integer; relative weights; generator rounds to multiples of 3)
 *     - layering:
 *       - minZ: number (usually 0)
 *       - maxZ: number (inclusive)
 *       - overlap: "light" | "medium" | "heavy"
 *       - maxStackPerCell: number
 * - forcedLookahead (optional): `{}` or partial overrides — depth-k forced metric; defaults from `forced-lookahead-defaults.js`
 * - pool: when generationMode === "randomPool" - { count, keep?, paramRanges? }
 */
const ALL_TILE_TYPES = [
  'leaf', 'flower', 'clover', 'star', 'acorn', 'mushroom',
  'cherry', 'butterfly', 'sunflower', 'apple', 'carrot', 'bee'
];

/** 0-based indices for first 5 tile types; use with tileTypes and weights, e.g. weights: { 0: 4, 1: 3, 2: 3, 3: 2, 4: 2 } */
const INDICES_FIRST_5 = [0, 1, 2, 3, 4];

module.exports = {
  ALL_TILE_TYPES,
  INDICES_FIRST_5,
  seed: 1337,
  /** 'batches' = use levels[] and batch constraints; 'randomPool' = generate pool then filter/sort by difficulty */
  generationMode: 'batches',
  output: {
    outFile: 'levels.generated.js',
    includeSolverStats: false,
    /** If set, write a difficulty report (metrics and easy/medium/hard stats) to this path (relative to project root). */
    reportFile: 'levelgen-report.md'
  },
  /**
   * Enable `forcedRatioK` in reports (slower). Depth / branching / margin: edit `forced-lookahead-defaults.js`,
   * or set fields here to override only what you need (e.g. `{ maxMovesPerNode: 6 }`).
   */
  forcedLookahead: {},
  levels: [
    // Easy: regular silhouettes, shallow depth, fewer types.
    {
      templateId: 'diamond',
      templateParams: { radius: 3 },
      gridSize: 7,
      count: 3,
      tileTypes: ALL_TILE_TYPES.slice(0, 7),
      sequenceConstraints: { requireMinSlackAtMost: 3 },
      solverConstraints: { requireMinSlackAtMost: 3 },
      distribution: { mode: 'zipf', totalTriplets: 12, exponent: 0.4 },
      layering: { minZ: 0, maxZ: 3, overlap: 'medium', maxStackPerCell: 3, full: true, layerShape: 'pyramid' }
    },
    {
      templateId: 'circle',
      templateParams: { radius: 3 },
      gridSize: 8,
      count: 2,
      tileTypes: ALL_TILE_TYPES.slice(0, 8),
      sequenceConstraints: { requireMinSlackAtMost: 3 },
      solverConstraints: { requireMinSlackAtMost: 3 },
      distribution: { mode: 'zipf', totalTriplets: 18, exponent: 0.5 },
      layering: { minZ: 0, maxZ: 3, overlap: 'medium', maxStackPerCell: 3, full: true, layerShape: 'randomErosion', layerShapeOptions: { erosionRate: 0.16, minCellFraction: 0.18, allowShift: false } }
    },
    // Medium
    {
      templateId: 'heart',
      templateParams: { radius: 4, thickness: 2 },
      gridSize: 9,
      count: 3,
      tileTypes: ALL_TILE_TYPES.slice(0, 10),
      sequenceConstraints: { requireMinSlackAtMost: 2, targetSlackBand: [1, 3], maxSlackRunLength: 30 },
      solverConstraints: { requireMinSlackAtMost: 1 },
      distribution: { mode: 'zipf', totalTriplets: 24, exponent: 0.8 },
      layering: { minZ: 0, maxZ: 5, overlap: 'heavy', maxStackPerCell: 4, full: true, layerShape: 'randomErosion', layerShapeOptions: { erosionRate: 0.18, minCellFraction: 0.12, allowShift: true } }
    },
    {
      templateId: 'hexagon',
      templateParams: { radius: 4 },
      gridSize: 9,
      count: 3,
      tileTypes: ALL_TILE_TYPES,
      sequenceConstraints: { requireMinSlackAtMost: 2, targetSlackBand: [1, 3], maxSlackRunLength: 26 },
      solverConstraints: { requireMinSlackAtMost: 1 },
      distribution: { mode: 'zipf', totalTriplets: 27, exponent: 0.9 },
      layering: { minZ: 0, maxZ: 6, overlap: 'heavy', maxStackPerCell: 4, full: true, layerShape: 'randomErosion', layerShapeOptions: { erosionRate: 0.2, minCellFraction: 0.1, allowShift: true } }
    },
    {
      templateId: 'triangle',
      templateParams: { radius: 4 },
      gridSize: 9,
      count: 2,
      tileTypes: ALL_TILE_TYPES,
      sequenceConstraints: { requireMinSlackAtMost: 1, targetSlackBand: [1, 3], maxSlackRunLength: 24 },
      solverConstraints: { requireMinSlackAtMost: 1 },
      distribution: { mode: 'zipf', totalTriplets: 28, exponent: 1.0 },
      layering: { minZ: 0, maxZ: 6, overlap: 'heavy', maxStackPerCell: 4, full: true, layerShape: 'shift', layerShapeOptions: { shiftDx: 1, shiftDy: 1 } }
    },
    // Hard: deeper stacks, 12 types, higher skew and pressure.
    {
      templateId: 'cross',
      templateParams: { radius: 4, thickness: 2 },
      gridSize: 9,
      count: 3,
      maxGenerateAttempts: 2800,
      tileTypes: ALL_TILE_TYPES,
      sequenceConstraints: { requireMinSlackAtMost: 1, targetSlackBand: [1, 2], maxSlackRunLength: 20, maxAttempts: 220 },
      solverConstraints: { requireMinSlackAtMost: 1 },
      distribution: { mode: 'zipf', totalTriplets: 30, exponent: 1.15 },
      layering: { minZ: 0, maxZ: 7, overlap: 'heavy', maxStackPerCell: 5, full: true, layerShape: 'randomErosion', layerShapeOptions: { erosionRate: 0.22, minCellFraction: 0.08, allowShift: true } }
    },
    {
      templateId: 'ring',
      templateParams: { radius: 4, thickness: 2 },
      gridSize: 10,
      count: 3,
      maxGenerateAttempts: 3000,
      tileTypes: ALL_TILE_TYPES,
      sequenceConstraints: { requireMinSlackAtMost: 1, targetSlackBand: [1, 2], maxSlackRunLength: 18, maxAttempts: 240 },
      solverConstraints: { requireMinSlackAtMost: 1 },
      distribution: { mode: 'zipf', totalTriplets: 34, exponent: 1.25 },
      layering: { minZ: 0, maxZ: 8, overlap: 'heavy', maxStackPerCell: 5, full: true, layerShape: 'randomErosion', layerShapeOptions: { erosionRate: 0.24, minCellFraction: 0.08, allowShift: true } }
    },
    {
      templateId: 'spiral',
      templateParams: { radius: 4, thickness: 2 },
      gridSize: 10,
      count: 2,
      maxGenerateAttempts: 3200,
      tileTypes: ALL_TILE_TYPES,
      sequenceConstraints: { requireMinSlackAtMost: 1, targetSlackBand: [1, 2], maxSlackRunLength: 16, maxAttempts: 260 },
      solverConstraints: { requireMinSlackAtMost: 1, requireMaxDifficultyRange: 0.35 },
      distribution: { mode: 'zipf', totalTriplets: 36, exponent: 1.35 },
      layering: { minZ: 0, maxZ: 8, overlap: 'heavy', maxStackPerCell: 6, full: true, layerShape: 'randomErosion', layerShapeOptions: { erosionRate: 0.26, minCellFraction: 0.08, allowShift: true } }
    },
    {
      templateId: 't',
      templateParams: { radius: 5, thickness: 2 },
      gridSize: 10,
      count: 2,
      maxGenerateAttempts: 3200,
      tileTypes: ALL_TILE_TYPES,
      sequenceConstraints: { requireMinSlackAtMost: 1, targetSlackBand: [1, 2], maxSlackRunLength: 16, maxAttempts: 260 },
      solverConstraints: { requireMinSlackAtMost: 1, requireMaxDifficultyRange: 0.35 },
      distribution: { mode: 'zipf', totalTriplets: 38, exponent: 1.45 },
      layering: { minZ: 0, maxZ: 9, overlap: 'heavy', maxStackPerCell: 6, full: true, layerShape: 'shift', layerShapeOptions: { shiftDx: 1, shiftDy: 0 }, interleavePlacement: true }
    },
    {
      templateId: 'u',
      templateParams: { radius: 5, thickness: 2 },
      gridSize: 10,
      count: 2,
      maxGenerateAttempts: 3400,
      tileTypes: ALL_TILE_TYPES,
      sequenceConstraints: { requireMinSlackAtMost: 1, targetSlackBand: [1, 2], maxSlackRunLength: 14, maxAttempts: 280 },
      solverConstraints: { requireMinSlackAtMost: 1, requireMaxDifficultyRange: 0.35 },
      distribution: { mode: 'zipf', totalTriplets: 40, exponent: 1.55 },
      layering: { minZ: 0, maxZ: 9, overlap: 'heavy', maxStackPerCell: 6, full: true, layerShape: 'randomErosion', layerShapeOptions: { erosionRate: 0.28, minCellFraction: 0.07, allowShift: true }, interleavePlacement: true }
    }
  ]
};

