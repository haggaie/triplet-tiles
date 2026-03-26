# Audio design — implementation plan

Executes [AUDIO_DESIGN.md](AUDIO_DESIGN.md). Order is **risk- and player-impact first**: unlock path and core feedback before polish.

---

## Status snapshot

| Area | Notes |
|------|--------|
| **Ambient loop** | **Done.** File: `assets/audio/music_ambient_loop_01.mp3`. Module: [`lib/audio-service.js`](lib/audio-service.js) (`HTMLAudioElement`, loop, volume, mute, `visibilitychange` pause). Wired from [`game.js`](game.js); storage key `triplet_tiles_audio` (`STORAGE_KEYS.AUDIO`). |
| **Music UI** | **Done.** Header control: mute toggle + volume range ([`index.html`](index.html), [`style.css`](style.css)). Icons may use Phosphor in current `game.js`. |
| **First-play unlock** | **Done.** First `pointerdown` or game key (Enter / Space / arrows) on `#app` calls `audioSvc.unlock()` for autoplay policy. |
| **Offline / PWA** | **Done.** [`sw.js`](sw.js) includes `assets/audio/music_ambient_loop_01.mp3` and `lib/audio-service.js` in precache. |
| **SFX (`play(eventId)`)** | **Not started.** No sounds for pick / tray / match / win / loss yet. |
| **Web Audio + `Bus_SFX`** | **Not started.** Music does **not** use `AudioContext`; SFX should use Web Audio (or a small pool) when added. |
| **SFX settings** | **Not started.** No separate SFX slider/mute ([GAME_SPEC.md](GAME_SPEC.md) §7). |
| **Haptics** | **Not started.** |

**Attribution (repo only):** [Late Afternoon Garden Loop](https://suno.com/s/e6A9f0jUQL7tZCh1) (Suno) — [AUDIO_DESIGN.md](AUDIO_DESIGN.md).

---

## What’s next (recommended order)

1. **SFX assets + codec** — Add files under `assets/audio/` (e.g. WebM/Opus or short MP3); update [`sw.js`](sw.js) precache list if you ship offline.
2. **Extend the audio layer** — Add Web Audio (or delegated library) for one-shots: `play('SFX/UI/Tile_Pick')` etc. (~4–6 voice cap). Optionally merge prefs with existing `triplet_tiles_audio` JSON (`sfxVolume`, `sfxMuted`) or separate keys.
3. **Hook `game.js`** — Fire the five events at pick start, tray land, triple clear, win modal, loss modal (same places score/UI update).
4. **SFX chrome** — Second slider + mute; persist; keep mobile-friendly layout (may need a compact “Audio” row or overflow).
5. **Haptics** — Phase 5 below (`navigator.vibrate`, reduced-motion, rate limit, toggle storage).
6. **Polish** — Optional music duck on match/win; loudness pass once SFX exist; optional Playwright “unlocked after gesture” smoke.

---

## Phase 0 — Prerequisites (short)

| Task | Status | Why |
|------|--------|-----|
| Create `assets/audio/` and **naming** | **Done** | `music_ambient_loop_01.mp3` shipped; reserve `sfx_*.webm` (or similar) for SFX. |
| Pick **delivery formats** for SFX | **Open** | Plan: Opus/WebM or Ogg for one-shots; music is **MP3** today. |
| **Placeholder** SFX for dev | **Open** | Unblocks wiring before final assets. |

---

## Phase 1 — Audio engine & first-play gesture

| Priority | Task | Status | Notes |
|----------|------|--------|--------|
| **P0** | Gesture **unlock** before audible playback | **Done** | `audioSvc.unlock()`; music uses `HTMLAudioElement.play()` (not `AudioContext.resume`, though that’s fine for future SFX). |
| **P0** | **`lib/audio-service.js`** — music transport | **Done** | Mute, volume, persist, visibility, `reloadFromStorage()` for tests. |
| **P0** | **`play(eventId)` + map → buffers** | **Todo** | Extend service or add `lib/sfx-service.js`; no raw paths from gameplay. |
| **P0** | **`Bus_Music` + `Bus_SFX`** (gain staging) | **Partial** | Music: element volume only; SFX bus when Web Audio lands. |
| **P0** | **Preload** SFX | **Todo** | `decodeAudioData` + small pool / voice limits. |
| **P0** | **Persist** `sfxVolume` / `sfxMuted` | **Todo** | Extend `triplet_tiles_audio` or namespaced keys. |

**Music exit criteria (met):** After first gesture, loop plays when not muted; music prefs survive reload.

**Full Phase 1 exit (open):** Same for SFX after implementation.

---

## Phase 2 — Wire gameplay SFX

| Priority | Task | Event ID | Status |
|----------|------|----------|--------|
| **P0** | Valid tile pick / fly starts | `SFX/UI/Tile_Pick` | Todo |
| **P0** | Tile lands in tray | `SFX/UI/Tray_Place` | Todo |
| **P0** | Triplet clears | `SFX/Gameplay/Match_Clear` | Todo |
| **P0** | Level complete | `SFX/Meta/Level_Win` | Todo |
| **P0** | Tray overflow / loss | `SFX/Meta/Level_Loss` | Todo |

**Exit criteria:** Full level with all five cues; failures must not throw (no-op / try/catch).

---

## Phase 3 — Settings UI

| Priority | Task | Status | Notes |
|----------|------|--------|--------|
| **P1** | **Music** slider + mute | **Done** | Header; [GAME_SPEC.md](GAME_SPEC.md) §7. |
| **P1** | **SFX** slider + mute | **Todo** | Independent of music. |
| **P1** | Compact placement / overflow | **Open** | If the bar gets crowded, consider a single “Sound” popover. |

---

## Phase 4 — Background music loop

| Priority | Task | Status | Notes |
|----------|------|--------|--------|
| **P1** | One **ambient loop**, `loop`, visibility handling | **Done** | [`lib/audio-service.js`](lib/audio-service.js). |
| **P2** | **Duck** on `Match_Clear` / `Level_Win` | **Todo** | −2 to −4 dB, ~200–400 ms. |
| **P2** | Second theme / `Focus` parameter | **Later** | [AUDIO_DESIGN.md](AUDIO_DESIGN.md) dynamics v2. |

---

## Phase 5 — Haptics

| Priority | Task | Notes |
|----------|------|--------|
| **P1** | `navigator.vibrate` + `hapticsEnabled` | Patterns in [AUDIO_DESIGN.md](AUDIO_DESIGN.md). |
| **P1** | `prefers-reduced-motion` → haptics off by default (or explicit override) | |
| **P1** | Rate-limit vibrate (e.g. 50–80 ms min gap) | |
| **P1** | Persist haptics toggle | Three-way: Music / SFX / Haptics. |

---

## Phase 6 — Polish & QA

| Task | Notes |
|------|--------|
| Loudness pass once SFX exist | Music vs SFX peaks — [AUDIO_DESIGN.md](AUDIO_DESIGN.md). |
| **iOS** unlock + silent switch | Document in [TESTING.md](TESTING.md) if useful. |
| **E2E** | Optional: “audio unlocked after click”. |
| **Future** | Blocked tap, power-up SFX (`Undo`, `Shuffle`, `Remove Type`). |

---

## Asset inventory

| File (suggested name) | Event ID(s) | Count | Status |
|-------------------------|-------------|-------|--------|
| `music_ambient_loop_01.mp3` | (music) | 1 loop | **Shipped** |
| `sfx_tile_pick` | `SFX/UI/Tile_Pick` | 1 | Todo |
| `sfx_tray_place` | `SFX/UI/Tray_Place` | 1 | Todo |
| `sfx_match_clear_a`, `_b`, `_c` | `SFX/Gameplay/Match_Clear` | 3 variants | Todo |
| `sfx_level_win` | `SFX/Meta/Level_Win` | 1 | Todo |
| `sfx_level_loss` | `SFX/Meta/Level_Loss` | 1 | Todo |

**Music attribution:** [Late Afternoon Garden Loop](https://suno.com/s/e6A9f0jUQL7tZCh1) (Suno) — [AUDIO_DESIGN.md](AUDIO_DESIGN.md).

---

## Prompts for SFX / extra music generation

Use these with an **AI SFX / music tool** or as a **brief for a human designer**. Always re-read the tool’s **license** before shipping.

**Global negative prompt (append to every SFX prompt):**  
*No casino sounds, no slot machine, no harsh metallic screech, no loud brass fanfare, no voice, no cinematic trailer impact, no horror sting.*

### Music (reference — main loop already authored)

1. **Ambient loop — main theme**  
   > Seamless looping ambient music for a casual mobile puzzle game, 60–180 second sessions. Calm park or garden at late afternoon: soft pads, very light acoustic texture, subtle gentle movement, no drums, no catchy melody hook, no tension build. Warm, relaxing, low cognitive load. Loop-friendly: stable energy start to end. Master: gentle, no sub-bass rumble.

### Sound effects

2. **Tile pick — `SFX/UI/Tile_Pick`**  
   > Very short UI sound, soft wooden block tapped lightly on felt table, small tactile tick, warm mid frequencies, barely any reverb, under 150 ms, single transient then soft decay. Casual puzzle game, not sci-fi, not glass click.

3. **Tray place — `SFX/UI/Tray_Place`**  
   > Short wooden tile settling into a shallow wooden groove or tray slot, soft clack, warm and satisfying, slightly fuller than a tick but still under 250 ms, no echo, no metal.

4. **Match clear — variant A — `SFX/Gameplay/Match_Clear`**  
   > Pleasant confirmation sound when three matching items merge: soft warm harmonic bloom, subtle major chord flavor, gentle sparkle in high mids only, under 400 ms, relaxing puzzle game, not arcade power-up, not coin ding.

5. **Match clear — variant B**  
   > Same brief as variant A but slightly softer attack and 5% lower perceived pitch; still under 400 ms; warm wooden casual game.

6. **Match clear — variant C**  
   > Same family as A/B: alternate timbre—slightly more “airy” pad-like tail, still short, no delay throws, under 450 ms.

7. **Level win — `SFX/Meta/Level_Win`**  
   > Short positive completion sting for a calm puzzle game, under 2 seconds, warm uplifting harmony, acoustic-soft character, gentle rise then resolve, no brass section, no epic orchestra, no leaderboard fanfare, friendly and relieved.

8. **Level loss — `SFX/Meta/Level_Loss`**  
   > Soft non-punishing feedback for failing a gentle puzzle: two short descending notes or one muted wooden thud with soft low pitch, under 600 ms, no buzzer, **no** sad trombone, **no** error beep, emotionally neutral and clear.

---

## Related docs

- Design spec: [AUDIO_DESIGN.md](AUDIO_DESIGN.md)  
- Backlog item: [EXTENSIONS_TODO.md](EXTENSIONS_TODO.md) (Audio & haptics)  
- Game spec: [GAME_SPEC.md](GAME_SPEC.md) §7  
