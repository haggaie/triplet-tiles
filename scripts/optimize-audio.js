#!/usr/bin/env node
/**
 * Encode SFX for the web: EBU R128 loudness normalize + Opus (low latency, small files).
 * Requires ffmpeg on PATH or FFMPEG_PATH.
 *
 * Masters: assets/audio/source/sfx_*.wav
 * Outputs: assets/audio/sfx_*.opus (referenced by game.js / sw.js)
 *
 * Tile pick uses a **gentler loudnorm** (lower I, more TP headroom) — full R128 −16 LUFS is a
 * poor fit for ultrashort transients. Celebration cues get post-trim to sit closer to loss.
 *
 * @see package.json scripts optimize:audio, prepare:serve
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'assets', 'audio', 'source');
const OUT_DIR = path.join(ROOT, 'assets', 'audio');

/** Default EBU R128 targets — one-shots longer than a UI tick. */
const LOUDNORM_PROGRAM = 'I=-16:TP=-1.5:LRA=11';
/**
 * Softer norm for very short transients: lower I (less gain chase), wider true-peak ceiling,
 * narrower LRA hint — reduces “crunch” when −16 LUFS pushes a tiny clip.
 */
const LOUDNORM_TRANSIENT = 'I=-22:TP=-2.5:LRA=7';
/** Opus bitrate (VBR ceiling). */
const OPUS_BITRATE = '96k';

/**
 * Extra attenuation after loudnorm (dB). Negative = quieter.
 * `loudnorm` optional; defaults to LOUDNORM_PROGRAM.
 */
const JOBS = [
  {
    wav: 'sfx_tile_pick.wav',
    opus: 'sfx_tile_pick.opus',
    extraGainDb: -5,
    loudnorm: LOUDNORM_TRANSIENT
  },
  { wav: 'sfx_match_clear_a.wav', opus: 'sfx_match_clear_a.opus', extraGainDb: -5 },
  { wav: 'sfx_match_clear_b.wav', opus: 'sfx_match_clear_b.opus', extraGainDb: -5 },
  { wav: 'sfx_match_clear_c.wav', opus: 'sfx_match_clear_c.opus', extraGainDb: -5 },
  { wav: 'sfx_level_win.wav', opus: 'sfx_level_win.opus', extraGainDb: -5 },
  { wav: 'sfx_level_loss.wav', opus: 'sfx_level_loss.opus', extraGainDb: 0 }
];

function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  const r = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.status === 0) return 'ffmpeg';
  return null;
}

function runFfmpeg(ffmpeg, inFile, outFile, extraGainDb, loudnormParams = LOUDNORM_PROGRAM) {
  const vol =
    typeof extraGainDb === 'number' && extraGainDb !== 0 ? `,volume=${extraGainDb}dB` : '';
  const af = `loudnorm=${loudnormParams}${vol}`;
  const args = [
    '-nostdin',
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    inFile,
    '-af',
    af,
    '-c:a',
    'libopus',
    '-b:a',
    OPUS_BITRATE,
    '-application',
    'audio',
    outFile
  ];
  const res = spawnSync(ffmpeg, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout || `ffmpeg exited ${res.status}`);
    return false;
  }
  return true;
}

function main() {
  const ffmpeg = resolveFfmpeg();
  if (!ffmpeg) {
    console.error(
      'ffmpeg not found. Install ffmpeg (e.g. brew install ffmpeg) or set FFMPEG_PATH to the binary.'
    );
    process.exit(1);
  }

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Missing source directory: ${SOURCE_DIR}`);
    process.exit(1);
  }

  let ok = 0;
  for (const job of JOBS) {
    const inPath = path.join(SOURCE_DIR, job.wav);
    const outPath = path.join(OUT_DIR, job.opus);
    if (!fs.existsSync(inPath)) {
      console.error(`Missing source: ${path.relative(ROOT, inPath)}`);
      process.exit(1);
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const prof =
      job.loudnorm === LOUDNORM_TRANSIENT ? 'transient norm' : 'program norm';
    process.stdout.write(`${job.wav} → ${job.opus} (${prof}, ${job.extraGainDb} dB post) … `);
    if (!runFfmpeg(ffmpeg, inPath, outPath, job.extraGainDb, job.loudnorm)) {
      console.error('failed');
      process.exit(1);
    }
    const inSt = fs.statSync(inPath);
    const outSt = fs.statSync(outPath);
    console.log(
      `ok (${(inSt.size / 1024).toFixed(1)} KiB → ${(outSt.size / 1024).toFixed(1)} KiB)`
    );
    ok += 1;
  }
  console.error(`Encoded ${ok} SFX to Opus in ${path.relative(ROOT, OUT_DIR)}/`);
}

main();
