import type { GameEngine, Outcome, PlayerId } from '../../shared/engine';

/**
 * Kalah layout, 14 slots, sowing runs counterclockwise by increasing index:
 *   player 1 pits: 0-5, store 6      player 2 pits: 7-12, store 13
 * The pit directly opposite slot i is 12 - i.
 */
export const P1_STORE = 6;
export const P2_STORE = 13;
export const SEEDS = 4;

export interface MancalaState {
  slots: number[]; // length 14
  current: PlayerId;
  /** set when the player just moved earns another turn by ending in their own store */
  extraTurn: boolean;
  over: boolean;
}

export const storeOf = (p: PlayerId) => (p === 1 ? P1_STORE : P2_STORE);
export const pitsOf = (p: PlayerId) => (p === 1 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12]);
const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);

export const mancalaEngine: GameEngine<MancalaState, number> = {
  initialState() {
    const slots = Array<number>(14).fill(SEEDS);
    slots[P1_STORE] = 0;
    slots[P2_STORE] = 0;
    return { slots, current: 1, extraTurn: false, over: false };
  },
  currentPlayer: (s) => s.current,
  legalMoves: (s) => (s.over ? [] : pitsOf(s.current).filter((i) => s.slots[i] > 0)),
  applyMove(s, pit) {
    if (s.over || !pitsOf(s.current).includes(pit) || s.slots[pit] === 0) return null;
    const slots = s.slots.slice();
    const mine = storeOf(s.current);
    const skip = storeOf(other(s.current));
    let seeds = slots[pit];
    slots[pit] = 0;
    let i = pit;
    while (seeds > 0) {
      i = (i + 1) % 14;
      if (i === skip) continue;
      slots[i]++;
      seeds--;
    }

    // Capture: last seed lands in an empty pit on the mover's own side, opposite pit not empty.
    if (i !== mine && pitsOf(s.current).includes(i) && slots[i] === 1 && slots[12 - i] > 0) {
      slots[mine] += slots[i] + slots[12 - i];
      slots[i] = 0;
      slots[12 - i] = 0;
    }

    // Game ends when either side is empty: the other player keeps their remaining seeds.
    const side1 = pitsOf(1).reduce((a, k) => a + slots[k], 0);
    const side2 = pitsOf(2).reduce((a, k) => a + slots[k], 0);
    if (side1 === 0 || side2 === 0) {
      for (const p of [1, 2] as PlayerId[]) {
        for (const k of pitsOf(p)) {
          slots[storeOf(p)] += slots[k];
          slots[k] = 0;
        }
      }
      return { slots, current: other(s.current), extraTurn: false, over: true };
    }

    const extra = i === mine;
    return { slots, current: extra ? s.current : other(s.current), extraTurn: extra, over: false };
  },
  getStatus(s): Outcome {
    if (!s.over) return { state: 'playing' };
    const a = s.slots[P1_STORE];
    const b = s.slots[P2_STORE];
    if (a === b) return { state: 'draw' };
    return { state: 'won', winner: a > b ? 1 : 2 };
  },
};
