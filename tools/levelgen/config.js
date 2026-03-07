/**
 * Level generator configuration.
 *
 * This is a JS file (not JSON) so we can add helper constants and comments
 * without complicating parsing. The generator CLI imports this module.
 *
 * Schema (high-level):
 * - seed: number
 * - output:
 *   - outFile: string (path relative to project root)
 *   - includeSolverStats: boolean
 * - levels: array of level “batches”
 *   - batch fields:
 *     - templateId: string
 *     - templateParams: object (template-specific)
 *     - gridSize: number (odd-ish recommended; must match template output range)
 *     - count: number (how many levels to generate for this batch)
 *     - tileTypes: string[] (must exist in game’s TILE_TYPES ids)
 *     - distribution:
 *       - mode: "explicitCounts" | "weightedTriplets"
 *       - explicitCounts: { [typeId]: number } (each multiple of 3)
 *         OR
 *       - totalTriplets: number (totalTiles = totalTriplets*3)
 *       - weights: { [typeId]: number } (relative weights; generator will round to multiples of 3)
 *     - layering:
 *       - minZ: number (usually 0)
 *       - maxZ: number (inclusive)
 *       - overlap: "light" | "medium" | "heavy"
 *       - maxStackPerCell: number
 */
module.exports = {
  seed: 1337,
  output: {
    outFile: 'levels.generated.js',
    includeSolverStats: false
  },
  levels: [
    // Early, easy: 2 layers, light overlap, few types, many alternative paths.
    {
      templateId: 'heart',
      templateParams: { radius: 4, thickness: 2 },
      gridSize: 11,
      count: 40,
      tileTypes: ['leaf', 'flower', 'clover', 'star'],
      distribution: {
        mode: 'weightedTriplets',
        totalTriplets: 30,
        weights: { leaf: 4, flower: 4, clover: 3, star: 2 }
      },
      layering: {
        minZ: 0,
        maxZ: 2,
        overlap: 'light',
        maxStackPerCell: 3
      }
    },
    // Mid: more types and deeper stacks.
    {
      templateId: 'spiral',
      templateParams: { radius: 5, thickness: 1 },
      gridSize: 13,
      count: 40,
      tileTypes: ['leaf', 'flower', 'clover', 'star', 'acorn'],
      distribution: {
        mode: 'weightedTriplets',
        totalTriplets: 36,
        weights: { leaf: 4, flower: 4, clover: 4, star: 3, acorn: 3 }
      },
      layering: {
        minZ: 0,
        maxZ: 2,
        overlap: 'medium',
        maxStackPerCell: 3
      }
    },
    // Late: more types, heavier overlap.
    {
      templateId: 'letter',
      templateParams: { letter: 'S', radius: 6, thickness: 2 },
      gridSize: 15,
      count: 40,
      tileTypes: ['leaf', 'flower', 'clover', 'star', 'acorn', 'mushroom'],
      distribution: {
        mode: 'weightedTriplets',
        totalTriplets: 42,
        weights: { leaf: 4, flower: 4, clover: 4, star: 4, acorn: 3, mushroom: 3 }
      },
      layering: {
        minZ: 0,
        maxZ: 3,
        overlap: 'heavy',
        maxStackPerCell: 4
      }
    }
  ]
};

