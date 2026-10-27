/**
 * Web Audio API based sound synthesizer for calls and chat notifications.
 * Pure native audio synthesis — no external MP3/WAV files required.
 */

let audioCtx: AudioContext | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;
let activeOscillators: OscillatorNode[] = [];

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function stopCallSounds() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  for (const osc of activeOscillators) {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // already stopped
    }
  }
  activeOscillators = [];
}

/** Play a single dual-frequency burst (cadence slice) */
function playDualToneBurst(freq1: number, freq2: number, durationSec: number, gainValue = 0.08) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(gainValue, now + 0.05);
  gainNode.gain.setValueAtTime(gainValue, now + durationSec - 0.05);
  gainNode.gain.linearRampToValueAtTime(0, now + durationSec);
  gainNode.connect(ctx.destination);

  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq1, now);
  osc1.connect(gainNode);

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq2, now);
  osc2.connect(gainNode);

  osc1.start(now);
  osc2.start(now);

  osc1.stop(now + durationSec);
  osc2.stop(now + durationSec);

  activeOscillators.push(osc1, osc2);

  setTimeout(
    () => {
      activeOscillators = activeOscillators.filter((o) => o !== osc1 && o !== osc2);
    },
    durationSec * 1000 + 100
  );
}

/** Incoming call telephone ring: 440Hz + 480Hz, 1.6s ring, 2.4s pause */
export function playIncomingRingtone() {
  stopCallSounds();
  playDualToneBurst(440, 480, 1.6, 0.1);
  ringInterval = setInterval(() => {
    playDualToneBurst(440, 480, 1.6, 0.1);
  }, 4000);
}

/** Outgoing call ringback: 440Hz + 480Hz, 1s tone, 3s pause */
export function playRingbackTone() {
  stopCallSounds();
  playDualToneBurst(440, 480, 1.0, 0.06);
  ringInterval = setInterval(() => {
    playDualToneBurst(440, 480, 1.0, 0.06);
  }, 4000);
}

/** Call connected cheerful chime */
export function playCallConnectedTone() {
  stopCallSounds();
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  const noteDuration = 0.12;

  notes.forEach((freq, idx) => {
    const startTime = ctx.currentTime + idx * noteDuration;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);
    gainNode.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.connect(gainNode);

    osc.start(startTime);
    osc.stop(startTime + noteDuration);
  });
}

/** Call ended hangup beep */
export function playCallEndedTone() {
  stopCallSounds();
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.08, now);
  gainNode.gain.linearRampToValueAtTime(0, now + 0.25);
  gainNode.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.linearRampToValueAtTime(330, now + 0.25);
  osc.connect(gainNode);

  osc.start(now);
  osc.stop(now + 0.25);
}

/** Pleasant soft notification ding when a message arrives */
export function playNewMessageChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.06, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  gainNode.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now); // A5
  osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12); // C6
  osc.connect(gainNode);

  osc.start(now);
  osc.stop(now + 0.35);
}
