# Audio design — implementation plan

Executes [AUDIO_DESIGN.md](AUDIO_DESIGN.md). Order is **risk- and player-impact first**: unlock path and core feedback before polish.

---

## Phase 0 — Prerequisites (short)

| Task | Why |
|------|-----|
| Create `assets/audio/` (or `public/audio/`) and decide **naming** (`sfx_pick.webm`, `music_theme_01.ogg`, etc.). | Keeps URLs stable before wiring code. |
| Pick **delivery formats**: **Opus in WebM** or **Ogg** for SFX; **Ogg/Opus or AAC** for music ([AUDIO_DESIGN.md](AUDIO_DESIGN.md)). | One pipeline for encode + levels. |
| Add a **silent or placeholder** clip for dev if needed. | Unblocks integration before final assets land. |

---

## Phase 1 — P0: Audio engine & first-play gesture (blocking)

| Priority | Task | Notes |
|----------|------|--------|
| **P0** | **`AudioContext` unlock** on first user gesture (tap/click anywhere in `#app` or first interaction). | Required for **iOS Safari**; call `resume()` before playback. |
| **P0** | Small **`audio.js` (or `lib/audio-service.js`)** module: `play(eventId)`, `setMusicVolume`, `setSfxVolume`, internal map **event ID → buffer/path**. | No asset paths in `game.js`—only named events from [AUDIO_DESIGN.md](AUDIO_DESIGN.md). |
| **P0** | **Two gain nodes / buses:** `Bus_Music`, `Bus_SFX`; master = user settings. | Matches spec sliders. |
| **P0** | **Preload** short SFX (`decodeAudioData`); **stream** music via `HTMLAudioElement` *or* separate music path. | Stay within ~4–6 voice budget for one-shots. |
| **P0** | **Persist** `musicVolume`, `sfxVolume`, `musicMuted`, `sfxMuted` in `localStorage` (keys namespaced e.g. `triplet-audio-*`). | Survives refresh. |

**Exit criteria:** After one tap, a test beep or real `Tile_Pick` plays; volumes persist across reload.

---

## Phase 2 — P0: Wire gameplay events

| Priority | Task | Event ID |
|----------|------|----------|
| **P0** | Valid tile pick / fly starts | `SFX/UI/Tile_Pick` |
| **P0** | Tile lands in tray | `SFX/UI/Tray_Place` |
| **P0** | Triplet clears | `SFX/Gameplay/Match_Clear` (+ pitch ±3% / vol ±1 dB in code) |
| **P0** | Level complete | `SFX/Meta/Level_Win` |
| **P0** | Tray overflow / loss | `SFX/Meta/Level_Loss` |

Hook at the **same** places UI already updates score / modals (see `game.js` flow: pick, merge detection, win/loss screens).

**Exit criteria:** Full level can be played with all five cues; nothing throws if audio fails (try/catch or no-op).

---

## Phase 3 — P1: Settings UI

| Priority | Task | Notes |
|----------|------|--------|
| **P1** | **Music** slider + mute (or slider to 0 + mute icon). | [GAME_SPEC.md](GAME_SPEC.md) §7. |
| **P1** | **SFX** slider + mute. | Independent of music. |
| **P1** | Optional **compact** placement: settings modal, overflow menu, or footer—**mobile-first** tap targets. | Avoid cluttering [`.impeccable.md`](.impeccable.md) top bar if possible. |

**Exit criteria:** User can silence music and keep SFX (and vice versa); values persist.

---

## Phase 4 — P1: Background music loop

| Priority | Task | Notes |
|----------|------|--------|
| **P1** | Load **one** seamless **ambient loop**; `loop = true`; handle **visibility** (`document.visibilityState`) optional pause to save battery. | MVP: static loop; no `Focus` parameter yet. |
| **P2** | Optional **duck** music −2 to −4 dB for ~200–400 ms on `Match_Clear` / `Level_Win`. | Nice-to-have after levels feel good. |
| **P2** | Second theme / `Focus` tray tension → **later** ([AUDIO_DESIGN.md](AUDIO_DESIGN.md) dynamics v2). | Not required for first ship. |

---

## Phase 5 — P1: Haptics

| Priority | Task | Notes |
|----------|------|--------|
| **P1** | `navigator.vibrate` behind **`hapticsEnabled`** (default on desktop irrelevant; mobile matters). | Patterns in [AUDIO_DESIGN.md](AUDIO_DESIGN.md). |
| **P1** | **`prefers-reduced-motion: reduce`** → default **haptics off** (or single opt-in in settings). | Aligns with extensions backlog. |
| **P1** | **Rate-limit** vibrate (e.g. min 50–80 ms between calls). | Prevents buzz storms on combo matches. |
| **P1** | Persist **haptics** toggle in `localStorage`. | Three-way independence: Music / SFX / Haptics. |

---

## Phase 6 — P2: Polish & QA

| Task | Notes |
|------|--------|
| Loudness pass: SFX peaks **consistent**; music **quieter** than SFX peak ([AUDIO_DESIGN.md](AUDIO_DESIGN.md)). | Use meter in Audacity/Reaper or `ffmpeg` loudnorm. |
| **iOS** device test: unlock, background tab, silent switch behavior. | Document quirks in [TESTING.md](TESTING.md) if useful. |
| **E2E:** Optional Playwright assert “audio module initialized after click” (not “sounds correct”). | |
| **Future:** Blocked tap, power-up SFX (`Undo`, `Shuffle`, `Remove Type`) when product adds them. | |

---

## Asset inventory (files to generate or license)

| File (suggested name) | Event ID(s) | Count |
|-------------------------|-------------|-------|
| `music_ambient_loop_01` | (music bus) | 1 loop |
| `sfx_tile_pick` | `SFX/UI/Tile_Pick` | 1 |
| `sfx_tray_place` | `SFX/UI/Tray_Place` | 1 |
| `sfx_match_clear_a`, `_b`, `_c` | `SFX/Gameplay/Match_Clear` | 3 variants (or 1 + code variation) |
| `sfx_level_win` | `SFX/Meta/Level_Win` | 1 |
| `sfx_level_loss` | `SFX/Meta/Level_Loss` | 1 |

**Total minimum:** 1 music + 7 one-shots (if three match variants).

---

## Prompts for asset generation

Use these with an **AI SFX / music tool** or as a **brief for a human designer**. Always re-read the tool’s **license** before shipping.

**Global negative prompt (append to every SFX prompt):**  
*No casino sounds, no slot machine, no harsh metallic screech, no loud brass fanfare, no voice, no cinematic trailer impact, no horror sting.*

### Music

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
   > Soft non-punishing feedback for failing a gentle puzzle: two short descending notes or one muted wooden thud with soft low pitch, under 600 ms, no buzzer, no sad trombone, no error beep, emotionally neutral and clear.

---

## Related docs

- Design spec: [AUDIO_DESIGN.md](AUDIO_DESIGN.md)  
- Backlog item: [EXTENSIONS_TODO.md](EXTENSIONS_TODO.md) (Audio & haptics)  
- Game spec: [GAME_SPEC.md](GAME_SPEC.md) §7  
