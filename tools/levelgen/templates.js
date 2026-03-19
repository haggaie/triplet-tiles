function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
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

function inBounds(x, y, gridSize) {
  return x >= 0 && y >= 0 && x < gridSize && y < gridSize;
}

function dilate(cells, gridSize, steps) {
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
    current = uniqueCells(next.filter(c => inBounds(c.x, c.y, gridSize)));
  }
  return current;
}

function centeredToGrid(dx, dy, gridSize) {
  const cx = Math.floor(gridSize / 2);
  const cy = Math.floor(gridSize / 2);
  return { x: cx + dx, y: cy + dy };
}

function rectangleTemplate({ width, height }, gridSize) {
  const w = Math.max(1, width || Math.floor(gridSize * 0.7));
  const h = Math.max(1, height || Math.floor(gridSize * 0.7));
  const halfW = Math.floor(w / 2);
  const halfH = Math.floor(h / 2);
  const cells = [];
  for (let dy = -halfH; dy <= halfH; dy += 1) {
    for (let dx = -halfW; dx <= halfW; dx += 1) {
      const { x, y } = centeredToGrid(dx, dy, gridSize);
      if (inBounds(x, y, gridSize)) cells.push({ x, y });
    }
  }
  return uniqueCells(cells);
}

function diamondTemplate({ radius }, gridSize) {
  const r = Math.max(1, radius || Math.floor(gridSize * 0.35));
  const cells = [];
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      if (Math.abs(dx) + Math.abs(dy) <= r) {
        const { x, y } = centeredToGrid(dx, dy, gridSize);
        if (inBounds(x, y, gridSize)) cells.push({ x, y });
      }
    }
  }
  return uniqueCells(cells);
}

function circleTemplate({ radius }, gridSize) {
  const r = Math.max(2, radius || Math.floor(gridSize * 0.35));
  const cells = [];
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      if ((dx * dx) + (dy * dy) <= (r * r)) {
        const { x, y } = centeredToGrid(dx, dy, gridSize);
        if (inBounds(x, y, gridSize)) cells.push({ x, y });
      }
    }
  }
  return uniqueCells(cells);
}

function triangleTemplate({ radius }, gridSize) {
  const r = Math.max(3, radius || Math.floor(gridSize * 0.35));
  const cells = [];
  // Isosceles triangle pointing up; regular and easy to represent on grid.
  for (let dy = -r; dy <= r; dy += 1) {
    const width = Math.max(0, Math.floor(((dy + r) / Math.max(1, 2 * r)) * (2 * r)));
    for (let dx = -width; dx <= width; dx += 1) {
      const { x, y } = centeredToGrid(dx, dy, gridSize);
      if (inBounds(x, y, gridSize)) cells.push({ x, y });
    }
  }
  return uniqueCells(cells);
}

function hexagonTemplate({ radius }, gridSize) {
  const r = Math.max(2, radius || Math.floor(gridSize * 0.3));
  const cells = [];
  // Axial hex approximation on integer lattice.
  for (let dy = -r; dy <= r; dy += 1) {
    const span = r - Math.floor(Math.abs(dy) / 2);
    for (let dx = -span; dx <= span; dx += 1) {
      const { x, y } = centeredToGrid(dx, dy, gridSize);
      if (inBounds(x, y, gridSize)) cells.push({ x, y });
    }
  }
  return uniqueCells(cells);
}

function crossTemplate({ radius, thickness }, gridSize) {
  const r = Math.max(2, radius || Math.floor(gridSize * 0.35));
  const t = clamp(thickness == null ? 2 : thickness, 1, Math.max(1, Math.floor(r / 2) + 1));
  const half = Math.floor(t / 2);
  const cells = [];
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const inVertical = Math.abs(dx) <= half;
      const inHorizontal = Math.abs(dy) <= half;
      if (!inVertical && !inHorizontal) continue;
      const { x, y } = centeredToGrid(dx, dy, gridSize);
      if (inBounds(x, y, gridSize)) cells.push({ x, y });
    }
  }
  return uniqueCells(cells);
}

function ringTemplate({ radius, thickness }, gridSize) {
  const r = Math.max(3, radius || Math.floor(gridSize * 0.35));
  const w = clamp(thickness == null ? 2 : thickness, 1, Math.max(1, r - 1));
  const inner = Math.max(1, r - w);
  const cells = [];
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const d2 = (dx * dx) + (dy * dy);
      if (d2 > (r * r)) continue;
      if (d2 < (inner * inner)) continue;
      const { x, y } = centeredToGrid(dx, dy, gridSize);
      if (inBounds(x, y, gridSize)) cells.push({ x, y });
    }
  }
  return uniqueCells(cells);
}

function tTemplate({ radius, thickness }, gridSize) {
  const r = Math.max(3, radius || Math.floor(gridSize * 0.4));
  const t = clamp(thickness == null ? 2 : thickness, 1, Math.max(1, Math.floor(r / 2) + 1));
  const half = Math.floor(t / 2);
  const cells = [];
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const inTopBar = dy <= -r + t && Math.abs(dx) <= r;
      const inStem = Math.abs(dx) <= half && dy >= -r + t && dy <= r;
      if (!inTopBar && !inStem) continue;
      const { x, y } = centeredToGrid(dx, dy, gridSize);
      if (inBounds(x, y, gridSize)) cells.push({ x, y });
    }
  }
  return uniqueCells(cells);
}

function uTemplate({ radius, thickness }, gridSize) {
  const r = Math.max(3, radius || Math.floor(gridSize * 0.4));
  const t = clamp(thickness == null ? 2 : thickness, 1, Math.max(1, Math.floor(r / 2) + 1));
  const cells = [];
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const inLeft = dx >= -r && dx <= (-r + t - 1) && dy <= r && dy >= -r;
      const inRight = dx <= r && dx >= (r - t + 1) && dy <= r && dy >= -r;
      const inBottom = dy >= (r - t + 1) && dy <= r && Math.abs(dx) <= r;
      if (!inLeft && !inRight && !inBottom) continue;
      const { x, y } = centeredToGrid(dx, dy, gridSize);
      if (inBounds(x, y, gridSize)) cells.push({ x, y });
    }
  }
  return uniqueCells(cells);
}

function heartTemplate({ radius, thickness }, gridSize) {
  const r = Math.max(3, radius || Math.floor(gridSize * 0.35));
  const cells = [];
  // Sample a heart implicit curve on a grid. Scale coordinates into [-1.5, 1.5].
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const x = (dx / r) * 1.5;
      const y = (dy / r) * 1.5;
      const a = x * x + y * y - 1;
      const inside = a * a * a - x * x * y * y * y <= 0;
      if (!inside) continue;
      const { x: gx, y: gy } = centeredToGrid(dx, dy, gridSize);
      if (inBounds(gx, gy, gridSize)) cells.push({ x: gx, y: gy });
    }
  }

  const t = clamp(thickness == null ? 1 : thickness, 0, 4);
  return t > 0 ? dilate(cells, gridSize, t - 1) : uniqueCells(cells);
}

function spiralTemplate({ radius, thickness }, gridSize) {
  const r = Math.max(3, radius || Math.floor(gridSize * 0.4));
  const t = clamp(thickness == null ? 1 : thickness, 1, 4);

  // Build an inward spiral path using integer steps.
  const cells = [];
  let x = -r;
  let y = -r;
  let dx = 1;
  let dy = 0;
  let segLen = 2 * r;
  let segPassed = 0;
  let segsDone = 0;
  let stepsLeft = (2 * r + 1) * (2 * r + 1) * 2;

  while (stepsLeft > 0 && segLen > 0) {
    for (let i = 0; i < segLen; i += 1) {
      const { x: gx, y: gy } = centeredToGrid(x, y, gridSize);
      if (inBounds(gx, gy, gridSize)) cells.push({ x: gx, y: gy });
      x += dx;
      y += dy;
      stepsLeft -= 1;
      if (stepsLeft <= 0) break;
    }

    segPassed += 1;
    // Rotate direction: right -> down -> left -> up
    if (dx === 1 && dy === 0) {
      dx = 0; dy = 1;
    } else if (dx === 0 && dy === 1) {
      dx = -1; dy = 0;
    } else if (dx === -1 && dy === 0) {
      dx = 0; dy = -1;
    } else {
      dx = 1; dy = 0;
    }

    segsDone += 1;
    if (segsDone % 2 === 0) {
      segLen -= 1;
    }
  }

  return dilate(uniqueCells(cells), gridSize, t - 1);
}

function letterTemplate({ letter, radius, thickness }, gridSize) {
  const ch = String(letter || 'S').toUpperCase();
  const r = Math.max(4, radius || Math.floor(gridSize * 0.45));
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
        const { x, y: gy } = centeredToGrid(dx, yy, gridSize);
        if (inBounds(x, gy, gridSize)) cells.push({ x, y: gy });
      }
    }
  };
  const addBarV = (x, y0, y1) => {
    for (let xx = x - half; xx <= x + extra; xx += 1) {
      for (let dy = y0; dy <= y1; dy += 1) {
        const { x: gx, y } = centeredToGrid(xx, dy, gridSize);
        if (inBounds(gx, y, gridSize)) cells.push({ x: gx, y });
      }
    }
  };

  if (ch === 'S') {
    // S shape: top curve (top bar + left vertical), mid bar, bottom curve (right vertical + bottom bar).
    // Use full radius for height so the two openings stay visible; keep width slightly narrower.
    const left = -Math.floor(r * 0.6);
    const right = Math.floor(r * 0.6);
    const top = -r;
    const mid = 0;
    const bottom = r;

    addBarH(top, left, right);
    addBarH(mid, left, right);
    addBarH(bottom, left, right);
    addBarV(left, top, mid);
    addBarV(right, mid, bottom);
  } else if (ch === 'C') {
    const left = -Math.floor(r * 0.6);
    const right = Math.floor(r * 0.4);
    const top = -Math.floor(r * 0.6);
    const bottom = Math.floor(r * 0.6);
    addBarH(top, left, right);
    addBarH(bottom, left, right);
    addBarV(left, top, bottom);
  } else {
    // Fallback: diamond-like glyph.
    return dilate(diamondTemplate({ radius: Math.floor(r * 0.6) }, gridSize), gridSize, t - 1);
  }

  // Note: we don't use dilation for letters because it fills in S/C openings.
  return uniqueCells(cells);
}

function getTemplateCells(templateId, templateParams, gridSize) {
  const id = String(templateId || '').toLowerCase();
  const params = templateParams || {};
  if (!Number.isInteger(gridSize) || gridSize < 5) {
    throw new Error(`gridSize must be an integer >= 5 (got ${gridSize})`);
  }

  switch (id) {
    case 'rectangle':
      return rectangleTemplate(params, gridSize);
    case 'diamond':
      return diamondTemplate(params, gridSize);
    case 'circle':
      return circleTemplate(params, gridSize);
    case 'triangle':
      return triangleTemplate(params, gridSize);
    case 'hexagon':
      return hexagonTemplate(params, gridSize);
    case 'cross':
      return crossTemplate(params, gridSize);
    case 'ring':
      return ringTemplate(params, gridSize);
    case 't':
      return tTemplate(params, gridSize);
    case 'u':
      return uTemplate(params, gridSize);
    case 'heart':
      return heartTemplate(params, gridSize);
    case 'spiral':
      return spiralTemplate(params, gridSize);
    case 'letter':
      return letterTemplate(params, gridSize);
    default:
      throw new Error(`Unknown templateId "${templateId}"`);
  }
}

module.exports = {
  getTemplateCells
};

