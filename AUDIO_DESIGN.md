# Audio & haptics — design

Single source of truth for **background music**, **SFX**, and **haptics** on web and mobile. Aligns with [GAME_SPEC.md](GAME_SPEC.md) §7, [EXTENSIONS_TODO.md](EXTENSIONS_TODO.md) (audio & haptics item), and [.impeccable.md](.impeccable.md) (brand: fun, relaxing, tactile; respectful engagement).

---

## Sonic identity

**Three words:** **Warm · tactile · calm.**

Sound should reinforce **wood, felt, and a quiet garden**: soft transients, short decays, no harsh highs or “casino” sparkle. Delight comes from **clear feedback**, not pressure or overstimulation.

---

## Principles

1. **Clarity over punch** — Every cue confirms state: pick, tray seat, merge, win, loss.
2. **Satisfying, not manipulative** — No escalating “near-miss” audio, no loot-box timbres, no punishing loss stingers. See [.impeccable.md](.impeccable.md) on avoiding exploitative patterns.
3. **Tactile = audio + haptics** — Light haptics mirror discrete gameplay events; music is not driven by haptics.
4. **Accessibility** — Treat **`prefers-reduced-motion`** as “reduce emphasis”: default **no vibration** when reduced motion is set (unless a dedicated **Haptics** override is explicitly enabled). Offer separate toggles: **Music**, **SFX**, **Haptics** so audio and motion prefs stay independent.

---

## Music

| Aspect | Direction |
|--------|-----------|
| **Role** | Low-arousal **ambient bed** for 60–180s sessions ([GAME_SPEC.md](GAME_SPEC.md) §3 session length). |
| **Form** | **Seamless loop** per visual theme. MVP: single loop; later optional light horizontal re-sequencing. |
| **Dynamics (optional v2)** | Parameter **`Focus`** (0–1): slightly thinner mix when tray is busy (e.g. 5–7 tiles)—subtle, not alarmist. |
| **Mix** | Bed behind SFX; optional short **duck** (−2 to −4 dB, ~200–400 ms) on **match** and **win**. |
| **Mute** | User can mute music; setting should persist (local storage). |

**Delivery:** Stream long assets; **Ogg/Opus or AAC**; crossfade or clean loop seam as needed.

---

## Sound effects — logical events

Gameplay code should trigger **named events**; a small audio layer resolves assets (no scattered hardcoded paths in core game logic).

| Event ID | Trigger | Character |
|----------|---------|-----------|
| `SFX/UI/Tile_Pick` | Valid tap / pick confirmed | Soft **wood tick** + tiny felt “lift” (very short). |
| `SFX/UI/Tray_Place` | Tile lands in tray slot | **Wooden clack** into groove; slight pitch variation by slot (subtle). |
| `SFX/Gameplay/Match_Clear` | Triplet clears | Warm **bloom** (short major sonority); **2–3** variants (pitch/volume). |
| `SFX/Meta/Level_Win` | Level complete | Short **uplift** (&lt; ~2 s)—warm, not brassy. |
| `SFX/Meta/Level_Loss` | Tray overflow | Soft **descending** tone or muted thud; **no** buzzer, no “shame” cue. |

**Variation:** Randomize pitch (~±3%) and volume (~±1 dB) on one-shots so repeats do not sound identical.

**Future (not required for initial backlog):** blocked tap, power-ups (undo / shuffle / remove type), combo intensity on match if [GAME_SPEC.md](GAME_SPEC.md) combo multiplier ships.

---

## Mixer (web-shaped)

Matches [GAME_SPEC.md](GAME_SPEC.md): **separate volume sliders for music and SFX**.

- **Buses:** `Bus_Music`, `Bus_SFX` (optional `Bus_UI` → can map to SFX at first).
- **Master:** User sliders × optional global mute.
- **Voice budget (mobile web):** ~**4–6** simultaneous one-shot SFX; **one** music stream. Preload short SFX; stream music.

---

## Haptics (`navigator.vibrate` where available)

Gate on **user setting** and **`prefers-reduced-motion`** policy (recommended: off when reduced motion, unless haptics-only override exists).

| Event | Pattern (ms) | Note |
|-------|----------------|------|
| Pick | `12` | Light acknowledgment |
| Tray place | `8` or omit if too busy | Lighter than pick |
| Match | `15, 30, 15` or single `25` | Small celebration |
| Win | `20, 40, 20` or `30, 50, 30` | Distinct from match |
| Loss | `35` once or `20, 40` | Clear, not punishing |

**Rate-limit** (e.g. min 50–80 ms between vibrate calls) so rapid matches do not buzz continuously.

---

## Loudness & platform notes

- **Balance:** Consistent perceived level across SFX; music **quieter** than SFX peak by design.
- **iOS / Safari:** Respect autoplay rules; unlock `AudioContext` on **first user gesture**; one-time “enable audio” UX if required.

---

## Traceability

| Source | Covered |
|--------|---------|
| [GAME_SPEC.md](GAME_SPEC.md) §7 | Ambient loop, pick / tray / match / win / fail, separate music & SFX |
| [EXTENSIONS_TODO.md](EXTENSIONS_TODO.md) | Mute, SFX set, vibration, reduced-motion / a11y |
| [.impeccable.md](.impeccable.md) | Brand voice, calm tactile feedback, non-exploitative engagement |
