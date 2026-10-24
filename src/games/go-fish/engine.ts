import { type Card, shuffledDeck } from '../../shared/deck';
import type { GameEngine, Outcome, PlayerId } from '../../shared/engine';
import { randomSeed } from '../../shared/rng';

export const HAND_SIZE = 5;
export const BOOK_SIZE = 4;
export const RANKS = 13;

/** Ask the opponent for every card of `rank`. You must hold at least one card of that rank. */
export type GoFishMove = { kind: 'ask'; rank: number };

export interface GoFishEvent {
  asker: PlayerId;
  rank: number;
  /** cards received from the opponent (0 means "Go Fish") */
  received: number;
  /** whether the asker drew from the ocean (false if it was empty) */
  fished: boolean;
  /** a rank that became a book as a result of this turn */
  booked: number[];
}

export interface GoFishState {
  hands: Record<PlayerId, Card[]>;
  ocean: Card[]; // top card = index 0
  books: Record<PlayerId, number[]>;
  current: PlayerId;
  /** ranks each player has asked for (the opponent knows they hold them), until they are booked */
  asked: Record<PlayerId, number[]>;
  last: GoFishEvent | null;
  over: boolean;
}

const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);
export const countRank = (hand: Card[], rank: number) => hand.filter((c) => c.rank === rank).length;
export const ranksHeld = (hand: Card[]) => [...new Set(hand.map((c) => c.rank))].sort((a, b) => a - b);

/** Lays down any complete books in `player`'s hand. */
function layDownBooks(s: GoFishState, player: PlayerId): { state: GoFishState; booked: number[] } {
  const booked = ranksHeld(s.hands[player]).filter((r) => countRank(s.hands[player], r) === BOOK_SIZE);
  if (!booked.length) return { state: s, booked };
  return {
    booked,
    state: {
      ...s,
      hands: { ...s.hands, [player]: s.hands[player].filter((c) => !booked.includes(c.rank)) },
      books: { ...s.books, [player]: [...s.books[player], ...booked].sort((a, b) => a - b) },
      asked: { ...s.asked, [other(player)]: s.asked[other(player)].filter((r) => !booked.includes(r)) },
    },
  };
}

/** After a turn: books done -> over; a player with an empty hand draws one card; otherwise skip stuck players. */
function settle(s: GoFishState): GoFishState {
  let cur = s;
  for (let guard = 0; guard < 4; guard++) {
    if (cur.books[1].length + cur.books[2].length >= RANKS) return { ...cur, over: true };
    if (cur.hands[cur.current].length > 0) return cur;
    if (cur.ocean.length > 0) {
      const hand = [...cur.hands[cur.current], cur.ocean[0]];
      cur = { ...cur, ocean: cur.ocean.slice(1), hands: { ...cur.hands, [cur.current]: hand } };
      cur = layDownBooks(cur, cur.current).state;
      continue;
    }
    // no cards and nothing to draw: pass to the opponent
    if (cur.hands[other(cur.current)].length === 0) return { ...cur, over: true };
    cur = { ...cur, current: other(cur.current) };
  }
  return cur;
}

export function createGoFish(fixedSeed?: number): GameEngine<GoFishState, GoFishMove> {
  return {
    initialState() {
      const [deck] = shuffledDeck(fixedSeed ?? randomSeed());
      let s: GoFishState = {
        hands: { 1: deck.slice(0, HAND_SIZE), 2: deck.slice(HAND_SIZE, HAND_SIZE * 2) },
        ocean: deck.slice(HAND_SIZE * 2),
        books: { 1: [], 2: [] },
        current: 1,
        asked: { 1: [], 2: [] },
        last: null,
        over: false,
      };
      s = layDownBooks(s, 1).state;
      s = layDownBooks(s, 2).state;
      return settle(s);
    },
    currentPlayer: (s) => s.current,
    legalMoves: (s) =>
      s.over ? [] : ranksHeld(s.hands[s.current]).map((rank) => ({ kind: 'ask' as const, rank })),
    applyMove(s, move) {
      if (s.over || !move || move.kind !== 'ask') return null;
      const me = s.current;
      const opp = other(me);
      if (!Number.isInteger(move.rank) || countRank(s.hands[me], move.rank) === 0) return null;

      let cur: GoFishState = { ...s, asked: { ...s.asked, [me]: [...new Set([...s.asked[me], move.rank])] } };
      const given = cur.hands[opp].filter((c) => c.rank === move.rank);
      let fished = false;
      let again = false;
      if (given.length > 0) {
        cur = {
          ...cur,
          hands: {
            ...cur.hands,
            [opp]: cur.hands[opp].filter((c) => c.rank !== move.rank),
            [me]: [...cur.hands[me], ...given],
          },
        };
        again = true;
      } else if (cur.ocean.length > 0) {
        fished = true;
        cur = {
          ...cur,
          ocean: cur.ocean.slice(1),
          hands: { ...cur.hands, [me]: [...cur.hands[me], cur.ocean[0]] },
        };
      }
      const laid = layDownBooks(cur, me);
      cur = laid.state;
      const event: GoFishEvent = {
        asker: me,
        rank: move.rank,
        received: given.length,
        fished,
        booked: laid.booked,
      };
      return settle({ ...cur, current: again ? me : opp, last: event });
    },
    getStatus(s): Outcome {
      if (!s.over) return { state: 'playing' };
      if (s.books[1].length === s.books[2].length) return { state: 'draw' };
      return { state: 'won', winner: s.books[1].length > s.books[2].length ? 1 : 2 };
    },
  };
}

export const goFishEngine = createGoFish();
