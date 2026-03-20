# Wooden skeuomorphic tile design — plan

Design-system-first plan for evolving **match-3-tiles** toward **wooden, skeuomorphic tiles** with a **small color palette**, aligned with [.impeccable.md](.impeccable.md) and implementation in [style.css](style.css) / [game.js](game.js).

## Goals

- **Tiles** read as small **wood blocks** (bevel, grain, depth), not flat gray pills.
- **Palette stays tight:** warm wood neutrals + **one** UI/accent hue for focus, hover, and match feedback.
- **Differentiation** between tile types stays primarily on **emoji** (see `TILE_TYPES` in `game.js`); optional subtle wood shifts only.
- **Performance:** prefer CSS gradients and at most **one** lightweight repeating asset (grain/noise); avoid heavy filters on every tile until validated on mobile.
- **Accessibility:** don’t rely on wood tint alone for state; keep strong **focus-visible** outlines, sufficient **text/contrast** on chrome, respect **`prefers-reduced-motion`**.

## Design tokens (foundation)

Add or map these in `:root` (alongside existing `--bg`, `--accent`, `--tile-size`, etc.):

| Token | Role |
|--------|------|
| `--wood-highlight` | Top-left catch light on tile face |
| `--wood-face` | Main plank body |
| `--wood-shadow` | Bottom-right body darkening |
| `--wood-edge` | 1px cut between face and bevel |
| `--wood-grain` | Low-contrast overlay (CSS or asset) |
| `--ink` | Symbol/emoji legibility on face (filter/shadow on glyph if needed) |
| `--accent-warm` | Single accent: hover ring, queued tile, tray match glow (can alias/replace current cyan if desired) |

**Chrome (top bar, tray, board)** should reuse the same **shadow/bevel vocabulary** so the whole scene feels like one physical set (table + routed tray + blocks).

## Tile skeuomorph (recipe)

Applied to `.tile` and `.tray-tile` in `style.css` (shared absolute radius via `--tile-corner-radius`, derived from `--tile-size`; tray pocket inner matches).

1. **Plank body** — Replace cool gray radial with a **linear gradient** (e.g. 125–135°): highlight → face → shadow.
2. **Micro-bevel** — Layer **inset** highlight (top-left) and **inset** shadow (bottom-right) plus existing **outer drop shadow**.
3. **Grain** — Phase 1: `repeating-linear-gradient` for faint “ring” lines. Phase 2 (optional): one **seamless** grain or noise image at low opacity as `background-image`.
4. **Per-type variation (optional)** — Small hue/lightness nudges to `--wood-face` per type (via `data-type` / class) without new saturated colors.

## Surrounding surfaces

- **Board (`.board`)** — Mat or **dark felt / paper** tone (desaturated, 1–2 steps from `--wood-shadow`) so it supports the blocks without a third rainbow theme.
- **Tray** — **Waxed groove** or deeper wood trough using the same edge tokens as the board; slot rings stay readable.
- **Overlays / modals** — Either warm-tinted panel matching wood chrome or keep dark glass but use the **same single accent** for buttons and focus.

## Component states

Map visuals to existing classes:

| State | Classes (current) | Direction |
|--------|---------------------|-----------|
| Hover / lift | `.tile.tappable:hover` | Stronger top highlight + **accent** ring (token-driven) |
| Queued / emphasis | `.tile.tile-queued` | Lift + accent rim; verify contrast on wood |
| Blocked | `.tile.blocked` | Desaturate wood + opacity; still distinct from tappable |
| Tray match / hints | `.tray-tile.matching`, `.tray-tile.selectable-type` | Use **same** `--accent-warm` as board tiles |

Ensure **keyboard focus** stays visible: extend `.tile.tappable:focus-visible` with outline using the accent token (not shadow alone).

## Implementation phases

1. **Phase A — Tokens** — **Done** in [`style.css`](style.css) `:root`: `--wood-*`, `--ink`, `--accent-warm`, `--accent-rgb`, and `--accent` / `--accent-soft` wired to them; interactive glows use `rgb(var(--accent-rgb) / …)`.
2. **Phase B — Tiles** — **Done** in [`style.css`](style.css): `.tile`, `.tray-tile`, and `.level-select-mini-tile` use `--tile-bg-plank`, `--tile-bg-grain`, bevel shadows (`--tile-inset-*`), and `--ink`; tray match/selectable states preserve depth + accent glow. Animations unchanged ([ANIMATIONS.md](ANIMATIONS.md)).
3. **Phase C — Board & tray** — **Done** in [`style.css`](style.css): `--board-felt*`, `--tray-rail*`, `--tray-pocket*` on `.board`, `.board::before`, `.tray-wrapper`, `.tray` slot tokens, `.tray-slot`; level carousel `.level-select-mini-wrap` matches playfield felt.
4. **Phase D — Chrome & overlays** — **Done** in [`style.css`](style.css): `--chrome-*` tokens; warm page shell (`body`), `.top-bar`, `.btn` / `.btn-ghost`, `.overlay` / `.overlay-content`, level-select scrim + panel + carousel chrome (`.carousel-nav`, `.level-select-card`).
5. **Phase E — QA** — Manual + tests in `tests/` (contrast, modals, mobile viewport); tune grain asset weight if added.

## Success criteria

- One **consistent** depth language (board + tray + tile).
- **Few hues:** wood family + one accent + existing semantic danger where needed.
- **Clarity** on a phone: tappable vs blocked, tray pressure, focus rings.
- No regression in **scroll/layout** or **animation** performance on mid-range mobile.

## Assets and tools

**You can ship Phase A–C with CSS only** (gradients + repeating lines). Optional assets:

| Need | Suggested tools | Output |
|------|-----------------|--------|
| Seamless wood grain / noise tile | **Figma** (noise plugin or texture + tile), **Affinity Photo**, **Photoshop**, **GIMP**, **Krita** | Small **PNG** or **WebP** (e.g. 128–256px tile), optimized |
| Procedural noise (no raster) | **SVG** `<filter>` with `feTurbulence` (export one SVG, reference from CSS) | `grain.svg` |
| Compression | **Squoosh** (web), **ImageOptim**, `sharp` CLI | Min file size for mobile |
| Color / contrast check | **WebAIM Contrast Checker**, **Stark** (Figma), browser DevTools | WCAG-oriented passes on UI text |
| Optional 3D reference renders | **Blender** | Reference only—not required for CSS-first approach |

**Not required** for the planned direction: full tile bitmap sets per type, sprite sheets, or game engines—unless you later choose painted tiles instead of emoji on wood.

---

**Status:** Planning document. Implementation tracked via phases above and design context in [.impeccable.md](.impeccable.md).
