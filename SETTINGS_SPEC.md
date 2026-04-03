# Settings dialog — short spec

## Goal

Reduce **top-bar chrome** by moving secondary controls into a single **Settings** dialog. Keep **level, restart, score**, **one** settings entry, and **all-sound (master) mute** visible at all times — it is **not** dialog-only.

**Shipped (current):** header `.audio-master-strip` exposes **`#audio-master-mute-toggle`** only ([`index.html`](index.html), [`game.js`](game.js)).

**Backlog:** **`#audio-master-volume`** — a single range scaling both buses on top of each channel slider (on large screens), persisted e.g. as `masterVolume` in `triplet_tiles_audio`. Until that ships, the always-visible row is **mute-only**; per-channel sliders remain the primary loudness controls ([AUDIO_DESIGN.md](AUDIO_DESIGN.md) mixer).

When / if **`triplet_tiles_ui.compactChrome`** drives layout, the master strip **must never** be hidden; only secondary chrome may collapse.

## Always-visible chrome

| Strip | Controls | Status |
| ----- | -------- | ------ |
| **Play / meta** | Level label + choose level, restart, score | Shipped |
| **Settings entry** | `#settings-open-button` (gear) | Shipped — opens dialog |
| **Master sound** | `#audio-master-mute-toggle` | Shipped — `audioSvc.setMasterMuted()` ([`lib/audio-service.js`](lib/audio-service.js)) |
| **Master sound** | `#audio-master-volume` | **Not shipped** — see backlog above |

**In Settings / compact-by-design:** full-screen (`#fullscreen-toggle`), install (`#install-app-button`), **per-channel** music + SFX (mute + range: `#music-mute-toggle`, `#music-volume`, `#sfx-mute-toggle`, `#sfx-volume`), haptics (`#haptics-toggle`). These are **not** duplicated in the header in the current UI.

## Entry point

- **Primary:** Settings button in `header.top-bar` (e.g. gear icon, `aria-label="Settings"`), placed in `.top-bar-right` near existing actions.
- **Keyboard:** Focusable; opens dialog on `Enter` / `Space`.
- **Do not** nest settings only inside level-select or end-of-level overlays.

## Information architecture (sections)

Max **three** topical groups inside the dialog body (scrollable if needed):

| Section        | Contents (v1) |
| -------------- | ---------------- |
| **Display**    | Full screen (`#fullscreen-toggle`), Install app (`#install-app-button`) when visible. Optional later: appearance / theme. |
| **Sound**      | **Per-channel only in the dialog:** music + volume (`#music-mute-toggle`, `#music-volume`), SFX + volume (`#sfx-mute-toggle`, `#sfx-volume`). **Do not** move master mute / master volume here as the only copy — they stay in the always-visible strip (above). Optional: duplicate master controls inside Settings for discoverability is allowed but not required. |
| **Feedback** | Vibration (`#haptics-toggle`) — same behavior as today (disabled with explanation when `vibrate` unsupported). |

Footer (sticky within panel): **Reset to defaults** (see below) + **Close**.

### Sound — master mute & master volume (product behavior)

- **Placement (shipped):** **Master mute** lives in **`.audio-master-strip`** in the **header**. Per-channel rows live **only** in the Settings dialog ([`index.html`](index.html)). There is **no** header `.audio-stack`; compact layout cannot yet hide per-channel header rows because they are not in the header.
- **Master mute — `#audio-master-mute-toggle`:** Phosphor `speaker-simple-high` / `speaker-simple-slash`; toggles both channels via `audioSvc.setMasterMuted()` ([`lib/audio-service.js`](lib/audio-service.js)).
- **“On” (audible) in UI:** `syncAudioUi()` treats the master control as “on” only when **both** music and SFX are unmuted **and** each channel volume is **`> 0`** ([`game.js`](game.js)). When master volume is added, extend this with **master `> 0`**.
- **Click when on:** mute both channels (`musicMuted` + `sfxMuted`). **Click when off:** unmute both. Per-channel toggles and sliders in Settings apply afterward; `syncAudioUi()` refreshes icons, `aria-pressed`, and slider disabled state (sliders disabled while their channel is muted).
- **Master volume — `#audio-master-volume` (backlog):** one range `0…1` (or `0…100`) scaling **both** outputs on top of each channel slider; persist `masterVolume` default `1` with backward-compatible loads. Place next to master mute in `.audio-master-strip`.

**Implementation note:** Master **volume** is specified for a future change; **master mute** satisfies the always-visible “all sound” control today.

## Persistence

| Data | Storage | Notes |
| ---- | ------- | ----- |
| Music / SFX / haptics | `localStorage` key **`triplet_tiles_audio`** | JSON via `createAudioService` ([`lib/audio-service.js`](lib/audio-service.js)). Defaults: music unmuted @ **0.55**, SFX unmuted @ **0.85**; haptics default follows `prefers-reduced-motion` (off when reduced motion). Master mute sets `musicMuted` and `sfxMuted` together (one save). **`masterVolume`:** reserve for future master slider (optional field, default `1`). |
| UI chrome layout | **`triplet_tiles_ui`** | JSON default `{ "compactChrome": true }` ([`game.js`](game.js)). **Reset to defaults** rewrites this key. Reading `compactChrome` to show/hide chrome is **not** wired yet — reserved for future layout modes. |
| Full screen | None required | Reflect real `fullscreenElement` / `display-mode` only. |

**Reset to defaults:** Call existing audio defaults (via service API or re-init pattern) **and** clear or rewrite `triplet_tiles_ui` to defaults; do **not** clear progression (`triplet_tiles_progression`, stats, powerups, session).

## Behavior

- **Open:** `showSettings()` ([`game.js`](game.js)) focuses **`#settings-close`** on the next frame; `setModalBackdropInert('settings')` sets **`inert`** on the app header, **`<main>`**, and the level-complete `#overlay` when present so background UI is non-interactive.
- **Close:** Close button, **Escape**, scrim click on `#settings-overlay`; **restore focus** to the element that opened Settings (`focusElementIfStillMounted(_focusBeforeSettings)`).
- **Tests:** Escape + inert while open for Settings — `tests/modal-a11y.spec.js` (`settings sets inert on header, main, and game overlay`). Full Tab focus trap is not asserted there; keep behavior consistent with other modals.
- **Reduced motion:** Prefer minimal or no motion for dialog transitions when styling allows.

## Presentation

- Reuse existing chrome tokens: scrim and panels per `--chrome-scrim`, `--chrome-panel-*`, `--chrome-line` in `style.css`.
- New markup: **separate** `id` for overlay root (e.g. `#settings-overlay`) so it never conflicts with `#overlay` (level complete) or `#level-select-overlay`.
- **Required attributes:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → visible **“Settings”** title.

## Implementation notes

- **IDs:** `game.js` binds by **`#music-mute-toggle`**, **`#music-volume`**, **`#sfx-mute-toggle`**, **`#sfx-volume`**, **`#haptics-toggle`** inside the dialog; **`#audio-master-mute-toggle`** stays in the header. **`#audio-master-volume`** is reserved in this spec for the future master slider.
- **Compact chrome (future):** If `compactChrome` ever hides header clusters, **never** hide `.audio-master-strip`. Today, per-channel audio is dialog-only, so there are no header per-channel rows to collapse.
- **Install button:** Keep logic that toggles `.hidden`; inside Settings **Display** section even when hidden until installable.

## Out of scope (v1)

- Theming / light–dark (ArchitectUX baseline — add when product wants it).
- Per-level difficulty or gameplay toggles.
- Migrating power-ups tray into Settings.

## Acceptance checklist

- [x] Settings reachable in ≤2 actions from play (gear in header).
- [x] Master mute (header) + per-channel music / SFX + haptics (Settings) wired to `audioSvc`; display mode + install in Settings.
- [x] Audio persists under `triplet_tiles_audio` only.
- [x] Escape closes Settings; inert on header/main/game overlay while open — `tests/modal-a11y.spec.js`. Focus returns to launcher on close.
- [ ] **`#audio-master-volume`** implemented, persisted, and covered by manual / automated checks.
- [ ] When **`compactChrome`** (or equivalent) hides other header UI, **master mute** (and future master volume) remain visible — **N/A** until compact layout reads `triplet_tiles_ui`.
