/**
 * Music: HTMLAudioElement (loop). SFX: Web Audio one-shots with Bus_SFX gain.
 * Haptics: `navigator.vibrate` when enabled (see AUDIO_DESIGN.md patterns).
 * Persist music, SFX, and haptics toggle. Call unlock() after a user gesture (autoplay / AudioContext).
 */

const MAX_SFX_VOICES = 6;

/** Min gap between haptic fires; win/loss may defer past the gap (AUDIO_DESIGN.md). */
const MIN_HAPTIC_GAP_MS = 65;

/** ~−3 dB duck (−2 to −4 dB per audio design spec). */
const MUSIC_DUCK_DB = -3;
const MUSIC_DUCK_LINEAR = 10 ** (MUSIC_DUCK_DB / 20);
const DUCK_ATTACK_MS = 200;
const DUCK_RELEASE_MS = 280;
/** Hold at ducked level while the one-shot plays (match short, win longer). */
const DUCK_HOLD_MATCH_MS = 380;
const DUCK_HOLD_WIN_MS = 1200;

const DEFAULT_STATE = {
  musicMuted: false,
  musicVolume: 0.55,
  sfxMuted: false,
  sfxVolume: 0.85,
  hapticsEnabled: true
};

/** @readonly */
export const HAPTIC_KIND = {
  PICK: 'pick',
  MATCH: 'match',
  WIN: 'win',
  LOSS: 'loss'
};

/** @type {Record<string, number | number[]>} */
const HAPTIC_PATTERNS = {
  [HAPTIC_KIND.PICK]: [12],
  [HAPTIC_KIND.MATCH]: [15, 30, 15],
  [HAPTIC_KIND.WIN]: [20, 40, 20],
  [HAPTIC_KIND.LOSS]: [35]
};

const HAPTIC_HIGH_PRIORITY = new Set([HAPTIC_KIND.WIN, HAPTIC_KIND.LOSS]);

function defaultHapticsFromReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** @readonly */
export const SFX_IDS = {
  TILE_PICK: 'SFX/UI/Tile_Pick',
  MATCH_CLEAR: 'SFX/Gameplay/Match_Clear',
  LEVEL_WIN: 'SFX/Meta/Level_Win',
  LEVEL_LOSS: 'SFX/Meta/Level_Loss'
};

/**
 * @param {{ storageKey: string, musicUrl: string, sfxUrlMap: Record<string, string | string[]> }} opts
 * `sfxUrlMap` keys use {@link SFX_IDS}; `MATCH_CLEAR` maps to an array of variant URLs.
 */
export function createAudioService({ storageKey, musicUrl, sfxUrlMap }) {
  let audio = null;
  let state = { ...DEFAULT_STATE };
  let unlocked = false;

  let lastHapticInvoke = 0;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let hapticScheduleTimer = null;

  /** @type {AudioContext | null} */
  let sfxContext = null;
  /** @type {GainNode | null} */
  let sfxBus = null;
  /** @type {Map<string, AudioBuffer>} */
  const sfxBuffers = new Map();
  let sfxBuffersLoaded = false;
  let sfxLoadPromise = null;
  /** @type {AudioBufferSourceNode[]} */
  let activeSources = [];

  /** Music volume multiplier (1 = no duck). Applied on top of user music level. */
  let musicDuckMult = 1;
  /** @type {number | null} */
  let duckAnimRaf = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let duckHoldTimeout = null;

  function load() {
    state = { ...DEFAULT_STATE };
    state.hapticsEnabled = defaultHapticsFromReducedMotion();
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.musicMuted === 'boolean') state.musicMuted = parsed.musicMuted;
      if (typeof parsed.musicVolume === 'number' && !Number.isNaN(parsed.musicVolume)) {
        state.musicVolume = Math.max(0, Math.min(1, parsed.musicVolume));
      }
      if (typeof parsed.sfxMuted === 'boolean') state.sfxMuted = parsed.sfxMuted;
      if (typeof parsed.sfxVolume === 'number' && !Number.isNaN(parsed.sfxVolume)) {
        state.sfxVolume = Math.max(0, Math.min(1, parsed.sfxVolume));
      }
      if (typeof parsed.hapticsEnabled === 'boolean') state.hapticsEnabled = parsed.hapticsEnabled;
    } catch {
      /* ignore */
    }
  }

  function save() {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          musicMuted: state.musicMuted,
          musicVolume: state.musicVolume,
          sfxMuted: state.sfxMuted,
          sfxVolume: state.sfxVolume,
          hapticsEnabled: state.hapticsEnabled
        })
      );
    } catch {
      /* ignore */
    }
  }

  function ensureMusic() {
    if (!audio) {
      audio = new Audio(musicUrl);
      audio.loop = true;
      audio.preload = 'auto';
    }
    return audio;
  }

  function applyMusicGain() {
    const el = audio;
    if (!el) return;
    const base = state.musicMuted ? 0 : state.musicVolume;
    el.volume = base * musicDuckMult;
  }

  function cancelMusicDuckTimers() {
    if (duckAnimRaf != null) {
      cancelAnimationFrame(duckAnimRaf);
      duckAnimRaf = null;
    }
    if (duckHoldTimeout != null) {
      clearTimeout(duckHoldTimeout);
      duckHoldTimeout = null;
    }
  }

  function rampMusicDuckMult(from, to, durationMs, onDone) {
    if (duckAnimRaf != null) {
      cancelAnimationFrame(duckAnimRaf);
      duckAnimRaf = null;
    }
    if (durationMs <= 0) {
      musicDuckMult = to;
      applyMusicGain();
      onDone?.();
      return;
    }
    const t0 = performance.now();
    function frame(now) {
      const u = Math.min(1, (now - t0) / durationMs);
      musicDuckMult = from + (to - from) * u;
      applyMusicGain();
      if (u < 1) {
        duckAnimRaf = requestAnimationFrame(frame);
      } else {
        duckAnimRaf = null;
        onDone?.();
      }
    }
    duckAnimRaf = requestAnimationFrame(frame);
  }

  /**
   * Briefly lower music on match / win so SFX read clearly.
   * @param {string} eventId
   */
  function triggerMusicDuckForEvent(eventId) {
    if (eventId !== SFX_IDS.MATCH_CLEAR && eventId !== SFX_IDS.LEVEL_WIN) return;
    if (state.musicMuted || state.musicVolume <= 0) return;

    cancelMusicDuckTimers();

    const holdMs =
      eventId === SFX_IDS.LEVEL_WIN ? DUCK_HOLD_WIN_MS : DUCK_HOLD_MATCH_MS;
    const from = musicDuckMult;
    const to = MUSIC_DUCK_LINEAR;
    const attackMs = Math.abs(from - to) < 0.02 ? 0 : DUCK_ATTACK_MS;

    const scheduleRelease = () => {
      duckHoldTimeout = setTimeout(() => {
        duckHoldTimeout = null;
        rampMusicDuckMult(musicDuckMult, 1, DUCK_RELEASE_MS, () => {});
      }, holdMs);
    };

    if (attackMs === 0) {
      musicDuckMult = to;
      applyMusicGain();
      scheduleRelease();
    } else {
      rampMusicDuckMult(from, to, attackMs, scheduleRelease);
    }
  }

  function playIfAllowed() {
    if (!unlocked) return;
    const el = ensureMusic();
    applyMusicGain();
    if (state.musicMuted || state.musicVolume <= 0) {
      el.pause();
      return;
    }
    el.play().catch(() => {
      /* autoplay blocked until gesture */
    });
  }

  function ensureSfxContext() {
    if (!sfxContext) {
      sfxContext = new AudioContext();
      sfxBus = sfxContext.createGain();
      sfxBus.connect(sfxContext.destination);
      applySfxBusGain();
    }
    return sfxContext;
  }

  function applySfxBusGain() {
    if (!sfxBus) return;
    const effective = state.sfxMuted ? 0 : state.sfxVolume;
    sfxBus.gain.value = effective;
  }

  async function loadSfxBuffers(innerCtx) {
    if (sfxBuffersLoaded) return;

    const jobs = [];
    for (const [id, urlOrArr] of Object.entries(sfxUrlMap)) {
      if (Array.isArray(urlOrArr)) {
        urlOrArr.forEach((url, i) => {
          jobs.push(
            (async () => {
              const res = await fetch(url);
              if (!res.ok) throw new Error(`SFX fetch ${id}:${i} ${res.status}`);
              const arr = await res.arrayBuffer();
              const buf = await innerCtx.decodeAudioData(arr.slice(0));
              sfxBuffers.set(`${id}__${i}`, buf);
            })()
          );
        });
      } else {
        jobs.push(
          (async () => {
            const res = await fetch(urlOrArr);
            if (!res.ok) throw new Error(`SFX fetch ${id} ${res.status}`);
            const arr = await res.arrayBuffer();
            const buf = await innerCtx.decodeAudioData(arr.slice(0));
            sfxBuffers.set(id, buf);
          })()
        );
      }
    }

    await Promise.all(jobs);
    sfxBuffersLoaded = true;
  }

  function prepareSfx() {
    if (!unlocked) return Promise.resolve();
    if (sfxLoadPromise) return sfxLoadPromise;

    sfxLoadPromise = (async () => {
      try {
        const ctx = ensureSfxContext();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        await loadSfxBuffers(ctx);
      } catch {
        sfxBuffersLoaded = false;
        sfxBuffers.clear();
        sfxLoadPromise = null;
      }
    })();

    return sfxLoadPromise;
  }

  function trimVoices() {
    while (activeSources.length >= MAX_SFX_VOICES) {
      const src = activeSources.shift();
      try {
        src.stop(0);
      } catch {
        /* already stopped */
      }
    }
  }

  /** ~±1 dB → linear gain */
  function randomGainJitter() {
    const db = Math.random() * 2 - 1;
    return 10 ** (db / 20);
  }

  /**
   * @param {string} eventId
   */
  async function playSfxAsync(eventId) {
    if (!unlocked || state.sfxMuted || state.sfxVolume <= 0) return;
    await prepareSfx();
    if (!sfxContext || !sfxBus || !sfxBuffersLoaded) return;

    let buffer = null;
    if (eventId === SFX_IDS.MATCH_CLEAR) {
      const n = (sfxUrlMap[SFX_IDS.MATCH_CLEAR] || []).length;
      if (n <= 0) return;
      const i = Math.floor(Math.random() * n);
      buffer = sfxBuffers.get(`${eventId}__${i}`);
    } else {
      buffer = sfxBuffers.get(eventId);
    }
    if (!buffer) return;

    if (eventId === SFX_IDS.MATCH_CLEAR || eventId === SFX_IDS.LEVEL_WIN) {
      triggerMusicDuckForEvent(eventId);
    }

    trimVoices();

    const src = sfxContext.createBufferSource();
    const g = sfxContext.createGain();
    src.buffer = buffer;
    const rate = 1 + (Math.random() * 0.06 - 0.03);
    src.playbackRate.value = Math.max(0.5, Math.min(2, rate));

    /* Bus holds user SFX volume; inner gain is ~±1 dB jitter (audio design spec). */
    g.gain.value = randomGainJitter();

    src.connect(g);
    g.connect(sfxBus);

    activeSources.push(src);
    src.onended = () => {
      activeSources = activeSources.filter(s => s !== src);
    };

    const t0 = sfxContext.currentTime;
    try {
      src.start(t0);
    } catch {
      /* ignore */
    }
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    void prepareSfx();
    playIfAllowed();
  }

  function setMusicMuted(muted) {
    state.musicMuted = !!muted;
    save();
    applyMusicGain();
    const el = ensureMusic();
    if (state.musicMuted || state.musicVolume <= 0) {
      el.pause();
    } else {
      playIfAllowed();
    }
  }

  function setMusicVolume(v) {
    state.musicVolume = Math.max(0, Math.min(1, Number(v)));
    save();
    applyMusicGain();
    if (state.musicVolume <= 0) {
      ensureMusic().pause();
    } else if (!state.musicMuted) {
      playIfAllowed();
    }
  }

  function setSfxMuted(muted) {
    state.sfxMuted = !!muted;
    save();
    applySfxBusGain();
  }

  function setSfxVolume(v) {
    state.sfxVolume = Math.max(0, Math.min(1, Number(v)));
    save();
    applySfxBusGain();
  }

  function setHapticsEnabled(enabled) {
    state.hapticsEnabled = !!enabled;
    save();
  }

  /**
   * @param {string} kind One of {@link HAPTIC_KIND} values.
   */
  function triggerHaptic(kind) {
    if (!state.hapticsEnabled) return;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    const pattern = HAPTIC_PATTERNS[kind];
    if (!pattern) return;

    const run = () => {
      hapticScheduleTimer = null;
      lastHapticInvoke = performance.now();
      try {
        navigator.vibrate(pattern);
      } catch {
        /* ignore */
      }
    };

    const now = performance.now();
    const elapsed = now - lastHapticInvoke;
    if (elapsed >= MIN_HAPTIC_GAP_MS) {
      run();
      return;
    }
    if (!HAPTIC_HIGH_PRIORITY.has(kind)) return;
    if (hapticScheduleTimer != null) clearTimeout(hapticScheduleTimer);
    hapticScheduleTimer = setTimeout(run, MIN_HAPTIC_GAP_MS - elapsed);
  }

  function playSfx(eventId) {
    void playSfxAsync(eventId);
  }

  function getState() {
    return { ...state };
  }

  function reloadFromStorage() {
    load();
    ensureMusic();
    applyMusicGain();
    if (sfxBus) applySfxBusGain();
    playIfAllowed();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!audio) return;
      if (document.visibilityState === 'hidden') {
        if (hapticScheduleTimer != null) {
          clearTimeout(hapticScheduleTimer);
          hapticScheduleTimer = null;
        }
        cancelMusicDuckTimers();
        musicDuckMult = 1;
        applyMusicGain();
        audio.pause();
        if (sfxContext && sfxContext.state === 'running') {
          void sfxContext.suspend();
        }
      } else {
        playIfAllowed();
        if (sfxContext && sfxContext.state === 'suspended' && unlocked) {
          void sfxContext.resume();
        }
      }
    });
  }

  load();

  return {
    unlock,
    setMusicMuted,
    setMusicVolume,
    setSfxMuted,
    setSfxVolume,
    setHapticsEnabled,
    triggerHaptic,
    playSfx,
    getState,
    reloadFromStorage,
    applyStoredStateToElement() {
      ensureMusic();
      applyMusicGain();
      applySfxBusGain();
    },
    isUnlocked: () => unlocked,
    /** For tests / debugging (Playwright). */
    getDiagnostics() {
      return {
        unlocked,
        sfxBuffersLoaded,
        sfxContextState: sfxContext?.state ?? null,
        sfxBusGain: sfxBus?.gain.value ?? null,
        sfxMuted: state.sfxMuted,
        sfxVolume: state.sfxVolume,
        musicDuckMult,
        hapticsEnabled: state.hapticsEnabled
      };
    }
  };
}
