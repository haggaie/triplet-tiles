# SFX masters (WAV)

Place **lossless or WAV exports** here. The game ships **Opus** in the parent folder (`assets/audio/*.opus`), produced by:

```bash
npm run optimize:audio
```

Expected files:

- `sfx_tile_pick.wav`
- `sfx_match_clear_a.wav`, `sfx_match_clear_b.wav`, `sfx_match_clear_c.wav`
- `sfx_level_win.wav`
- `sfx_level_loss.wav`

**Prepare for serving** (levels + optimized audio + `dist/`):

```bash
npm run prepare:serve
```

Requires **ffmpeg** on your PATH (e.g. `brew install ffmpeg`) or set **`FFMPEG_PATH`** to the binary.

`npm run dist` / **`prepare:serve`** copies assets into `dist/` but **skips this folder** so deploy bundles stay small.
