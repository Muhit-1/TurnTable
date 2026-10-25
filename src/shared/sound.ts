import { loadJson, saveJson } from './storage';

/**
 * Soft, short "tong" sounds made with the Web Audio API (no audio files). One quiet bell-like note per move,
 * a rising pair for a win, a falling one for undo. Muted state is remembered; the audio context is only created
 * after a user gesture, as browsers require.
 */
const KEY = 'sound:muted';
let ctx: AudioContext | null = null;
let muted = loadJson<boolean>(KEY) === true;
let last = 0;
const listeners = new Set<() => void>();

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    typeof window !== 'undefined'
      ? (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

/** One soft bell note: a sine fundamental plus a quiet inharmonic partial, fast attack, gentle decay. */
function tong(freq: number, { at = 0, gain = 0.09, decay = 0.45 } = {}): void {
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const t = c.currentTime + at;
  for (const [mult, level] of [
    [1, 1],
    [2.76, 0.18],
  ] as const) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * level, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay * (mult === 1 ? 1 : 0.5));
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }
}

/** Skip a sound when another fired a moment ago (a move plus the click that caused it). */
function gate(ms = 70): boolean {
  const now = Date.now();
  if (muted || now - last < ms) return false;
  last = now;
  return true;
}

export const sfx = {
  /** A piece is placed. Player 1 is a little lower than player 2 so turns are audible. */
  move(player: 1 | 2 = 1): void {
    if (gate()) tong(player === 1 ? 196 : 247);
  },
  /** Any other button press. */
  tick(): void {
    if (gate(90)) tong(330, { gain: 0.04, decay: 0.18 });
  },
  undo(): void {
    if (gate()) tong(165, { gain: 0.06, decay: 0.3 });
  },
  win(): void {
    if (muted) return;
    last = Date.now();
    for (const [i, f] of [262, 330, 392, 523].entries()) tong(f, { at: i * 0.13, gain: 0.08, decay: 0.7 });
  },
  draw(): void {
    if (muted) return;
    last = Date.now();
    tong(220, { decay: 0.6 });
    tong(196, { at: 0.18, decay: 0.7 });
  },
};

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  saveJson(KEY, next);
  for (const l of listeners) l();
}

/** For useSyncExternalStore. */
export function subscribeMuted(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
