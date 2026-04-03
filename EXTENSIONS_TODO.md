# Future extensions — TODO

Working backlog for features, design, gameplay, and QA. **Not committed scope**; prioritize as product goals evolve.

Cross-references: [GAME_SPEC.md](GAME_SPEC.md) (roadmap & optional mechanics), [.impeccable.md](.impeccable.md) (design follow-ups), [AUDIO_DESIGN.md](AUDIO_DESIGN.md) (music, SFX, haptics), [WOOD_DESIGN_PLAN.md](WOOD_DESIGN_PLAN.md) (wood/visual phases & QA), [LEVELGEN.md](LEVELGEN.md) (difficulty pipeline & generator tuning).

---

## Design

- [x] **Icons alongside or instead of some chrome text** — Reduce label noise; keep clarity for first-time players (tooltips or `aria-label` where text is removed).
- [x] **Audio & haptics** — Background music (optional mute), sound effects for pick/match/tray/loss/win, and **vibration** on supported devices (respect system "reduce motion" / accessibility preferences where applicable). **Done:** ambient loop, SFX pipeline (Web Audio, duck, preload), music + SFX + haptics UI in **Settings** plus **all-sound mute** in the header, `prefers-reduced-motion` default, rate-limit, persistence. Browsers without `navigator.vibrate` (e.g. Firefox Android) show a disabled toggle with explanatory copy. SFX `AudioContext` unlock on capture-phase `pointerdown` for reliable autoplay. Specs: [AUDIO_DESIGN.md](AUDIO_DESIGN.md), [SETTINGS_SPEC.md](SETTINGS_SPEC.md); phase log: [AUDIO_IMPLEMENTATION_PLAN.md](AUDIO_IMPLEMENTATION_PLAN.md).
- [ ] **Vertical-scroll-only level layouts** — Redesign levels / level-select flow so the primary navigation is **vertical scrolling** only (aligns with a calmer mobile reading pattern; may affect board scroll UX and level carousel — see mobile constraints in [TESTING.md](TESTING.md)).
- [x] Rework the chrome to be smaller — **Settings** dialog for display install, full-screen, granular sound, vibrate; **master mute** stays in the header ([SETTINGS_SPEC.md](SETTINGS_SPEC.md)).
- Nicer prize for the last level - a nice animation maybe?

*From repo notes:*

- [ ] **Light theme parity** — Concrete `:root` / `[data-theme="light"]` token set so light mode matches dark polish ([.impeccable.md](.impeccable.md)).
- [ ] **Optional accent shift** — Single primary interactive hue (e.g. warm amber vs teal) after wood surfaces are stable ([.impeccable.md](.impeccable.md)).
- [ ] **Wood plan residual QA** — Phase E tuning: grain asset weight, contrast passes on real devices ([WOOD_DESIGN_PLAN.md](WOOD_DESIGN_PLAN.md) § Phase E, Success criteria).
- [ ] **Optional per-type wood tint** — Subtle `--wood-face` nudges per `data-type` without new saturated colors ([WOOD_DESIGN_PLAN.md](WOOD_DESIGN_PLAN.md)).

---

## Features

- [x] **Internationalization (i18n)** — Extracted user-visible strings (`lib/i18n.js`, `data-i18n*` in `index.html`); locale control (`#locale-select`, persisted + `?lang=`); `dir`/`lang` on `<html>` for RTL-capable locales; scores via `Intl.NumberFormat` (`formatGameInteger`). Add more locales by extending `MESSAGES` and `<option>`s.

*From [GAME_SPEC.md](GAME_SPEC.md) (optional / later):*

- [ ] **Star rating** (1–3) from score or completion speed.
- [ ] **Scrollable world map** for visual progression (vs. current carousel).
- [ ] **Special tiles** (wildcards, locks, etc.) — design hooks only in spec today.
- [ ] **Cloud sync** for progression (optional; offline-first remains default).
- [ ] **Analytics & telemetry** — Level start/finish, retries, power-ups, session length; privacy-safe defaults ([GAME_SPEC.md](GAME_SPEC.md) §10).

---

## Gameplay

- [ ] **Double-tap power move** — Double-tap to clear **adjacent** triplets when all three tiles are **fully visible** (rules & edge cases need spec: timing window, conflict with single-tap queue, undo).
- [ ] **Queue discipline** — **Do not enqueue** taps on tiles that are not tappable (blocked / wrong layer); feedback only, no queue slot consumed.
- [ ] **Difficulty progression (tuning)** — **Scoring v2 is implemented** ([LEVELGEN.md](LEVELGEN.md), `tools/levelgen/score.js`): combined **visibility** at start, **strategic pressure** (slack + rollout), **skill vs chance** dig reveals, small **solver-effort** term; heuristic / depth-k **forced** metrics remain **report-only**. **Remaining work:** tune the level curve with it — adjust generator **batches** / **template & layering** params, optional **`randomPool`** for easy→hard spread, and **`[PLACEHOLDER]` weights** in `score.js` using `levelgen-report.md` + playtests until the curve feels right.

*From [GAME_SPEC.md](GAME_SPEC.md):*

- [ ] **Combo multiplier** when multiple matches occur in quick succession.
- [ ] **Optional move limit** loss condition for special modes.
- [ ] **Hint button** — suggest a safe tile when stuck.
- [ ] **Long-press or dedicated UI** — remaining count per type / light hint.
- [ ] **Drag support** (optional) as an input alternative to tap.

---

## QA / performance

- [ ] **Low-end devices** — Test on weak phones; optionally **throttle CPU / memory** in dev (browser devtools, `chrome://flags`, or profiling builds) and record FPS, jank, OOM, scroll behavior.
- [ ] **Stress scenarios** — Large boards, rapid input, long sessions; compare against spec targets ([GAME_SPEC.md](GAME_SPEC.md) §9: 60 FPS mid-range, low background work).

*From [WOOD_DESIGN_PLAN.md](WOOD_DESIGN_PLAN.md):*

- [ ] Validate no regression in **scroll/layout** and **animation** performance on mid-range mobile after visual changes.

---

## Related docs

| Doc | Relevance |
|-----|-----------|
| [GAME_SPEC.md](GAME_SPEC.md) | Roadmap phases, optional mechanics, platform targets |
| [AUDIO_DESIGN.md](AUDIO_DESIGN.md) | Music, SFX, haptics, mixer, accessibility |
| [AUDIO_IMPLEMENTATION_PLAN.md](AUDIO_IMPLEMENTATION_PLAN.md) | Phased implementation, asset list, generation prompts |
| [.impeccable.md](.impeccable.md) | Brand, themes, future design passes |
| [WOOD_DESIGN_PLAN.md](WOOD_DESIGN_PLAN.md) | Visual system, Phase E QA |
| [LEVELGEN.md](LEVELGEN.md) | Difficulty metrics, generator modes |
| [ANIMATIONS.md](ANIMATIONS.md) | Idle/move queues — relevant if adding double-tap or new feedback |
| [TESTING.md](TESTING.md) | Playwright coverage, mobile viewport expectations |

---
