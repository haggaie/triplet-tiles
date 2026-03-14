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
 *       - mode: "explicitCounts" | "weightedTriplets"
 *       - explicitCounts: { [typeId]: number } (typeId = string or integer; each count multiple of 3)
 *         OR
 *       - totalTriplets: number (totalTiles = totalTriplets*3)
 *       - weights: { [typeId]: number } (typeId = string or integer; relative weights; generator rounds to multiples of 3)
 *     - layering:
 *       - minZ: number (usually 0)
 *       - maxZ: number (inclusive)
 *       - overlap: "light" | "medium" | "heavy"
 *       - maxStackPerCell: number
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
  levels: [
    // Early ramp: short levels that require balancing tray vs opening tiles (medium overlap, moderate size).
    {
      templateId: 'diamond',
      templateParams: { radius: 4 },
      gridSize: 11,
      count: 3,
      tileTypes: ALL_TILE_TYPES.slice(0, 5),
      sequenceConstraints: {
        // Ensure the sequence hits some tray pressure at least once.
        // minSlack = min(7 - traySize) over the simulated pick order.
        requireMinSlackAtMost: 3
      },
      solverConstraints: {
        // Enforce real (solver-path) tray pressure at least once.
        requireMinSlackAtMost: 3
      },
      distribution: {
        mode: 'weightedTriplets',
        totalTriplets: 15,
        weights: { leaf: 4, flower: 4, clover: 3, star: 3, acorn: 2 }
      },
      layering: {
        minZ: 0,
        maxZ: 2,
        overlap: 'medium',
        maxStackPerCell: 3,
        full: true,
        layerShape: 'pyramid'
      }
    },
    // Mid: more types, tighter tray pressure, fewer “obvious” moves.
    {
      templateId: 'heart',
      templateParams: { radius: 4, thickness: 2 },
      gridSize: 11,
      count: 3,
      tileTypes: ALL_TILE_TYPES,
      sequenceConstraints: {
        requireMinSlackAtMost: 2
      },
      solverConstraints: {
        requireMinSlackAtMost: 3
      },
      distribution: {
        mode: 'weightedTriplets',
        totalTriplets: 24,
        weights: {
          leaf: 4, flower: 4, clover: 4, star: 4, acorn: 3, mushroom: 3,
          cherry: 2, butterfly: 2, sunflower: 2, apple: 2, carrot: 2, bee: 2
        }
      },
      layering: {
        minZ: 0,
        maxZ: 2,
        overlap: 'heavy',
        maxStackPerCell: 3,
        full: true,
        layerShape: 'pyramid'
      }
    },
    // Hard: heavy overlap, more layers — must plan to avoid tray overflow.
    {
      templateId: 'spiral',
      templateParams: { radius: 5, thickness: 1 },
      gridSize: 13,
      count: 3,
      maxGenerateAttempts: 2500,
      tileTypes: ALL_TILE_TYPES,
      sequenceConstraints: {
        requireMinSlackAtMost: 1
      },
      solverConstraints: {
        requireMinSlackAtMost: 3
      },
      distribution: {
        mode: 'weightedTriplets',
        totalTriplets: 27,
        weights: {
          leaf: 4, flower: 4, clover: 4, star: 4, acorn: 3, mushroom: 3,
          cherry: 2, butterfly: 2, sunflower: 2, apple: 2, carrot: 2, bee: 2
        }
      },
      layering: {
        minZ: 0,
        maxZ: 3,
        overlap: 'heavy',
        maxStackPerCell: 4,
        full: true,
        layerShape: 'full'
      }
    },
    // Late: largest shapes, most pressure, all 6 types. Require consistent difficulty across playthrough.
    {
      templateId: 'letter',
      templateParams: { letter: 'S', radius: 6, thickness: 2 },
      gridSize: 15,
      count: 3,
      tileTypes: ALL_TILE_TYPES,
      sequenceConstraints: {
        requireMinSlackAtMost: 1,
        targetSlackBand: [1, 3],
        maxSlackRunLength: 22,
        maxAttempts: 200
      },
      solverConstraints: {
        requireMinSlackAtMost: 3,
        requireMaxDifficultyRange: 0.3
      },
      distribution: {
        mode: 'weightedTriplets',
        totalTriplets: 33,
        weights: {
          leaf: 4, flower: 4, clover: 4, star: 4, acorn: 3, mushroom: 3,
          cherry: 2, butterfly: 2, sunflower: 2, apple: 2, carrot: 2, bee: 2
        }
      },
      layering: {
        minZ: 0,
        maxZ: 1,
        overlap: 'heavy',
        maxStackPerCell: 4,
        full: true,
        layerShape: 'shift',
        interleavePlacement: true
      }
    }
  ]
};

