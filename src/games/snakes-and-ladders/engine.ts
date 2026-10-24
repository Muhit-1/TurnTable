import type { GameEngine, PlayerId } from '../../shared/engine';
import { nextInt, randomSeed } from '../../shared/rng';

export const FINAL = 100;

/** Classic board: square where a ladder starts -> where it ends, and the same for snakes. */
export const LADDERS: Record<number, number> = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
};
export const SNAKES: Record<number, number> = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
};

export type SnakesMove = 'roll';

export interface RollResult {
  player: PlayerId;
  roll: number;
  from: number;
  /** square reached by the dice before any snake or ladder */
  landed: number;
  to: number;
  kind: 'move' | 'ladder' | 'snake' | 'blocked';
}

export interface SnakesState {
  /** 0 = off the board, waiting to enter */
  positions: Record<PlayerId, number>;
  current: PlayerId;
  seed: number;
  last: RollResult | null;
  winner: PlayerId | null;
}

export function createSnakes(fixedSeed?: number): GameEngine<SnakesState, SnakesMove> {
  return {
    initialState: () => ({
      positions: { 1: 0, 2: 0 },
      current: 1,
      seed: fixedSeed ?? randomSeed(),
      last: null,
      winner: null,
    }),
    currentPlayer: (s) => s.current,
    legalMoves: (s) => (s.winner === null ? ['roll'] : []),
    applyMove(s, move) {
      if (move !== 'roll' || s.winner !== null) return null;
      const [r, seed] = nextInt(s.seed, 6);
      const roll = r + 1;
      const from = s.positions[s.current];
      const landed = from + roll;
      let to = landed;
      let kind: RollResult['kind'] = 'move';
      if (landed > FINAL) {
        // An exact roll is needed to finish: overshooting means staying put.
        to = from;
        kind = 'blocked';
      } else if (LADDERS[landed] !== undefined) {
        to = LADDERS[landed];
        kind = 'ladder';
      } else if (SNAKES[landed] !== undefined) {
        to = SNAKES[landed];
        kind = 'snake';
      }
      const positions = { ...s.positions, [s.current]: to };
      return {
        positions,
        current: to === FINAL ? s.current : s.current === 1 ? 2 : 1,
        seed,
        last: { player: s.current, roll, from, landed, to, kind },
        winner: to === FINAL ? s.current : null,
      };
    },
    getStatus: (s) => (s.winner === null ? { state: 'playing' } : { state: 'won', winner: s.winner }),
  };
}

export const snakesEngine = createSnakes();

/** Square number -> [row from top, column] on the usual zig-zag 10x10 board (square 1 at bottom-left). */
export function squareToCell(n: number): [number, number] {
  const idx = n - 1;
  const rowFromBottom = Math.floor(idx / 10);
  const within = idx % 10;
  const col = rowFromBottom % 2 === 0 ? within : 9 - within;
  return [9 - rowFromBottom, col];
}
