/**
 * Web Audio API synthesizer for the BAYNIKS Rider mobile app.
 * Provides auditory cues for dispatch offers, keypad entries, acceptances, and errors.
 * Gracefully silent when AudioContext is unsupported (e.g., SSR, test environments).
 */

export type AudioChimeWaveform = 'sine' | 'triangle' | 'square' | 'sawtooth';

export function playChime(
  frequency: number,
  durationSeconds: number = 0.2,
  waveform: AudioChimeWaveform = 'sine',
  volume: number = 0.11
): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = waveform;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSeconds);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationSeconds);
  } catch {
    // Audio context may be restricted before user gesture or in headless environments
  }
}

/** 780 Hz triangle chime for incoming dispatch requests */
export function playDispatchOfferChime(): void {
  playChime(780, 0.24, 'triangle');
}

/** 960 Hz sine chime for mission acceptance */
export function playMissionAcceptChime(): void {
  playChime(960, 0.22, 'sine');
}

/** 650 Hz subtle sine chime for numeric keypad button presses */
export function playKeypadChime(): void {
  playChime(650, 0.07, 'sine', 0.08);
}

/** 1040 Hz bright sine chime for verified delivery completion */
export function playVerifiedSuccessChime(): void {
  playChime(1040, 0.26, 'sine');
}

/** 230 Hz sawtooth buzz for incorrect PIN entry or capacity lock warnings */
export function playErrorChime(): void {
  playChime(230, 0.25, 'sawtooth');
}

/** 620 Hz sawtooth alarm tone for Roadside Emergency SOS */
export function playSosChime(): void {
  playChime(620, 0.3, 'sawtooth');
}

/** 980 Hz sine chime for instant bank cashout settlement */
export function playCashoutSuccessChime(): void {
  playChime(980, 0.22, 'sine');
}

