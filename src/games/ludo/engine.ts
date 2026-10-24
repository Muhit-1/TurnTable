import type { GameEngine, PlayerId } from '../../shared/engine';
import { nextInt, randomSeed } from '../../shared/rng';

/**
 * Two-player Ludo. The shared track has 52 squares; player 1 enters at square 0 and player 2 at square 26.
 * A token's progress: -1 = in the yard, 0..50 = steps along the track from its own start square,
 * 51..55 = the home column (private to its owner), 56 = home.
 */
export const TRACK = 52;
export const TOKENS = 4;
export const HOME = 56;
export const LAST_TRACK = 50;
export const START: Record<PlayerId, number> = { 1: 0, 2: 26 };
/** Landing on a start square never captures. */
export const SAFE_SQUARES = [0, 26];
export const MAX_SIXES = 3;

export type LudoMove = { kind: 'roll' } | { kind: 'move'; token: number };

export interface LudoState {
  tokens: Record<PlayerId, number[]>;
  current: PlayerId;
  /** rolled value waiting for a token choice, or null when the player must roll */
  dice: number | null;
  /** consecutive sixes rolled by the current player */
  sixes: number;
  seed: number;
  last: { player: PlayerId; roll: number; note: string } | null;
  winner: PlayerId | null;
}

const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);

/** Absolute track square of a token, or null if it is in the yard, in the home column or home. */
export function trackSquare(player: PlayerId, progress: number): number | null {
  return progress >= 0 && progress <= LAST_TRACK ? (START[player] + progress) % TRACK : null;
}

/** Tokens of `player` that may move with `roll`. */
export function movableTokens(s: Pick<LudoState, 'tokens'>, player: PlayerId, roll: number): number[] {
  return s.tokens[player].flatMap((p, i) => {
    if (p === HOME) return [];
    if (p === -1) return roll === 6 ? [i] : [];
    return p + roll <= HOME ? [i] : [];
  });
}

export function createLudo(fixedSeed?: number): GameEngine<LudoState, LudoMove> {
  const afterTurn = (s: LudoState, roll: number, note: string, extra: boolean): LudoState => {
    const keep = extra && s.sixes + 1 < MAX_SIXES;
    return {
      ...s,
      current: keep ? s.current : other(s.current),
      dice: null,
      sixes: keep ? s.sixes + 1 : 0,
      last: { player: s.current, roll, note },
    };
  };

  return {
    initialState: () => ({
      tokens: { 1: Array(TOKENS).fill(-1), 2: Array(TOKENS).fill(-1) },
      current: 1,
      dice: null,
      sixes: 0,
      seed: fixedSeed ?? randomSeed(),
      last: null,
      winner: null,
    }),
    currentPlayer: (s) => s.current,
    legalMoves(s) {
      if (s.winner !== null) return [];
      if (s.dice === null) return [{ kind: 'roll' }];
      return movableTokens(s, s.current, s.dice).map((token) => ({ kind: 'move' as const, token }));
    },
    applyMove(s, move) {
      if (s.winner !== null || !move) return null;
      if (move.kind === 'roll') {
        if (s.dice !== null) return null;
        const [r, seed] = nextInt(s.seed, 6);
        const roll = r + 1;
        const base = { ...s, seed };
        if (s.sixes + 1 >= MAX_SIXES && roll === 6) {
          return afterTurn(base, roll, 'third six in a row: turn lost', false);
        }
        if (movableTokens(base, s.current, roll).length === 0) {
          return afterTurn(base, roll, 'no move possible', roll === 6);
        }
        return { ...base, dice: roll, last: { player: s.current, roll, note: 'choose a token' } };
      }
      if (move.kind === 'move') {
        const roll = s.dice;
        if (roll === null || !movableTokens(s, s.current, roll).includes(move.token)) return null;
        const mine = s.tokens[s.current].slice();
        const theirs = s.tokens[other(s.current)].slice();
        const from = mine[move.token];
        const to = from === -1 ? 0 : from + roll;
        mine[move.token] = to;
        let note = from === -1 ? 'enters the board' : to === HOME ? 'reaches home!' : 'moves';
        const sq = trackSquare(s.current, to);
        if (sq !== null && !SAFE_SQUARES.includes(sq)) {
          let captured = 0;
          theirs.forEach((p, i) => {
            if (trackSquare(other(s.current), p) === sq) {
              theirs[i] = -1;
              captured++;
            }
          });
          if (captured) note = `captures ${captured} token${captured > 1 ? 's' : ''}!`;
        }
        const tokens = { ...s.tokens, [s.current]: mine, [other(s.current)]: theirs };
        if (mine.every((p) => p === HOME)) {
          return {
            ...s,
            tokens,
            dice: null,
            winner: s.current,
            last: { player: s.current, roll, note: 'all tokens home!' },
          };
        }
        return afterTurn({ ...s, tokens }, roll, note, roll === 6);
      }
      return null;
    },
    getStatus: (s) => (s.winner === null ? { state: 'playing' } : { state: 'won', winner: s.winner }),
  };
}

export const ludoEngine = createLudo();
