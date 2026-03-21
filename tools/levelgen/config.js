/**
 * Level generator configuration.
 *
 * This is a JS file (not JSON) so we can add helper constants and comments
 * without complicating parsing. The generator CLI imports this module.
 *
 * Schema (high-level):
 * - seed: number
 * - generationMode: "batches" | "randomPool"
 * - tileTypePoolSize: for randomPool mode — abstract indices [0 .. tileTypePoolSize - 1] are the pool
 *   (`pool.paramRanges.tileTypePoolSize` overrides the top-level value).
 * - output:
 *   - outFile: string (path relative to project root)
 *   - includeSolverStats: boolean
 * - levels: array of level “batches”
 *   - batch fields:
 *     - templateId: string
 *     - templateParams: object (template-specific)
 *     - gridWidth, gridHeight: number (cell counts; odd-ish recommended; min dimension >= 5 for templates; gridWidth <= 8)
 *     - count: number (how many levels to generate for this batch)
 *     - tileTypeCount: number — distinct abstract type indices 0 .. tileTypeCount-1
 *     - distribution:
 *       - mode: "explicitCounts" | "weightedTriplets" | "zipf"
 *       - explicitCounts: { [typeId]: number } (typeId = integer index; each count multiple of 3)
 *         OR
 *       - totalTriplets: number | "auto" (totalTiles = totalTriplets*3; "auto" = derive from template capacity)
 *       - weights: { [typeId]: number } (typeId = integer; relative weights; generator rounds to multiples of 3)
 *     - templateTripletFillRatio (optional): 0–1, default 1 — with totalTriplets "auto", use floor(maxTiles*ratio/3) triplets
 *     - totalTripletsMin / totalTripletsMax (optional): optional clamps after derive (batch mode)
 *     - layering:
 *       - minZ: number (usually 0)
 *       - maxZ: number (inclusive)
 *       - overlap: "light" | "medium" | "heavy"
 *       - maxStackPerCell: number
 * - forcedLookahead (optional): `{}` or partial overrides — depth-k forced metric; defaults from `forced-lookahead-defaults.js`
 * - pool: when generationMode === "randomPool" - { count, keep?, paramRanges? }
 *   - paramRanges.deriveTotalTripletsFromTemplate: default true — derive triplets from template (else legacy random range)
 *   - paramRanges.templateTripletFillRatio, totalTripletsMin, totalTripletsMax: same meaning as batch fields for derive/clamps
 */
module.exports = {
  seed: 1337,
  /** 'batches' = use levels[] and batch constraints; 'randomPool' = generate pool then filter/sort by difficulty */
  generationMode: 'batches',
  /**
   * Random pool: sample type subsets from ids [0 .. tileTypePoolSize - 1]. Override with
   * `pool.paramRanges.tileTypePoolSize` if needed (must be >= 3).
   */
  tileTypePoolSize: 12,
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
      gridWidth: 7,
      gridHeight: 10,
      count: 3,
      tileTypeCount: 7,
      solverConstraints: { requireMinSlackAtMost: 3 },
      distribution: { mode: 'zipf', totalTriplets: 12, exponent: 0.4 },
      layering: { minZ: 0, maxZ: 3, overlap: 'medium', maxStackPerCell: 3, full: true, layerShape: 'pyramid' }
    },
    {
      templateId: 'circle',
      templateParams: { radius: 3 },
      gridWidth: 8,
      gridHeight: 11,
      count: 2,
      tileTypeCount: 8,
      solverConstraints: { requireMinSlackAtMost: 3 },
      distribution: { mode: 'zipf', totalTriplets: 18, exponent: 0.5 },
      layering: { minZ: 0, maxZ: 3, overlap: 'medium', maxStackPerCell: 3, full: true, layerShape: 'randomErosion', layerShapeOptions: { erosionRate: 0.16, minCellFraction: 0.18, allowShift: false } }
    },
    // Medium
    {
      templateId: 'heart',
      templateParams: { radius: 4, thickness: 2 },
      gridWidth: 8,
      gridHeight: 12,
      count: 3,
      tileTypeCount: 10,
      solverConstraints: { requireMinSlackAtMost: 1 },
      distribution: { mode: 'zipf', totalTriplets: 18, exponent: 0.8 },
      layering: { minZ: 0, maxZ: 5, overlap: 'heavy', maxStackPerCell: 4, full: true, layerShape: 'randomErosion', layerShapeOptions: { erosionRate: 0.18, minCellFraction: 0.12, allowShift: true } }
    },
    {
      templateId: 'hexagon',
      templateParams: { radius: 4 },
      gridWidth: 8,
      gridHeight: 12,
      count: 3,
      tileTypeCount: 12,
      solverConstraints: { requireMinSlackAtMost: 1 },
      distribution: { mode: 'zipf', totalTriplets: 20, exponent: 0.9 },
      layering: { minZ: 0, maxZ: 6, overlap: 'heavy', maxStackPerCell: 4, full: true, layerShape: 'randomErosion', layerShapeOptions: { erosionRate: 0.2, minCellFraction: 0.1, allowShift: true } }
    },
    {
      templateId: 'triangle',
      templateParams: { radius: 4 },
      gridWidth: 8,
      gridHeight: 12,
      count: 2,
      tileTypeCount: 12,
      solverConstraints: { requireMinSlackAtMost: 1 },
      distribution: { mode: 'zipf', totalTriplets: 21, exponent: 1.0 },
      layering: { minZ: 0, maxZ: 6, overlap: 'heavy', maxStackPerCell: 4, full: true, layerShape: 'shift', layerShapeOptions: { shiftDx: 1, shiftDy: 1 } }
    },
    // Hard: deeper stacks, 12 types, higher skew and pressure.
    {
      templateId: 'cross',
      templateParams: { thickness: 2 },
      gridWidth: 8,
      gridHeight: 12,
      count: 3,
      maxGenerateAttempts: 2800,
      tileTypeCount: 12,
      solverConstraints: { requireMinSlackAtMost: 1 },
      distribution: { mode: 'zipf', totalTriplets: 'auto', exponent: 1.15 },
      layering: { minZ: 0, maxZ: 2, full: true, layerShape: 'paramSweep', layerShapeOptions: {
        "sweep": "thickness",
        "minThickness": 1,
        "maxThickness": null
      }
     }
    },
    {
      templateId: 'ring',
      templateParams: { radius: 4, thickness: 2 },
      gridWidth: 8,
      gridHeight: 14,
      count: 3,
      maxGenerateAttempts: 3000,
      tileTypeCount: 12,
      solverConstraints: { requireMinSlackAtMost: 1 },
      distribution: { mode: 'zipf', totalTriplets: 24, exponent: 1.25 },
      layering: { minZ: 0, maxZ: 8, overlap: 'heavy', maxStackPerCell: 5, full: true, layerShape: 'randomErosion', layerShapeOptions: { erosionRate: 0.24, minCellFraction: 0.08, allowShift: true } }
    },
    {
      templateId: 't',
      templateParams: { radius: 5, thickness: 2 },
      gridWidth: 8,
      gridHeight: 14,
      count: 2,
      maxGenerateAttempts: 3200,
      tileTypeCount: 12,
      solverConstraints: { requireMinSlackAtMost: 1, requireMaxDifficultyRange: 0.5 },
      distribution: { mode: 'zipf', totalTriplets: 25, exponent: 1.45 },
      layering: { minZ: 0, maxZ: 9, overlap: 'heavy', maxStackPerCell: 6, full: true, layerShape: 'shift', layerShapeOptions: { shiftDx: 1, shiftDy: 0 }, interleavePlacement: true }
    },
    {
      templateId: 'u',
      templateParams: { radius: 5, thickness: 2 },
      gridWidth: 8,
      gridHeight: 14,
      count: 2,
      maxGenerateAttempts: 3400,
      tileTypeCount: 12,
      solverConstraints: { requireMinSlackAtMost: 1, requireMaxDifficultyRange: 0.5 },
      distribution: { mode: 'zipf', totalTriplets: 21, exponent: 1.55 },
      layering: { minZ: 0, maxZ: 9, overlap: 'heavy', maxStackPerCell: 6, full: true, layerShape: 'randomErosion', layerShapeOptions: { erosionRate: 0.28, minCellFraction: 0.07, allowShift: true }, interleavePlacement: true }
    }
  ]
};
