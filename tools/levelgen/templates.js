function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Horizontal / vertical extents for silhouette generation.
 * - If `radius` is set (and neither radiusX nor radiusY), uses a symmetric footprint (legacy).
 * - Otherwise defaults scale with gridWidth / gridHeight so portrait grids (height > width)
 *   produce taller silhouettes instead of sizing everything by the shorter side only.
 */
function resolveRadii(params, gridWidth, gridHeight, defaults) {
  const p = params || {};
  const d = {
    scaleX: 0.35,
    scaleY: 0.35,
    minRx: 1,
    minRy: 1,
    ...defaults
  };
  if (p.radius != null && p.radiusX == null && p.radiusY == null) {
    const rr = Math.max(d.minRx, Math.max(d.minRy, p.radius));
    return { rx: rr, ry: rr };
  }
  const rx =
    p.radiusX != null
      ? Math.max(d.minRx, p.radiusX)
      : Math.max(d.minRx, Math.floor(gridWidth * d.scaleX));
  const ry =
    p.radiusY != null
      ? Math.max(d.minRy, p.radiusY)
      : Math.max(d.minRy, Math.floor(gridHeight * d.scaleY));
  return { rx, ry };
}

function keyXY(x, y) {
  return `${x},${y}`;
}

function uniqueCells(cells) {
  const seen = new Set();
  const out = [];
  for (const c of cells) {
    const k = keyXY(c.x, c.y);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

function inBounds(x, y, gridWidth, gridHeight) {
  return x >= 0 && y >= 0 && x < gridWidth && y < gridHeight;
}

function dilate(cells, gridWidth, gridHeight, steps) {
  let current = uniqueCells(cells);
  for (let s = 0; s < steps; s += 1) {
    const next = [];
    for (const { x, y } of current) {
      next.push({ x, y });
      next.push({ x: x + 1, y });
      next.push({ x: x - 1, y });
      next.push({ x, y: y + 1 });
      next.push({ x, y: y - 1 });
    }
    current = uniqueCells(next.filter(c => inBounds(c.x, c.y, gridWidth, gridHeight)));
  }
  return current;
}

function centeredToGrid(dx, dy, gridWidth, gridHeight) {
  const cx = Math.floor(gridWidth / 2);
  const cy = Math.floor(gridHeight / 2);
  return { x: cx + dx, y: cy + dy };
}

function rectangleTemplate({ width, height }, gridWidth, gridHeight) {
  const w = Math.max(1, width ?? Math.floor(gridWidth * 0.7));
  const h = Math.max(1, height ?? Math.floor(gridHeight * 0.7));
  const halfW = Math.floor(w / 2);
  const halfH = Math.floor(h / 2);
  const cells = [];
  for (let dy = -halfH; dy <= halfH; dy += 1) {
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      const { x, y } = centeredToGrid(dx, dy, gridWidth, gridHeight);
      if (inBounds(x, y, gridWidth, gridHeight)) cells.push({ x, y });
    }
  }
  return uniqueCells(cells);
}

function diamondTemplate({ radius, radiusX, radiusY }, gridWidth, gridHeight) {
  const { rx, ry } = resolveRadii(
    { radius, radiusX, radiusY },
    gridWidth,
    gridHeight,
    { scaleX: 0.35, scaleY: 0.35, minRx: 1, minRy: 1 }
  );
  const cells = [];
  for (let dy = -ry; dy <= ry; dy += 1) {
    for (let dx = -rx; dx <= rx; dx += 1) {
      // Manhattan ellipse: |dx|/rx + |dy|/ry <= 1  →  |dx|*ry + |dy|*rx <= rx*ry
      if (Math.abs(dx) * ry + Math.abs(dy) * rx <= rx * ry) {
        const { x, y } = centeredToGrid(dx, dy, gridWidth, gridHeight);
        if (inBounds(x, y, gridWidth, gridHeight)) cells.push({ x, y });
      }
    }
  }
  return uniqueCells(cells);
}

function circleTemplate({ radius, radiusX, radiusY }, gridWidth, gridHeight) {
  const { rx, ry } = resolveRadii(
    { radius, radiusX, radiusY },
    gridWidth,
    gridHeight,
    { scaleX: 0.35, scaleY: 0.35, minRx: 2, minRy: 2 }
  );
  const cells = [];
  for (let dy = -ry; dy <= ry; dy += 1) {
    for (let dx = -rx; dx <= rx; dx += 1) {
      const nx = rx > 0 ? dx / rx : 0;
      const ny = ry > 0 ? dy / ry : 0;
      if (nx * nx + ny * ny <= 1 + 1e-9) {
        const { x, y } = centeredToGrid(dx, dy, gridWidth, gridHeight);
        if (inBounds(x, y, gridWidth, gridHeight)) cells.push({ x, y });
      }
    }
  }
  return uniqueCells(cells);
}

function triangleTemplate({ radius, radiusX, radiusY }, gridWidth, gridHeight) {
  const { rx, ry } = resolveRadii(
    { radius, radiusX, radiusY },
    gridWidth,
    gridHeight,
    { scaleX: 0.35, scaleY: 0.35, minRx: 3, minRy: 3 }
  );
  const cells = [];
  // Isosceles triangle pointing up (apex at dy = -ry, base at dy = ry).
  for (let dy = -ry; dy <= ry; dy += 1) {
    const halfW = Math.max(0, Math.floor((rx * (dy + ry)) / Math.max(1, 2 * ry)));
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      const { x, y } = centeredToGrid(dx, dy, gridWidth, gridHeight);
      if (inBounds(x, y, gridWidth, gridHeight)) cells.push({ x, y });
    }
  }
  return uniqueCells(cells);
}

function hexagonTemplate({ radius, radiusX, radiusY }, gridWidth, gridHeight) {
  const { rx, ry } = resolveRadii(
    { radius, radiusX, radiusY },
    gridWidth,
    gridHeight,
    { scaleX: 0.3, scaleY: 0.3, minRx: 2, minRy: 2 }
  );
  const cells = [];
  // Axial hex approximation stretched to rx × ry (flat-top style).
  for (let dy = -ry; dy <= ry; dy += 1) {
    const span = Math.max(
      0,
      Math.floor(rx - (Math.abs(dy) * rx) / Math.max(1, 2 * ry))
    );
    for (let dx = -span; dx <= span; dx += 1) {
      const { x, y } = centeredToGrid(dx, dy, gridWidth, gridHeight);
      if (inBounds(x, y, gridWidth, gridHeight)) cells.push({ x, y });
    }
  }
  return uniqueCells(cells);
}

function crossTemplate({ radius, radiusX, radiusY, thickness }, gridWidth, gridHeight) {
  const { rx, ry } = resolveRadii(
    { radius, radiusX, radiusY },
    gridWidth,
    gridHeight,
    { scaleX: 0.35, scaleY: 0.35, minRx: 2, minRy: 2 }
  );
  const rBar = Math.min(rx, ry);
  const t = clamp(thickness == null ? 2 : thickness, 1, Math.max(1, Math.floor(rBar / 2) + 1));
  const half = Math.floor(t / 2);
  const cells = [];
  for (let dy = -ry; dy <= ry; dy += 1) {
    for (let dx = -rx; dx <= rx; dx += 1) {
      const inVertical = Math.abs(dx) <= half && Math.abs(dy) <= ry;
      const inHorizontal = Math.abs(dy) <= half && Math.abs(dx) <= rx;
      if (!inVertical && !inHorizontal) continue;
      const { x, y } = centeredToGrid(dx, dy, gridWidth, gridHeight);
      if (inBounds(x, y, gridWidth, gridHeight)) cells.push({ x, y });
    }
  }
  return uniqueCells(cells);
}

function ringTemplate({ radius, radiusX, radiusY, thickness }, gridWidth, gridHeight) {
  const { rx, ry } = resolveRadii(
    { radius, radiusX, radiusY },
    gridWidth,
    gridHeight,
    { scaleX: 0.35, scaleY: 0.35, minRx: 3, minRy: 3 }
  );
  const rEff = Math.min(rx, ry);
  const w = clamp(thickness == null ? 2 : thickness, 1, Math.max(1, rEff - 1));
  const innerRx = Math.max(1, rx - w);
  const innerRy = Math.max(1, ry - w);
  const cells = [];
  for (let dy = -ry; dy <= ry; dy += 1) {
    for (let dx = -rx; dx <= rx; dx += 1) {
      const nx = rx > 0 ? dx / rx : 0;
      const ny = ry > 0 ? dy / ry : 0;
      const out = nx * nx + ny * ny <= 1 + 1e-9;
      const ix = innerRx > 0 ? dx / innerRx : 0;
      const iy = innerRy > 0 ? dy / innerRy : 0;
      const inn = ix * ix + iy * iy < 1 - 1e-9;
      if (!out || inn) continue;
      const { x, y } = centeredToGrid(dx, dy, gridWidth, gridHeight);
      if (inBounds(x, y, gridWidth, gridHeight)) cells.push({ x, y });
    }
  }
  return uniqueCells(cells);
}

function tTemplate({ radius, radiusX, radiusY, thickness }, gridWidth, gridHeight) {
  const { rx, ry } = resolveRadii(
    { radius, radiusX, radiusY },
    gridWidth,
    gridHeight,
    { scaleX: 0.4, scaleY: 0.4, minRx: 3, minRy: 3 }
  );
  const rBar = Math.min(rx, ry);
  const t = clamp(thickness == null ? 2 : thickness, 1, Math.max(1, Math.floor(rBar / 2) + 1));
  const half = Math.floor(t / 2);
  const cells = [];
  for (let dy = -ry; dy <= ry; dy += 1) {
    for (let dx = -rx; dx <= rx; dx += 1) {
      const inTopBar = dy <= -ry + t && Math.abs(dx) <= rx;
      const inStem = Math.abs(dx) <= half && dy >= -ry + t && dy <= ry;
      if (!inTopBar && !inStem) continue;
      const { x, y } = centeredToGrid(dx, dy, gridWidth, gridHeight);
      if (inBounds(x, y, gridWidth, gridHeight)) cells.push({ x, y });
    }
  }
  return uniqueCells(cells);
}

function uTemplate({ radius, radiusX, radiusY, thickness }, gridWidth, gridHeight) {
  const { rx, ry } = resolveRadii(
    { radius, radiusX, radiusY },
    gridWidth,
    gridHeight,
    { scaleX: 0.4, scaleY: 0.4, minRx: 3, minRy: 3 }
  );
  const rBar = Math.min(rx, ry);
  const t = clamp(thickness == null ? 2 : thickness, 1, Math.max(1, Math.floor(rBar / 2) + 1));
  const cells = [];
  for (let dy = -ry; dy <= ry; dy += 1) {
    for (let dx = -rx; dx <= rx; dx += 1) {
      const inLeft = dx >= -rx && dx <= -rx + t - 1 && dy <= ry && dy >= -ry;
      const inRight = dx <= rx && dx >= rx - t + 1 && dy <= ry && dy >= -ry;
      const inBottom = dy >= ry - t + 1 && dy <= ry && Math.abs(dx) <= rx;
      if (!inLeft && !inRight && !inBottom) continue;
      const { x, y } = centeredToGrid(dx, dy, gridWidth, gridHeight);
      if (inBounds(x, y, gridWidth, gridHeight)) cells.push({ x, y });
    }
  }
  return uniqueCells(cells);
}

function heartTemplate({ radius, radiusX, radiusY, thickness }, gridWidth, gridHeight) {
  const { rx, ry } = resolveRadii(
    { radius, radiusX, radiusY },
    gridWidth,
    gridHeight,
    { scaleX: 0.35, scaleY: 0.35, minRx: 3, minRy: 3 }
  );
  const cells = [];
  // Sample a heart implicit curve on a grid; scale to an axis-aligned ellipse in [-1.5,1.5]^2.
  for (let dy = -ry; dy <= ry; dy += 1) {
    for (let dx = -rx; dx <= rx; dx += 1) {
      const x = rx > 0 ? (dx / rx) * 1.5 : 0;
      const y = ry > 0 ? (dy / ry) * 1.5 : 0;
      const a = x * x + y * y - 1;
      const inside = a * a * a - x * x * y * y * y <= 0;
      if (!inside) continue;
      const { x: gx, y: gy } = centeredToGrid(dx, dy, gridWidth, gridHeight);
      if (inBounds(gx, gy, gridWidth, gridHeight)) cells.push({ x: gx, y: gy });
    }
  }

  const t = clamp(thickness == null ? 1 : thickness, 0, 4);
  return t > 0 ? dilate(cells, gridWidth, gridHeight, t - 1) : uniqueCells(cells);
}

function spiralTemplate({ radius, radiusX, radiusY, thickness }, gridWidth, gridHeight) {
  const { rx, ry } = resolveRadii(
    { radius, radiusX, radiusY },
    gridWidth,
    gridHeight,
    { scaleX: 0.4, scaleY: 0.4, minRx: 3, minRy: 3 }
  );
  const t = clamp(thickness == null ? 1 : thickness, 1, 4);

  // Rectangular spiral: alternate horizontal / vertical run lengths (matches square when rx === ry).
  const cells = [];
  let x = -rx;
  let y = -ry;
  let dx = 1;
  let dy = 0;
  let hLen = 2 * rx;
  let vLen = 2 * ry;
  let segLen = hLen;
  let segsDone = 0;
  let stepsLeft = (2 * rx + 1) * (2 * ry + 1) * 4;

  while (stepsLeft > 0 && segLen > 0 && hLen >= 0 && vLen >= 0) {
    for (let i = 0; i < segLen; i += 1) {
      const { x: gx, y: gy } = centeredToGrid(x, y, gridWidth, gridHeight);
      if (inBounds(gx, gy, gridWidth, gridHeight)) cells.push({ x: gx, y: gy });
      x += dx;
      y += dy;
      stepsLeft -= 1;
      if (stepsLeft <= 0) break;
    }

    if (stepsLeft <= 0) break;
    // Rotate direction: right -> down -> left -> up
    if (dx === 1 && dy === 0) {
      dx = 0;
      dy = 1;
    } else if (dx === 0 && dy === 1) {
      dx = -1;
      dy = 0;
    } else if (dx === -1 && dy === 0) {
      dx = 0;
      dy = -1;
    } else {
      dx = 1;
      dy = 0;
    }

    segsDone += 1;
    if (segsDone % 2 === 0) {
      hLen -= 1;
      vLen -= 1;
    }
    segLen = segsDone % 2 === 1 ? vLen : hLen;
  }

  return dilate(uniqueCells(cells), gridWidth, gridHeight, t - 1);
}

function letterTemplate({ letter, radius, radiusX, radiusY, thickness }, gridWidth, gridHeight) {
  const ch = String(letter || 'S').toUpperCase();
  const { rx, ry } = resolveRadii(
    { radius, radiusX, radiusY },
    gridWidth,
    gridHeight,
    { scaleX: 0.45, scaleY: 0.45, minRx: 4, minRy: 4 }
  );
  const t = clamp(thickness == null ? 2 : thickness, 1, 4);

  const cells = [];
  // Instead of using dilation (which would tend to fill in S/C openings),
  // explicitly thicken the bars in the perpendicular direction.
  const thick = t; // tiles
  const half = Math.floor((thick - 1) / 2);
  const extra = thick - half - 1; // keeps total thickness = `thick`

  const addBarH = (y, x0, x1) => {
    for (let yy = y - half; yy <= y + extra; yy += 1) {
      for (let dx = x0; dx <= x1; dx += 1) {
        const { x, y: gy } = centeredToGrid(dx, yy, gridWidth, gridHeight);
        if (inBounds(x, gy, gridWidth, gridHeight)) cells.push({ x, y: gy });
      }
    }
  };
  const addBarV = (x, y0, y1) => {
    for (let xx = x - half; xx <= x + extra; xx += 1) {
      for (let dy = y0; dy <= y1; dy += 1) {
        const { x: gx, y } = centeredToGrid(xx, dy, gridWidth, gridHeight);
        if (inBounds(gx, y, gridWidth, gridHeight)) cells.push({ x: gx, y });
      }
    }
  };

  if (ch === 'S') {
    // S shape: top curve (top bar + left vertical), mid bar, bottom curve (right vertical + bottom bar).
    const left = -Math.floor(rx * 0.6);
    const right = Math.floor(rx * 0.6);
    const top = -ry;
    const mid = 0;
    const bottom = ry;

    addBarH(top, left, right);
    addBarH(mid, left, right);
    addBarH(bottom, left, right);
    addBarV(left, top, mid);
    addBarV(right, mid, bottom);
  } else if (ch === 'C') {
    const left = -Math.floor(rx * 0.6);
    const right = Math.floor(rx * 0.4);
    const top = -Math.floor(ry * 0.6);
    const bottom = Math.floor(ry * 0.6);
    addBarH(top, left, right);
    addBarH(bottom, left, right);
    addBarV(left, top, bottom);
  } else {
    // Fallback: diamond-like glyph.
    return dilate(
      diamondTemplate({ radius: Math.floor(Math.min(rx, ry) * 0.6) }, gridWidth, gridHeight),
      gridWidth,
      gridHeight,
      t - 1
    );
  }

  // Note: we don't use dilation for letters because it fills in S/C openings.
  return uniqueCells(cells);
}

function getTemplateCells(templateId, templateParams, gridWidth, gridHeight) {
  const id = String(templateId || '').toLowerCase();
  const params = templateParams || {};
  if (
    !Number.isInteger(gridWidth) ||
    !Number.isInteger(gridHeight) ||
    gridWidth < 5 ||
    gridHeight < 5
  ) {
    throw new Error(
      `gridWidth and gridHeight must be integers >= 5 (got ${gridWidth}×${gridHeight})`
    );
  }

  switch (id) {
    case 'rectangle':
      return rectangleTemplate(params, gridWidth, gridHeight);
    case 'diamond':
      return diamondTemplate(params, gridWidth, gridHeight);
    case 'circle':
      return circleTemplate(params, gridWidth, gridHeight);
    case 'triangle':
      return triangleTemplate(params, gridWidth, gridHeight);
    case 'hexagon':
      return hexagonTemplate(params, gridWidth, gridHeight);
    case 'cross':
      return crossTemplate(params, gridWidth, gridHeight);
    case 'ring':
      return ringTemplate(params, gridWidth, gridHeight);
    case 't':
      return tTemplate(params, gridWidth, gridHeight);
    case 'u':
      return uTemplate(params, gridWidth, gridHeight);
    case 'heart':
      return heartTemplate(params, gridWidth, gridHeight);
    case 'spiral':
      return spiralTemplate(params, gridWidth, gridHeight);
    case 'letter':
      return letterTemplate(params, gridWidth, gridHeight);
    default:
      throw new Error(`Unknown templateId "${templateId}"`);
  }
}

module.exports = {
  getTemplateCells
};

