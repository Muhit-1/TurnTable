import type { GameEngine, Outcome, PlayerId } from '../../shared/engine';
import { randomSeed, shuffle } from '../../shared/rng';

/** A card index to flip, or 'resolve' to turn a mismatched pair back face-down. */
export type MemoryMove = number | 'resolve';

export interface MemoryState {
  /** symbol id per card position; each id appears exactly twice */
  symbols: number[];
  /** who matched each card, or null while it is still in play */
  matchedBy: (PlayerId | null)[];
  /** positions currently face-up and unmatched (0-2) */
  flipped: number[];
  current: PlayerId;
  pairs: Record<PlayerId, number>;
  /** every position revealed so far, oldest first (what a human could remember) */
  reveals: number[];
}

export function createMemory(pairCount = 8, fixedSeed?: number): GameEngine<MemoryState, MemoryMove> {
  const isMismatch = (s: MemoryState) =>
    s.flipped.length === 2 && s.symbols[s.flipped[0]] !== s.symbols[s.flipped[1]];
  const isOver = (s: MemoryState) => s.matchedBy.every((m) => m !== null);

  /** Turns a mismatched pair back down and passes the turn. */
  const resolve = (s: MemoryState): MemoryState => ({
    ...s,
    flipped: [],
    current: s.current === 1 ? 2 : 1,
  });

  return {
    initialState() {
      const ids = Array.from({ length: pairCount }, (_, i) => [i, i]).flat();
      const [symbols] = shuffle(ids, fixedSeed ?? randomSeed());
      return {
        symbols,
        matchedBy: Array(symbols.length).fill(null),
        flipped: [],
        current: 1,
        pairs: { 1: 0, 2: 0 },
        reveals: [],
      };
    },
    currentPlayer: (s) => s.current,
    legalMoves(s) {
      if (isOver(s)) return [];
      const moves: MemoryMove[] = [];
      if (isMismatch(s)) moves.push('resolve');
      for (let i = 0; i < s.symbols.length; i++) {
        if (s.matchedBy[i] === null && !s.flipped.includes(i)) moves.push(i);
      }
      return moves;
    },
    applyMove(s, move) {
      if (isOver(s)) return null;
      if (move === 'resolve') return isMismatch(s) ? resolve(s) : null;
      if (!Number.isInteger(move) || move < 0 || move >= s.symbols.length) return null;
      if (s.matchedBy[move] !== null) return null;
      let cur = s;
      if (isMismatch(cur)) cur = resolve(cur); // clicking the next card also flips the old pair back
      if (cur.flipped.includes(move)) return null;

      const flipped = [...cur.flipped, move];
      const reveals = [...cur.reveals, move];
      if (flipped.length === 1) return { ...cur, flipped, reveals };

      // second card: match or mismatch
      if (cur.symbols[flipped[0]] === cur.symbols[move]) {
        const matchedBy = cur.matchedBy.slice();
        matchedBy[flipped[0]] = cur.current;
        matchedBy[move] = cur.current;
        return {
          ...cur,
          matchedBy,
          flipped: [],
          reveals,
          pairs: { ...cur.pairs, [cur.current]: cur.pairs[cur.current] + 1 },
        }; // a match earns another turn: current stays the same
      }
      return { ...cur, flipped, reveals };
    },
    getStatus(s): Outcome {
      if (!isOver(s)) return { state: 'playing' };
      if (s.pairs[1] === s.pairs[2]) return { state: 'draw' };
      return { state: 'won', winner: s.pairs[1] > s.pairs[2] ? 1 : 2 };
    },
  };
}

export const needsResolve = (s: MemoryState) =>
  s.flipped.length === 2 && s.symbols[s.flipped[0]] !== s.symbols[s.flipped[1]];
