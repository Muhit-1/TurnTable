import type { Level } from '../../shared/level';
import { nextInt } from '../../shared/rng';
import { type BattleshipMove, type BattleshipState, isSunk, SIZE, shipAt } from './engine';

const rc = (i: number): [number, number] => [Math.floor(i / SIZE), i % SIZE];
const nb = (i: number): number[] => {
  const [r, c] = rc(i);
  return [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ]
    .filter(([a, b]) => a >= 0 && a < SIZE && b >= 0 && b < SIZE)
    .map(([a, b]) => a * SIZE + b);
};

/** Placement is random; firing hunts on a checkerboard and, after a hit, works along the line of hits. */
export function getBestMove(s: BattleshipState, level: Level = 'hard'): BattleshipMove {
  if (s.phase === 'place') return { kind: 'randomize' };
  const me = s.current;
  const opp = me === 1 ? 2 : 1;
  const shots = s.shots[me];
  const free = (i: number) => shots[i] === null;

  // hits that belong to ships that have not sunk yet (sinkings are announced, so this is public knowledge)
  const open = shots.flatMap((x, i) => {
    if (x !== 'hit') return [];
    const ship = shipAt(s.fleets[opp], i);
    return ship && !isSunk(ship, shots) ? [i] : [];
  });

  // easy fires blindly; medium finishes ships it has hit but searches without the checkerboard pattern
  if (level === 'easy') {
    const all = shots.flatMap((_, i) => (free(i) ? [i] : []));
    return { kind: 'fire', cell: all[nextInt(s.seed, all.length)[0]] };
  }

  if (open.length) {
    const candidates: number[] = [];
    for (const h of open) {
      const [r, c] = rc(h);
      for (const o of open) {
        if (o === h) continue;
        const [r2, c2] = rc(o);
        if (r === r2)
          for (const dc of [-1, 1]) {
            const cc = c + dc;
            if (cc >= 0 && cc < SIZE && free(r * SIZE + cc) && Math.abs(c2 - c) === 1)
              candidates.push(r * SIZE + cc);
          }
        if (c === c2)
          for (const dr of [-1, 1]) {
            const rr = r + dr;
            if (rr >= 0 && rr < SIZE && free(rr * SIZE + c) && Math.abs(r2 - r) === 1)
              candidates.push(rr * SIZE + c);
          }
      }
    }
    const pool = candidates.length ? candidates : open.flatMap((h) => nb(h).filter(free));
    if (pool.length) return { kind: 'fire', cell: pool[nextInt(s.seed, pool.length)[0]] };
  }

  const all = shots.flatMap((_, i) => (free(i) ? [i] : []));
  const parity = all.filter((i) => (rc(i)[0] + rc(i)[1]) % 2 === 0);
  const pool = level === 'hard' && parity.length ? parity : all;
  return { kind: 'fire', cell: pool[nextInt(s.seed, pool.length)[0]] };
}
