# Audio design — implementation plan

Executes [AUDIO_DESIGN.md](AUDIO_DESIGN.md). Order is **risk- and player-impact first**: unlock path and core feedback before polish.

---

## Status snapshot

| Area | Notes |
|------|--------|
| **Ambient loop** | **Done.** File: `assets/audio/music_ambient_loop_01.mp3`. Module: [`lib/audio-service.js`](lib/audio-service.js) (`HTMLAudioElement`, loop, volume, mute, `visibilitychange` pause). **Duck** on match / win (~−3 dB, attack / hold / release). Wired from [`game.js`](game.js); storage key `triplet_tiles_audio` (`STORAGE_KEYS.AUDIO`). |
| **Music UI** | **Done.** Header control: mute toggle + volume range ([`index.html`](index.html), [`style.css`](style.css)). Icons may use Phosphor in current `game.js`. |
| **First-play unlock** | **Done.** First `pointerdown` or game key (Enter / Space / arrows) on `#app` calls `audioSvc.unlock()` for autoplay policy. |
| **Offline / PWA** | **Done.** [`sw.js`](sw.js) precaches music, **six `sfx_*.opus` files**, and `lib/audio-service.js`. |
| **SFX files** | **Shipped (web).** `assets/audio/sfx_*.opus` (encoded from WAV masters in `assets/audio/source/` via `npm run optimize:audio`). |
| **SFX playback** | **Done.** Pick, match, win, loss ([`game.js`](game.js)); no separate tray-land cue ([AUDIO_DESIGN.md](AUDIO_DESIGN.md) note). |
| **Web Audio + `Bus_SFX`** | **Done.** `AudioContext` + master gain for SFX; music stays on `HTMLAudioElement`. |
| **SFX settings** | **Done.** Second row in header: mute + volume; persisted in `triplet_tiles_audio` with music. |
| **Haptics** | **Done.** `navigator.vibrate` patterns ([AUDIO_DESIGN.md](AUDIO_DESIGN.md)); `prefers-reduced-motion` default off; 65 ms min gap (match pick skipped if busy; win/loss deferred); toggle persisted in `triplet_tiles_audio`; header control ([`index.html`](index.html), [`game.js`](game.js), [`lib/audio-service.js`](lib/audio-service.js)). |

**Attribution (repo only):** [Late Afternoon Garden Loop](https://suno.com/s/e6A9f0jUQL7tZCh1) (Suno) — [AUDIO_DESIGN.md](AUDIO_DESIGN.md).

---

## What’s next (recommended order)

1. ~~**Haptics** — Phase 5~~ **Done** (`navigator.vibrate`, reduced-motion, rate limit, toggle storage).
2. **Polish** — Optional Playwright “unlocked after gesture” smoke (`tests/audio-sfx.spec.js`).
3. **Optional** — Compact “Sound” popover if the header feels crowded.

---

## Phase 0 — Prerequisites (short)

| Task | Status | Why |
|------|--------|-----|
| Create `assets/audio/` and **naming** | **Done** | `music_ambient_loop_01.mp3` shipped; SFX ship as **`sfx_*.opus`** (see `scripts/optimize-audio.js`). |
| Pick **delivery formats** for SFX | **Done** | **Opus** one-shots in `assets/audio/`; WAV masters in `assets/audio/source/`; music remains **MP3**. |
| **Placeholder** SFX for dev | **Done** | Masters in `assets/audio/source/`; run `npm run optimize:audio` after edits. |

---

## Phase 1 — Audio engine & first-play gesture

| Priority | Task | Status | Notes |
|----------|------|--------|--------|
| **P0** | Gesture **unlock** before audible playback | **Done** | `audioSvc.unlock()`; music + SFX (`AudioContext.resume` on first gesture). |
| **P0** | **`lib/audio-service.js`** — music + SFX | **Done** | Music element; SFX `fetch` + `decodeAudioData`; `playSfx(id)`; voice cap 6. |
| **P0** | **`play(eventId)` + map → buffers** | **Done** | `SFX_IDS` + `sfxUrlMap` from `game.js`; match uses random A/B/C buffer. |
| **P0** | **`Bus_Music` + `Bus_SFX`** (gain staging) | **Done** | Music: element volume; SFX: `GainNode` bus. |
| **P0** | **Preload** SFX | **Done** | After unlock, async decode; tab hide **suspends** `AudioContext`. |
| **P0** | **Persist** `sfxVolume` / `sfxMuted` | **Done** | Same `triplet_tiles_audio` JSON as music. |

**Exit criteria (met):** After first gesture, music plays when enabled; SFX play on game events; prefs survive reload.

---

## Phase 2 — Wire gameplay SFX

| Priority | Task | Event ID | Status |
|----------|------|----------|--------|
| **P0** | Valid tile pick / fly starts | `SFX/UI/Tile_Pick` | **Done** |
| **P0** | Tile lands in tray | `SFX/UI/Tray_Place` | **Omitted** (pick covers pickup + land) |
| **P0** | Triplet clears | `SFX/Gameplay/Match_Clear` | **Done** |
| **P0** | Level complete | `SFX/Meta/Level_Win` | **Done** |
| **P0** | Tray overflow / loss | `SFX/Meta/Level_Loss` | **Done** |

**Exit criteria:** Full level with pick / match / win / loss cues; failures must not throw (no-op / try/catch).

---

## Phase 3 — Settings UI

| Priority | Task | Status | Notes |
|----------|------|--------|--------|
| **P1** | **Music** slider + mute | **Done** | Header; [GAME_SPEC.md](GAME_SPEC.md) §7. |
| **P1** | **SFX** slider + mute | **Done** | Second row in `.audio-stack`; Phosphor `waveform` / `waveform-slash`. |
| **P1** | Compact placement / overflow | **Open** | If the bar gets crowded, consider a single “Sound” popover. |

---

## Phase 4 — Background music loop

| Priority | Task | Status | Notes |
|----------|------|--------|--------|
| **P1** | One **ambient loop**, `loop`, visibility handling | **Done** | [`lib/audio-service.js`](lib/audio-service.js). |
| **P2** | **Duck** on `Match_Clear` / `Level_Win` | **Done** | ~−3 dB; 200 ms attack, 280 ms release; hold 380 ms / 1200 ms ([`lib/audio-service.js`](lib/audio-service.js)). |
| **P2** | Second theme / `Focus` parameter | **Later** | [AUDIO_DESIGN.md](AUDIO_DESIGN.md) dynamics v2. |

---

## Phase 5 — Haptics

| Priority | Task | Status | Notes |
|----------|------|--------|--------|
| **P1** | `navigator.vibrate` + `hapticsEnabled` | **Done** | Patterns in [AUDIO_DESIGN.md](AUDIO_DESIGN.md); `HAPTIC_KIND` + `triggerHaptic` in [`lib/audio-service.js`](lib/audio-service.js). |
| **P1** | `prefers-reduced-motion` → haptics off by default (explicit toggle on = override) | **Done** | `defaultHapticsFromReducedMotion()` on load when `hapticsEnabled` absent from storage. |
| **P1** | Rate-limit vibrate (50–80 ms min gap) | **Done** | 65 ms; pick/match dropped if under gap; win/loss scheduled after gap. |
| **P1** | Persist haptics toggle | **Done** | Same JSON as music/SFX; header row + [`game.js`](game.js) `syncAudioUi` / `setHapticsEnabled`. |

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
| `sfx_tile_pick.opus` | `SFX/UI/Tile_Pick` | 1 | **Shipped** (from `source/*.wav` + `optimize:audio`) |
| `sfx_match_clear_a/b/c.opus` | `SFX/Gameplay/Match_Clear` | 3 variants | **Shipped** |
| `sfx_level_win.opus` | `SFX/Meta/Level_Win` | 1 | **Shipped** |
| `sfx_level_loss.opus` | `SFX/Meta/Level_Loss` | 1 | **Shipped** |

**Music attribution:** [Late Afternoon Garden Loop](https://suno.com/s/e6A9f0jUQL7tZCh1) (Suno) — [AUDIO_DESIGN.md](AUDIO_DESIGN.md).

---

## Prompts for SFX / extra music generation

Use these with an **AI SFX / music tool** or as a **brief for a human designer**. Always re-read the tool’s **license** before shipping.

### Prompting guidance (SFX tools)

ElevenLabs [How do I prompt for sound effects?](https://help.elevenlabs.io/hc/en-us/articles/25735604945041-How-do-I-prompt-for-sound-effects) recommends:

- **One sound per prompt** for predictable results—natural language plus audio terms both work.
- Add a **little** extra detail when it helps (e.g. *high-quality, professionally recorded*, **foley**, **close-mic**); experiment if the model over-bakes or under-specifies.
- **Avoid multi-step stories** in a single prompt (e.g. “walk then fall”); generate **separate** clips and **combine or trim in an editor** instead.

Broader examples and terminology: [ElevenLabs Sound Effects capability overview](https://elevenlabs.io/docs/capabilities/sound-effects).

**Global negative tail (append where the product allows negatives, or fold into the main line):**  
*No casino or slot-machine sounds, no harsh metallic screech, no loud brass fanfare, no voice, no cinematic trailer impact, no horror sting.*

### Music (reference — main loop already authored)

1. **Ambient loop — main theme**  
   > Seamless looping ambient music for a casual mobile puzzle game, 60–180 second sessions. Calm park or garden at late afternoon: soft pads, very light acoustic texture, subtle gentle movement, no drums, no catchy melody hook, no tension build. Warm, relaxing, low cognitive load. Loop-friendly: stable energy start to end. Master: gentle, no sub-bass rumble.

### Sound effects

Each block is **one generation** (one dominant sound). For **match** variants, run **three separate prompts**, not one paragraph asking for A/B/C.

2. **Tile pick — `SFX/UI/Tile_Pick`**  
   > High-quality, professionally recorded foley, close-mic, dry: one soft wooden block tapped once on thick felt or fabric, single short tick, warm mids, under 150 ms, no room reverb. Not glass, not metal, not sci-fi UI.

3. **Tray place — `SFX/UI/Tray_Place` (reference only — not used in shipped game)**  
   > High-quality foley, close-mic, dry: one small wooden block dropped on a shallow carved wood groove, single soft clack, warm tone, under 250 ms.

4. **Match clear — variant A — `SFX/Gameplay/Match_Clear`**  
   > High-quality sound effect: **one** soft pleasant major chord swell, short decay, subtle airy top, dry studio feel, under 400 ms. Calm mobile puzzle

5. **Match clear — variant B**  
   > High-quality sound effect: **one** soft pleasant major chord swell, slightly lower register, short decay, subtle airy top, dry studio feel, under 400 ms. Calm mobile puzzle

6. **Match clear — variant C**  
   > short soft tonal confirmation with a slightly longer airy tail, under 450 ms.

7. **Level win — `SFX/Meta/Level_Win`**  
   > High-quality sound effect: **one** short warm uplifting phrase or sting, acoustic-soft, gentle lift and resolve, under 2 seconds. No brass fanfare, no orchestra hit, no celebration crowd.

8. **Level loss — `SFX/Meta/Level_Loss`** (choose **one** clip style per shipped file; if you want a two-note fall, use **two prompts** + edit—see ElevenLabs guidance above)

   - **Option A — single thud:** One muted low wooden thud, close-mic foley, dry, soft low pitch, under 400 ms, emotionally neutral, no buzzer.
   - **Option B — two-step fall:** Prompt 1: *single soft low marimba or wood block note, short, dry.* Prompt 2: *single softer note a fourth or fifth below.* Trim/join in an editor; total under 600 ms. No trombone wah, no error beep.

---

## Related docs

- Design spec: [AUDIO_DESIGN.md](AUDIO_DESIGN.md)  
- Backlog item: [EXTENSIONS_TODO.md](EXTENSIONS_TODO.md) (Audio & haptics)  
- Game spec: [GAME_SPEC.md](GAME_SPEC.md) §7  
- SFX prompting (external): [ElevenLabs — How do I prompt for sound effects?](https://help.elevenlabs.io/hc/en-us/articles/25735604945041-How-do-I-prompt-for-sound-effects)  
