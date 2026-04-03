/**
 * Full-screen “star wash” for level complete (canvas 2D, mobile-oriented).
 * @module
 */

const DURATION_MS = 2200;
const DPR_CAP = 2;
/** Outer radius (px); diameter = 2× → 10–20px span. */
const STAR_R_OUT_MIN = 5;
const STAR_R_OUT_MAX = 10;
const STAR_INNER_RATIO = 0.42;

let _raf = 0;
let _canvas = /** @type {HTMLCanvasElement | null} */ (null);
let _stars = /** @type {ReturnType<typeof buildStars> | null} */ (null);
let _cssW = 0;
let _cssH = 0;
let _t0 = 0;
let _onResize = /** @type {(() => void) | null} */ (null);

/**
 * @param {number} w
 * @param {number} h
 */
function buildStars(w, h) {
  const area = w * h;
  const count = Math.min(100, Math.max(36, Math.floor(area / 42000)));
  return {
    count,
    xs: new Float32Array(count),
    baseY: new Float32Array(count),
    vy: new Float32Array(count),
    phase: new Float32Array(count),
    /** Outer radius in CSS px (diameter 10–20). */
    outerR: new Float32Array(count),
    /** 5 or 6 pointed star. */
    points: new Uint8Array(count),
    rot: new Float32Array(count)
  };
}

/**
 * @param {Float32Array} arr
 */
function fillRandom01(arr) {
  for (let i = 0; i < arr.length; i++) arr[i] = Math.random();
}

/**
 * @param {HTMLCanvasElement} canvas
 */
function syncCanvasSize(canvas) {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, DPR_CAP);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, cssW: w, cssH: h };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} outerR
 * @param {number} numPoints 5 or 6
 * @param {number} rotation
 */
function fillStarPath(ctx, cx, cy, outerR, numPoints, rotation) {
  const innerR = outerR * STAR_INNER_RATIO;
  const step = Math.PI / numPoints;
  ctx.beginPath();
  for (let i = 0; i < 2 * numPoints; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = rotation - Math.PI / 2 + i * step;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function frame(now) {
  const canvas = _canvas;
  const pack = _stars;
  if (!canvas || !pack) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const t = now - _t0;
  const w = _cssW;
  const h = _cssH;
  if (w < 1 || h < 1) {
    _raf = requestAnimationFrame(frame);
    return;
  }

  ctx.clearRect(0, 0, w, h);

  if (t >= DURATION_MS) {
    stopWinStarFx();
    return;
  }

  const waveY = -h * 0.12 + (t / DURATION_MS) * h * 1.28;

  const { count, xs, baseY, vy, phase, outerR, points, rot } = pack;
  ctx.fillStyle = '#fff8e8';
  for (let i = 0; i < count; i++) {
    let sy = baseY[i] + t * 0.038 * vy[i];
    sy = ((sy % (h + 48)) + h + 48) % (h + 48) - 24;

    const band = Math.exp(-(((sy - waveY) / 92) ** 2));
    const tw = 0.52 + 0.48 * Math.sin(t * 0.0068 + phase[i]);
    const alpha = band * tw;
    if (alpha < 0.018) continue;

    ctx.globalAlpha = Math.min(1, alpha);
    const np = points[i];
    fillStarPath(ctx, xs[i], sy, outerR[i], np, rot[i]);
  }
  ctx.globalAlpha = 1;

  _raf = requestAnimationFrame(frame);
}

/**
 * @param {HTMLCanvasElement | null} canvas
 */
export function startWinStarFx(canvas) {
  stopWinStarFx();
  if (!canvas) return;

  const sized = syncCanvasSize(canvas);
  if (!sized) return;

  _canvas = canvas;
  _cssW = sized.cssW;
  _cssH = sized.cssH;

  _stars = buildStars(_cssW, _cssH);
  fillRandom01(_stars.xs);
  for (let i = 0; i < _stars.count; i++) {
    _stars.xs[i] *= _cssW;
    _stars.baseY[i] = Math.random() * _cssH;
    _stars.vy[i] = 0.2 + Math.random() * 0.45;
    _stars.phase[i] = Math.random() * Math.PI * 2;
    _stars.outerR[i] = STAR_R_OUT_MIN + Math.random() * (STAR_R_OUT_MAX - STAR_R_OUT_MIN);
    _stars.points[i] = Math.random() < 0.5 ? 5 : 6;
    _stars.rot[i] = Math.random() * Math.PI * 2;
  }

  _t0 = typeof performance !== 'undefined' ? performance.now() : 0;

  if (!_onResize) {
    _onResize = () => {
      if (!_canvas || !_stars) return;
      const next = syncCanvasSize(_canvas);
      if (!next) return;
      const dimChanged = next.cssW !== _cssW || next.cssH !== _cssH;
      _cssW = next.cssW;
      _cssH = next.cssH;
      if (dimChanged) {
        _stars = buildStars(_cssW, _cssH);
        fillRandom01(_stars.xs);
        for (let i = 0; i < _stars.count; i++) {
          _stars.xs[i] *= _cssW;
          _stars.baseY[i] = Math.random() * _cssH;
          _stars.vy[i] = 0.2 + Math.random() * 0.45;
          _stars.phase[i] = Math.random() * Math.PI * 2;
          _stars.outerR[i] = STAR_R_OUT_MIN + Math.random() * (STAR_R_OUT_MAX - STAR_R_OUT_MIN);
          _stars.points[i] = Math.random() < 0.5 ? 5 : 6;
          _stars.rot[i] = Math.random() * Math.PI * 2;
        }
      }
    };
    window.addEventListener('resize', _onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', _onResize);
    }
  }

  _raf = requestAnimationFrame(frame);
}

export function stopWinStarFx() {
  if (_raf) {
    cancelAnimationFrame(_raf);
    _raf = 0;
  }
  if (_onResize) {
    window.removeEventListener('resize', _onResize);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', _onResize);
    }
    _onResize = null;
  }
  if (_canvas) {
    const ctx = _canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    }
  }
  _canvas = null;
  _stars = null;
  _cssW = 0;
  _cssH = 0;
}
