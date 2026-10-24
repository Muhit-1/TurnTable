import type { GameEngine, PlayerId } from '../../shared/engine';

export interface NimMove {
  pile: number;
  count: number;
}

export interface NimState {
  piles: number[];
  current: PlayerId;
  /** misère: whoever takes the last object loses. Normal play: whoever takes the last object wins. */
  misere: boolean;
  /** player who took the last object, once the piles are empty */
  lastTaker: PlayerId | null;
}

export const DEFAULT_PILES = [3, 5, 7];

export function createNim(piles: number[] = DEFAULT_PILES, misere = false): GameEngine<NimState, NimMove> {
  const isOver = (s: NimState) => s.piles.every((p) => p === 0);
  return {
    initialState: () => ({ piles: [...piles], current: 1, misere, lastTaker: null }),
    currentPlayer: (s) => s.current,
    legalMoves: (s) =>
      isOver(s)
        ? []
        : s.piles.flatMap((size, pile) => Array.from({ length: size }, (_, i) => ({ pile, count: i + 1 }))),
    applyMove(s, { pile, count }) {
      if (isOver(s)) return null;
      if (!Number.isInteger(pile) || pile < 0 || pile >= s.piles.length) return null;
      if (!Number.isInteger(count) || count < 1 || count > s.piles[pile]) return null;
      const next = s.piles.slice();
      next[pile] -= count;
      const over = next.every((p) => p === 0);
      return {
        ...s,
        piles: next,
        current: s.current === 1 ? 2 : 1,
        lastTaker: over ? s.current : null,
      };
    },
    getStatus(s) {
      if (!isOver(s) || s.lastTaker === null) return { state: 'playing' };
      const winner: PlayerId = s.misere ? (s.lastTaker === 1 ? 2 : 1) : s.lastTaker;
      return { state: 'won', winner };
    },
  };
}

export const nimEngine = createNim();
