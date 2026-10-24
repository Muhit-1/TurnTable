import type { GameEngine, PlayerId } from '../../shared/engine';
import { nextInt, randomSeed } from '../../shared/rng';

/**
 * Points are indexed 0-23. Positive numbers are player 1's checkers, negative are player 2's.
 * Player 1 moves from high to low indexes (home board 0-5, bearing off past index 0);
 * player 2 moves from low to high (home board 18-23, bearing off past index 23).
 * Not implemented: the doubling cube and gammon/backgammon scoring (a win is a win).
 */
export const POINTS = 24;
export const CHECKERS = 15;
export const BAR = 'bar';
export const OFF = 'off';

export type BgMove =
  | { kind: 'roll' }
  | { kind: 'move'; from: number | typeof BAR; to: number | typeof OFF; die: number };

export interface BgState {
  points: number[];
  bar: Record<PlayerId, number>;
  off: Record<PlayerId, number>;
  current: PlayerId;
  /** dice still to be played this turn (empty = the player must roll) */
  dice: number[];
  seed: number;
  last: { player: PlayerId; dice: number[]; note: string } | null;
  winner: PlayerId | null;
}

const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);
const dirOf = (p: PlayerId) => (p === 1 ? -1 : 1);
export const countAt = (points: number[], p: PlayerId, i: number) =>
  p === 1 ? Math.max(points[i], 0) : Math.max(-points[i], 0);

export function startingPoints(): number[] {
  const pts = Array<number>(POINTS).fill(0);
  // player 1 (24-point = index 23, 13-point = 12, 8-point = 7, 6-point = 5); player 2 mirrors it
  pts[23] = 2;
  pts[12] = 5;
  pts[7] = 3;
  pts[5] = 5;
  pts[0] = -2;
  pts[11] = -5;
  pts[16] = -3;
  pts[18] = -5;
  return pts;
}

type Step = { from: number | typeof BAR; to: number | typeof OFF };

const allHome = (s: Pick<BgState, 'points' | 'bar'>, p: PlayerId) => {
  if (s.bar[p] > 0) return false;
  for (let i = 0; i < POINTS; i++) {
    if (countAt(s.points, p, i) === 0) continue;
    if (p === 1 ? i > 5 : i < 18) return false;
  }
  return true;
};

/** Every single checker move available with exactly this die value (ignoring "use both dice" rules). */
export function stepsFor(s: Pick<BgState, 'points' | 'bar'>, p: PlayerId, die: number): Step[] {
  const opp = other(p);
  const open = (i: number) => countAt(s.points, opp, i) < 2;
  if (s.bar[p] > 0) {
    const to = p === 1 ? POINTS - die : die - 1;
    return open(to) ? [{ from: BAR, to }] : [];
  }
  const steps: Step[] = [];
  const home = allHome(s, p);
  for (let i = 0; i < POINTS; i++) {
    if (countAt(s.points, p, i) === 0) continue;
    const t = i + dirOf(p) * die;
    if (t >= 0 && t < POINTS) {
      if (open(t)) steps.push({ from: i, to: t });
      continue;
    }
    if (!home) continue;
    const dist = p === 1 ? i + 1 : POINTS - i;
    if (die === dist) steps.push({ from: i, to: OFF });
    else if (die > dist) {
      // a larger die may bear off only from the farthest occupied point
      let farther = false;
      for (let j = 0; j < POINTS; j++) {
        if (countAt(s.points, p, j) > 0 && (p === 1 ? j > i : j < i)) farther = true;
      }
      if (!farther) steps.push({ from: i, to: OFF });
    }
  }
  return steps;
}

export function applyStep(s: BgState, p: PlayerId, step: Step): BgState {
  const points = s.points.slice();
  const bar = { ...s.bar };
  const off = { ...s.off };
  const sign = p === 1 ? 1 : -1;
  if (step.from === BAR) bar[p]--;
  else points[step.from] -= sign;
  if (step.to === OFF) off[p]++;
  else {
    const opp = other(p);
    if (countAt(points, opp, step.to) === 1) {
      points[step.to] = 0;
      bar[opp]++;
    }
    points[step.to] += sign;
  }
  return { ...s, points, bar, off };
}

const key = (s: BgState, dice: number[]) =>
  `${s.current}|${s.points.join(',')}|${s.bar[1]}${s.bar[2]}|${dice.slice().sort().join('')}`;

/** Largest number of the remaining dice that can still be played from this position. */
function maxPlayable(s: BgState, dice: number[], memo = new Map<string, number>()): number {
  if (dice.length === 0) return 0;
  const k = key(s, dice);
  const hit = memo.get(k);
  if (hit !== undefined) return hit;
  let best = 0;
  for (const d of new Set(dice)) {
    const rest = dice.slice();
    rest.splice(rest.indexOf(d), 1);
    for (const step of stepsFor(s, s.current, d)) {
      best = Math.max(best, 1 + maxPlayable(applyStep(s, s.current, step), rest, memo));
      if (best === dice.length) {
        memo.set(k, best);
        return best;
      }
    }
  }
  memo.set(k, best);
  return best;
}

export function pipCount(s: Pick<BgState, 'points' | 'bar'>, p: PlayerId): number {
  let pips = s.bar[p] * 25;
  for (let i = 0; i < POINTS; i++) pips += countAt(s.points, p, i) * (p === 1 ? i + 1 : POINTS - i);
  return pips;
}

export function createBackgammon(fixedSeed?: number): GameEngine<BgState, BgMove> {
  const endTurnIfStuck = (s: BgState): BgState => {
    if (s.winner !== null) return s;
    if (s.dice.length === 0 || maxPlayable(s, s.dice) === 0)
      return { ...s, current: other(s.current), dice: [] };
    return s;
  };

  const legal = (s: BgState): BgMove[] => {
    if (s.winner !== null) return [];
    if (s.dice.length === 0) return [{ kind: 'roll' }];
    const memo = new Map<string, number>();
    const total = maxPlayable(s, s.dice, memo);
    const moves: Extract<BgMove, { kind: 'move' }>[] = [];
    for (const die of new Set(s.dice)) {
      const rest = s.dice.slice();
      rest.splice(rest.indexOf(die), 1);
      for (const step of stepsFor(s, s.current, die)) {
        if (1 + maxPlayable(applyStep(s, s.current, step), rest, memo) === total)
          moves.push({ kind: 'move', ...step, die });
      }
    }
    // When only one die can be played and either could be, the larger one must be used.
    if (total === 1 && s.dice.length === 2 && s.dice[0] !== s.dice[1]) {
      const big = Math.max(...s.dice);
      if (moves.some((m) => m.die === big)) return moves.filter((m) => m.die === big);
    }
    return moves;
  };

  return {
    initialState: () => ({
      points: startingPoints(),
      bar: { 1: 0, 2: 0 },
      off: { 1: 0, 2: 0 },
      current: 1,
      dice: [],
      seed: fixedSeed ?? randomSeed(),
      last: null,
      winner: null,
    }),
    currentPlayer: (s) => s.current,
    legalMoves: legal,
    applyMove(s, move) {
      if (s.winner !== null || !move) return null;
      if (move.kind === 'roll') {
        if (s.dice.length > 0) return null;
        let seed = s.seed;
        let a: number;
        let b: number;
        [a, seed] = nextInt(seed, 6);
        [b, seed] = nextInt(seed, 6);
        const dice = a === b ? [a + 1, a + 1, a + 1, a + 1] : [a + 1, b + 1];
        const rolled: BgState = {
          ...s,
          seed,
          dice,
          last: { player: s.current, dice: [a + 1, b + 1], note: 'rolled' },
        };
        if (maxPlayable(rolled, dice) === 0) {
          return {
            ...rolled,
            current: other(s.current),
            dice: [],
            last: { player: s.current, dice: [a + 1, b + 1], note: 'no legal move' },
          };
        }
        return rolled;
      }
      if (move.kind !== 'move' || s.dice.length === 0) return null;
      const ok = legal(s).some(
        (m) => m.kind === 'move' && m.from === move.from && m.to === move.to && m.die === move.die,
      );
      if (!ok) return null;
      const rest = s.dice.slice();
      rest.splice(rest.indexOf(move.die), 1);
      const moved = applyStep(s, s.current, { from: move.from, to: move.to });
      const next: BgState = { ...moved, dice: rest };
      if (next.off[s.current] === CHECKERS) return { ...next, dice: [], winner: s.current };
      return endTurnIfStuck(next);
    },
    getStatus: (s) => (s.winner === null ? { state: 'playing' } : { state: 'won', winner: s.winner }),
  };
}

export const backgammonEngine = createBackgammon();
