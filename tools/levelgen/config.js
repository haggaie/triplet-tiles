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
 *     - gridWidth, gridHeight (optional): cell counts (min >= 5). Omit both to infer size from template + layering
 *       (see LEVELGEN.md); set `gridInfer: false` to forbid inference. Optional `gridInferMargin` pads the bbox (default 0).
 *       `rectangle` needs explicit width/height in templateParams. `heart` needs `radius` or both `radiusX` and `radiusY` when the grid is omitted.
 *     - count: number | "auto" | omitted — how many levels per batch; for batchVariation.mode "sweep", omit or use "auto" to use variants/axes length (see tools/levelgen/batch-variation.js)
 *     - tileTypeCount: number — distinct abstract type indices 0 .. tileTypeCount-1
 *     - distribution:
 *       - mode: "explicitCounts" | "weightedTriplets" | "zipf"
 *       - explicitCounts: { [typeId]: number } (typeId = integer index; each count multiple of 3)
 *         OR
 *       - totalTriplets: number | "auto" (totalTiles = totalTriplets*3; "auto" = derive from template capacity)
 *       - weights: { [typeId]: number } (typeId = integer; relative weights; generator rounds to multiples of 3)
 *     - templateTripletFillRatio (optional): 0–1, default 1 — with totalTriplets "auto", use floor(maxTiles*ratio/3) triplets
 *     - totalTripletsMin / totalTripletsMax (optional): optional clamps after derive (batch mode)
 *     - batchVariation (optional): per-slot structural overrides — `mode: 'sweep' | 'random'`;
 *       sweep: `variants` (array of patch objects) or `axes` (nested object with array leaves, Cartesian product);
 *       random: `ranges` nested tree of `{ min, max }` (integers or floats), `{ values: [...] }`, or sub-objects;
 *       resolved with `tools/levelgen/batch-variation.js` (deterministic for `slotIndex` + `seed` + batch index so CLI retries keep the same geometry).
 *     - layering:
 *       - minZ: number (usually 0)
 *       - maxZ: number (inclusive)
 *       - maxStackPerCell: number
 * - forcedLookahead (optional): `{}` or partial overrides — depth-k forced metric; defaults from `forced-lookahead-defaults.js`
 * - pool: when generationMode === "randomPool" - { count, keep?, paramRanges? }
 *   - paramRanges.deriveTotalTripletsFromTemplate: default true — derive triplets from template (else legacy random range)
 *   - paramRanges.templateTripletFillRatio, totalTripletsMin, totalTripletsMax: same meaning as batch fields for derive/clamps
 *   - paramRanges.poolInferSeed: passed as config.seed from CLI — seeds grid inference per level slot
 *   - paramRanges.useLegacyPoolGrid: if true, sample gridDimensions then params (old behavior); default false = infer grid from shape
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
      /** Manhattan ellipse: radiusX × radiusY (not symmetric); grid inferred from silhouette + paramSweep layers. */
      templateParams: { radiusX: 3, radiusY: 4 },
      count: 'auto',
      tileTypeCount: 7,
      /** Taller boards (batchVariation gridHeight 13+) often need minSlack ≥ 5 on the solution path; 3 would reject those slots forever. */
      solverConstraints: { requireMinSlackAtMost: 7 },
      /** `auto` scales triplets to template capacity; fixed counts left holes on tall grids (36 tiles vs 40+ layer-0 cells). */
      distribution: { mode: 'zipf', totalTriplets: 'auto', exponent: 0.4 },
      layering: {
        minZ: 0,
        maxZ: 2, maxStackPerCell: 3, layerShape: 'paramSweep',
        layerShapeOptions: {
          sweep: 'radius',
          minRadius: 1,
          maxRadius: null
        }
      },
      batchVariation: {
        mode: 'sweep',
        variants: [
          { templateParams: { radiusX: 3, radiusY: 4 } },
          { templateParams: { radiusX: 3, radiusY: 5 } },
          { templateParams: { radiusX: 3, radiusY: 5 } },
          { templateParams: { radiusX: 3, radiusY: 6 } },
          { templateParams: { radiusX: 3, radiusY: 6 } },
          { templateParams: { radiusX: 3, radiusY: 7 } }
        ]
      }
    },
    {
      templateId: 'circle',
      /** Ellipse radii in templateParams; grid inferred (both axes required per variant when not symmetric). */
      templateParams: { radiusX: 3, radiusY: 4 },
      tileTypeCount: 8,
      solverConstraints: { requireMinSlackAtMost: 3 },
      distribution: { mode: 'zipf', totalTriplets: 'auto', exponent: 0.5 },
      layering: {
        minZ: 0,
        maxZ: 2, maxStackPerCell: 3, layerShape: 'paramSweep',
        layerShapeOptions: {
          sweep: 'radius',
          minRadius: 1,
          maxRadius: null
        },
        interleavePlacement: false
      },
      batchVariation: {
        mode: 'sweep',
        variants: [
          { templateParams: { radiusX: 3, radiusY: 3 } },
          { templateParams: { radiusX: 3, radiusY: 4 } },
          { templateParams: { radiusX: 3, radiusY: 4 } },
          { templateParams: { radiusX: 3, radiusY: 5 } },
          { templateParams: { radiusX: 3, radiusY: 5 } }
        ]
      }
    },
    // Medium
    {
      "templateId": "heart",
      "templateParams": {
        "radius": 4,
        "thickness": 1
      },
      "count": 1,
      "tileTypeCount": 10,
      "solverConstraints": {
        "requireMinSlackAtMost": 1
      },
      "distribution": {
        "mode": "zipf",
        "totalTriplets": "auto",
        "exponent": 0.8
      },
      "layering": {
        "minZ": 0,
        "maxZ": 5,
        "maxStackPerCell": 4,
        "layerShape": "paramSweep",
        "layerShapeOptions": {
          "sweep": "radius",
          "minRadius": 1,
          "maxRadius": 4
        },
        "interleavePlacement": false
      }
    },
    {
      templateId: 'hexagon',
      templateParams: { radius: 4 },
      count: 3,
      tileTypeCount: 12,
      solverConstraints: { requireMinSlackAtMost: 1 },
      distribution: { mode: 'zipf', totalTriplets: 20, exponent: 0.9 },
      layering: { minZ: 0, maxZ: 6, maxStackPerCell: 4, layerShape: 'pyramid', layerShapeOptions: { pyramidMinNeighbors: 3 } }
    },
    {
      templateId: 'triangle',
      templateParams: { radius: 4 },
      count: 2,
      tileTypeCount: 12,
      solverConstraints: { requireMinSlackAtMost: 1 },
      distribution: { mode: 'zipf', totalTriplets: 21, exponent: 1.0 },
      layering: { minZ: 0, maxZ: 6, maxStackPerCell: 4, layerShape: 'shift', layerShapeOptions: { shiftDx: 1, shiftDy: 1 } }
    },
    // Hard: deeper stacks, 12 types, higher skew and pressure.
    {
      templateId: 'cross',
      /** Symmetric radius required when grid is omitted (arms come from resolveRadii). */
      templateParams: { radius: 4, thickness: 2 },
      maxGenerateAttempts: 2800,
      tileTypeCount: 12,
      solverConstraints: { requireMinSlackAtMost: 1 },
      distribution: { mode: 'zipf', totalTriplets: 'auto', exponent: 1.15 },
      layering: { minZ: 0, maxZ: 2,
        layerShape: 'paramSweep', layerShapeOptions: {
        sweep: 'thickness',
        minThickness: 1,
        maxThickness: null
      } },
      batchVariation: {
        mode: 'sweep',
        variants: [
          { layering: { maxZ: 1 } },
          { layering: { maxZ: 1 } },
          { layering: { maxZ: 2 } },
          { layering: { maxZ: 2 } },
          { layering: { maxZ: 2 } },
          { layering: { maxZ: 2 } }
        ]
      }
    },
    {
      templateId: 'ring',
      templateParams: { radius: 4, thickness: 2 },
      count: 3,
      maxGenerateAttempts: 3000,
      tileTypeCount: 12,
      solverConstraints: { requireMinSlackAtMost: 1 },
      distribution: { mode: 'zipf', totalTriplets: 24, exponent: 1.25 },
      layering: { minZ: 0, maxZ: 8, maxStackPerCell: 5, layerShape: 'paramSweep', layerShapeOptions: { sweep: 'thickness', minThickness: 1, maxThickness: null } }
    },
    {
      templateId: 't',
      templateParams: { radius: 5, thickness: 2 },
      count: 2,
      maxGenerateAttempts: 3200,
      tileTypeCount: 12,
      solverConstraints: { requireMinSlackAtMost: 1, requireMaxDifficultyRange: 0.5 },
      distribution: { mode: 'zipf', totalTriplets: 25, exponent: 1.45 },
      layering: {
        minZ: 0,
        maxZ: 6, maxStackPerCell: 6, layerShape: 'paramSweep',
        layerShapeOptions: { sweep: 'thickness', minThickness: 1, maxThickness: null },
        interleavePlacement: true
      }
    },
    {
      templateId: 'u',
      templateParams: { radius: 5, thickness: 2 },
      count: 2,
      maxGenerateAttempts: 3400,
      tileTypeCount: 12,
      solverConstraints: { requireMinSlackAtMost: 1, requireMaxDifficultyRange: 0.5 },
      distribution: { mode: 'zipf', totalTriplets: 21, exponent: 1.55 },
      layering: { minZ: 0, maxZ: 9, maxStackPerCell: 6, layerShape: 'paramSweep', layerShapeOptions: { sweep: 'thickness', minThickness: 1, maxThickness: null }, interleavePlacement: true }
    }
  ]
};
