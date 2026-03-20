/**
 * Shared layer diagonal offset and coverage (unit squares in cell space).
 * Odd z: half-cell along (+x, -y); even z: no extra offset.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TripletTileLayering = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  /** @param {number} z */
  function layerDiagonalFraction(z) {
    const zi = Math.floor(Number(z)) || 0;
    return zi % 2 === 1 ? 0.5 : 0;
  }

  /**
   * @param {{ x: number, y: number, z: number }} tile
   * @returns {{ cx: number, cy: number }}
   */
  function tileCenterInCells(tile) {
    const f = layerDiagonalFraction(tile.z);
    return {
      cx: tile.x + 0.5 + f,
      cy: tile.y + 0.5 - f
    };
  }

  /**
   * Unit squares (side 1) centered at c1, c2 overlap with positive area (strict < 1 on each axis delta).
   * @param {{ cx: number, cy: number }} c1
   * @param {{ cx: number, cy: number }} c2
   */
  function unitSquaresOverlap(c1, c2) {
    return Math.abs(c1.cx - c2.cx) < 1 && Math.abs(c1.cy - c2.cy) < 1;
  }

  /**
   * True if `other` is above `tile` and visually covers it (higher z, overlapping footprints).
   * @param {{ x: number, y: number, z: number }} other
   * @param {{ x: number, y: number, z: number }} tile
   */
  function tileCovers(other, tile) {
    if (other.z <= tile.z) return false;
    return unitSquaresOverlap(tileCenterInCells(other), tileCenterInCells(tile));
  }

  return {
    layerDiagonalFraction,
    tileCenterInCells,
    unitSquaresOverlap,
    tileCovers
  };
});
