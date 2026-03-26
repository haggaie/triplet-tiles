# Settings dialog — short spec

## Goal

Reduce **top-bar chrome** by moving secondary controls into a single **Settings** dialog. Keep **level, restart, score**, **one** settings entry, and **master sound** (quick mute + **master volume**) visible at all times — they are **not** dialog-only and **must not** be hidden when `compactChrome` (or equivalent) collapses the rest of the audio UI.

## Always-visible chrome

| Strip | Controls | Notes |
| ----- | -------- | ----- |
| **Play / meta** | Level label + choose level, restart, score | Unchanged. |
| **Settings entry** | Gear (or labeled “Settings”) | Opens dialog. |
| **Master sound** | `#audio-master-mute-toggle` | All-sound mute (see below). |
| **Master sound** | `#audio-master-volume` (or same row once implemented) | Single slider scaling **both** music and SFX audibility (e.g. combined gain multiplier or proportional duck of both buses); persists in `triplet_tiles_audio` **only if** the JSON shape is extended with a dedicated field; until then, spec the ID and behavior so implementation can follow. |

**Hide behind Settings / compact layout:** display mode buttons, install prompt, per-channel music + SFX rows (mute + range), haptics — **not** the master mute or master volume row.

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

- **Placement:** Keep **master mute** and **master volume** in a **dedicated always-visible row** (e.g. `.audio-master-strip` in the header), **outside** the collapsible `.audio-stack` block, so compact mode can hide per-channel rows only.
- **Master mute — `#audio-master-mute-toggle`:** icon `speaker-simple-high` / `speaker-simple-slash`; toggles both channels via `audioSvc.setMasterMuted()` ([`lib/audio-service.js`](lib/audio-service.js)).
- **“On” (audible):** both music and SFX are unmuted **and** each channel volume is `> 0` **and** (once implemented) master volume is `> 0`.
- **Click when on:** mute both channels. **Click when off:** unmute both. Individual music/SFX toggles still apply afterward; `syncAudioUi()` keeps the master control in sync.
- **Master volume — `#audio-master-volume`:** one range `0…1` (or `0…100`) that scales **both** music and SFX output together on top of each channel’s slider (implementation detail: e.g. multiply effective gains or drive a shared “trim” in `createAudioService`). Must remain next to master mute in the always-visible strip.

**Current code note:** Master volume is **specified** here; wire-up in `game.js` / `audio-service.js` may lag until implemented. Until then, only master mute is required to satisfy always-visible **master sound**.

## Persistence

| Data | Storage | Notes |
| ---- | ------- | ----- |
| Music / SFX / haptics | `localStorage` key **`triplet_tiles_audio`** | JSON via `createAudioService` — bind the same controls to `audioSvc`. Master mute sets `musicMuted` and `sfxMuted` together (one save). **Master volume:** when added, extend persisted JSON with e.g. `masterVolume` (number `0…1`), default `1`, without breaking existing loads (optional fields + fallbacks). |
| UI chrome layout | New key **`triplet_tiles_ui`** (recommended) | JSON, e.g. `{ "compactChrome": true }`. Version later if schema evolves. |
| Full screen | None required | Reflect real `fullscreenElement` / `display-mode` only. |

**Reset to defaults:** Call existing audio defaults (via service API or re-init pattern) **and** clear or rewrite `triplet_tiles_ui` to defaults; do **not** clear progression (`triplet_tiles_progression`, stats, powerups, session).

## Behavior

- **Open:** Move focus to the **first focusable** control in the dialog (or the heading with `tabindex="-1"` if you use that pattern consistently).
- **Close:** Close button, **Escape**, optional scrim click; **restore focus** to the Settings launcher.
- **Focus trap:** While open, Tab cycles within the dialog (align with `tests/modal-a11y.spec.js`).
- **Game state:** Opening Settings should **pause** or block input so taps do not affect the board; document the chosen rule in `game.js` (single place).
- **Reduced motion:** Dialog show/hide respects `prefers-reduced-motion` (instant or minimal transition).

## Presentation

- Reuse existing chrome tokens: scrim and panels per `--chrome-scrim`, `--chrome-panel-*`, `--chrome-line` in `style.css`.
- New markup: **separate** `id` for overlay root (e.g. `#settings-overlay`) so it never conflicts with `#overlay` (level complete) or `#level-select-overlay`.
- **Required attributes:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → visible **“Settings”** title.

## Implementation notes

- **Moving DOM:** Relocating `#fullscreen-toggle`, `#install-app-button`, and the **per-channel** part of the audio UI from the header into the dialog is fine as long as **`game.js` retains the same element IDs**. **`#audio-master-mute-toggle` and `#audio-master-volume` stay in the header** (always-visible strip), not dialog-only.
- **Compact chrome:** When `triplet_tiles_ui.compactChrome` is true, hide display mode, install, **and** the collapsible **per-channel** audio rows **only** — **never** hide the master mute / master volume strip.
- **Install button:** Keep current logic that toggles `.hidden`; inside Settings it can always live in **Display** even if hidden until installable.

## Out of scope (v1)

- Theming / light–dark (ArchitectUX baseline — add when product wants it).
- Per-level difficulty or gameplay toggles.
- Migrating power-ups tray into Settings.

## Acceptance checklist

- [ ] Settings reachable in ≤2 actions from play.
- [ ] All former header audio/display/haptics controls work identically after move (including master mute + per-channel controls).
- [ ] Audio still persists under `triplet_tiles_audio` only.
- [ ] Focus trap + Escape + focus restore covered by existing or extended tests.
- [ ] No regression when `compactChrome` hides header clusters; **master mute + master volume** remain visible and usable.
