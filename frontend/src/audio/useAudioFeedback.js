import { useCallback, useEffect, useRef, useState } from 'react';

const AUDIO_PREFS_STORAGE_KEY = 'smartiq.audio.prefs';
const DEFAULT_VOLUME = 0.6;

function clampVolume(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_VOLUME;
  }
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function loadStoredPrefs() {
  try {
    const raw = localStorage.getItem(AUDIO_PREFS_STORAGE_KEY);
    if (!raw) {
      return { muted: false, volume: DEFAULT_VOLUME };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { muted: false, volume: DEFAULT_VOLUME };
    }
    return {
      muted: Boolean(parsed.muted),
      volume: clampVolume(Number(parsed.volume))
    };
  } catch {
    return { muted: false, volume: DEFAULT_VOLUME };
  }
}

function audioContextConstructor() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.AudioContext || window.webkitAudioContext || null;
}

export function useAudioFeedback() {
  const storedPrefs = loadStoredPrefs();
  const [muted, setMuted] = useState(storedPrefs.muted);
  const [volume, setVolumeState] = useState(storedPrefs.volume);
  const contextRef = useRef(null);
  const unlockedRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(
      AUDIO_PREFS_STORAGE_KEY,
      JSON.stringify({ muted, volume: clampVolume(volume) })
    );
  }, [muted, volume]);

  const ensureContext = useCallback(() => {
    const Constructor = audioContextConstructor();
    if (!Constructor) {
      return null;
    }

    if (!contextRef.current) {
      contextRef.current = new Constructor();
    }

    if (contextRef.current.state === 'suspended') {
      contextRef.current.resume().catch(() => {});
    }

    return contextRef.current;
  }, []);

  useEffect(() => {
    function unlockAudio() {
      unlockedRef.current = true;
      ensureContext();
    }

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [ensureContext]);

  const playEnvelope = useCallback((config) => {
    const ctx = ensureContext();
    const effectiveVolume = muted ? 0 : volume;
    if (!ctx || !unlockedRef.current || effectiveVolume <= 0) {
      return;
    }

    const start = ctx.currentTime + (config.offset ?? 0);
    const attack = config.attack ?? 0.02;
    const decay = config.decay ?? 0.2;
    const gainValue = Math.max(0.0001, effectiveVolume * (config.gain ?? 1));
    const stopAt = start + attack + decay + 0.03;

    const oscillator = ctx.createOscillator();
    oscillator.type = config.type ?? 'sine';
    oscillator.frequency.setValueAtTime(config.frequency, start);
    if (config.frequencyTarget && config.frequencyTarget > 0) {
      oscillator.frequency.exponentialRampToValueAtTime(config.frequencyTarget, start + attack + decay);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(stopAt);
  }, [ensureContext, muted, volume]);

  const playRoundIntro = useCallback(() => {
    playEnvelope({ frequency: 280, frequencyTarget: 420, attack: 0.04, decay: 0.26, gain: 0.44, type: 'triangle' });
    playEnvelope({ frequency: 360, frequencyTarget: 560, attack: 0.04, decay: 0.24, gain: 0.34, type: 'triangle', offset: 0.05 });
    playEnvelope({ frequency: 520, frequencyTarget: 760, attack: 0.03, decay: 0.2, gain: 0.3, type: 'sine', offset: 0.1 });
  }, [playEnvelope]);

  const playCorrect = useCallback(() => {
    playEnvelope({ frequency: 620, frequencyTarget: 760, attack: 0.015, decay: 0.15, gain: 0.42, type: 'triangle' });
    playEnvelope({ frequency: 760, frequencyTarget: 920, attack: 0.015, decay: 0.17, gain: 0.34, type: 'sine', offset: 0.045 });
  }, [playEnvelope]);

  const playWrong = useCallback(() => {
    playEnvelope({ frequency: 280, frequencyTarget: 170, attack: 0.02, decay: 0.24, gain: 0.46, type: 'sawtooth' });
    playEnvelope({ frequency: 190, frequencyTarget: 130, attack: 0.02, decay: 0.2, gain: 0.34, type: 'triangle', offset: 0.03 });
  }, [playEnvelope]);

  const setVolume = useCallback((nextVolume) => {
    setVolumeState(clampVolume(nextVolume));
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  return {
    muted,
    volume,
    setVolume,
    toggleMute,
    playRoundIntro,
    playCorrect,
    playWrong
  };
}
