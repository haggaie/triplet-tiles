/**
 * Background ambient music (HTMLAudioElement). Persists mute + volume in localStorage.
 * Call unlock() once after a user gesture for autoplay policy (iOS / Safari).
 */

const DEFAULT_STATE = {
  musicMuted: false,
  musicVolume: 0.55
};

export function createAudioService({ storageKey, musicUrl }) {
  let audio = null;
  let state = { ...DEFAULT_STATE };
  let unlocked = false;

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
    } catch {
      /* ignore */
    }
  }

  function save() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }

  function ensureAudio() {
    if (!audio) {
      audio = new Audio(musicUrl);
      audio.loop = true;
      audio.preload = 'auto';
    }
    return audio;
  }

  function applyGain() {
    const el = audio;
    if (!el) return;
    const effective = state.musicMuted ? 0 : state.musicVolume;
    el.volume = effective;
  }

  function playIfAllowed() {
    if (!unlocked) return;
    const el = ensureAudio();
    applyGain();
    if (state.musicMuted || state.musicVolume <= 0) {
      el.pause();
      return;
    }
    el.play().catch(() => {
      /* autoplay blocked until gesture */
    });
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    playIfAllowed();
  }

  function setMusicMuted(muted) {
    state.musicMuted = !!muted;
    save();
    applyGain();
    const el = ensureAudio();
    if (state.musicMuted || state.musicVolume <= 0) {
      el.pause();
    } else {
      playIfAllowed();
    }
  }

  function setMusicVolume(v) {
    state.musicVolume = Math.max(0, Math.min(1, Number(v)));
    save();
    applyGain();
    if (state.musicVolume <= 0) {
      ensureAudio().pause();
    } else if (!state.musicMuted) {
      playIfAllowed();
    }
  }

  function getState() {
    return { ...state };
  }

  function reloadFromStorage() {
    load();
    ensureAudio();
    applyGain();
    playIfAllowed();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!audio) return;
      if (document.visibilityState === 'hidden') {
        audio.pause();
      } else {
        playIfAllowed();
      }
    });
  }

  load();

  return {
    unlock,
    setMusicMuted,
    setMusicVolume,
    getState,
    reloadFromStorage,
    /** Apply current gain without starting (after load). */
    applyStoredStateToElement() {
      ensureAudio();
      applyGain();
    },
    isUnlocked: () => unlocked
  };
}
