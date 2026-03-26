/**
 * Music: HTMLAudioElement (loop). SFX: Web Audio one-shots with Bus_SFX gain.
 * Persist music + SFX mute/volume. Call unlock() after a user gesture (autoplay / AudioContext).
 */

const MAX_SFX_VOICES = 6;

const DEFAULT_STATE = {
  musicMuted: false,
  musicVolume: 0.55,
  sfxMuted: false,
  sfxVolume: 0.85
};

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

  function load() {
    state = { ...DEFAULT_STATE };
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
          sfxVolume: state.sfxVolume
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
    const effective = state.musicMuted ? 0 : state.musicVolume;
    el.volume = effective;
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
        sfxVolume: state.sfxVolume
      };
    }
  };
}
