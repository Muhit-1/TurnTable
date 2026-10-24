/**
 * Seedable, pure random numbers (mulberry32). The generator state is a plain number you keep in
 * game state, so shuffles and dice rolls are reproducible in tests and survive undo/redo.
 */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32) | 0;
}

/** Returns [float in [0, 1), next seed]. */
export function nextFloat(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(next ^ (next >>> 15), 1 | next);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Returns [integer in [0, max), next seed]. */
export function nextInt(seed: number, max: number): [number, number] {
  const [f, next] = nextFloat(seed);
  return [Math.floor(f * max), next];
}

/** Fisher–Yates shuffle that does not mutate its input. Returns [shuffled copy, next seed]. */
export function shuffle<T>(items: readonly T[], seed: number): [T[], number] {
  const out = items.slice();
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    let j: number;
    [j, s] = nextInt(s, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return [out, s];
}
