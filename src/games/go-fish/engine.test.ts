import { describe, expect, it } from 'vitest';
import type { Card } from '../../shared/deck';
import { getBestMove } from './ai';
import { BOOK_SIZE, createGoFish, type GoFishState, RANKS } from './engine';

const e = createGoFish(5);
const c = (rank: number, suit: Card['suit'] = 'spades'): Card => ({ rank, suit });
const set = (rank: number, n: number): Card[] =>
  (['spades', 'hearts', 'diamonds', 'clubs'] as const).slice(0, n).map((s) => c(rank, s));
const mk = (over: Partial<GoFishState>): GoFishState => ({
  hands: { 1: [], 2: [] },
  ocean: [],
  books: { 1: [], 2: [] },
  current: 1,
  asked: { 1: [], 2: [] },
  last: null,
  over: false,
  ...over,
});
const total = (s: GoFishState) =>
  s.hands[1].length +
  s.hands[2].length +
  s.ocean.length +
  (s.books[1].length + s.books[2].length) * BOOK_SIZE;

describe('go fish setup', () => {
  it('deals 5 cards each (less any starting books) and keeps all 52 cards', () => {
    const s = e.initialState();
    expect(s.hands[1].length + s.books[1].length * 4).toBe(5);
    expect(s.hands[2].length + s.books[2].length * 4).toBe(5);
    expect(total(s)).toBe(52);
    expect(s.current).toBe(1);
  });
});

describe('go fish asking', () => {
  it('only ranks you hold are legal', () => {
    const s = mk({ hands: { 1: [c(3), c(7)], 2: [c(7, 'hearts')] }, ocean: [c(9)] });
    expect(e.legalMoves(s)).toEqual([
      { kind: 'ask', rank: 3 },
      { kind: 'ask', rank: 7 },
    ]);
    expect(e.applyMove(s, { kind: 'ask', rank: 9 })).toBeNull();
    expect(e.applyMove(s, { kind: 'ask', rank: 1.5 })).toBeNull();
  });

  it('a successful ask transfers every matching card and gives another turn', () => {
    const s = mk({
      hands: { 1: [c(3), c(7)], 2: [c(7, 'hearts'), c(7, 'clubs'), c(2)] },
      ocean: [c(9)],
    });
    const n = e.applyMove(s, { kind: 'ask', rank: 7 }) as GoFishState;
    expect(n.hands[1].filter((x) => x.rank === 7)).toHaveLength(3);
    expect(n.hands[2].map((x) => x.rank)).toEqual([2]);
    expect(n.current).toBe(1);
    expect(n.last).toMatchObject({ asker: 1, rank: 7, received: 2, fished: false });
    expect(n.ocean).toHaveLength(1);
  });

  it('go fish: draws from the ocean and passes the turn', () => {
    const s = mk({ hands: { 1: [c(3)], 2: [c(5)] }, ocean: [c(9), c(10)] });
    const n = e.applyMove(s, { kind: 'ask', rank: 3 }) as GoFishState;
    expect(n.hands[1].map((x) => x.rank)).toEqual([3, 9]);
    expect(n.ocean).toHaveLength(1);
    expect(n.current).toBe(2);
    expect(n.last).toMatchObject({ received: 0, fished: true });
  });

  it('go fish with an empty ocean just passes the turn', () => {
    const s = mk({ hands: { 1: [c(3)], 2: [c(5)] }, ocean: [] });
    const n = e.applyMove(s, { kind: 'ask', rank: 3 }) as GoFishState;
    expect(n.current).toBe(2);
    expect(n.last?.fished).toBe(false);
  });
});

describe('go fish books', () => {
  it('completing four of a kind lays down a book', () => {
    const s = mk({ hands: { 1: [...set(7, 3), c(2)], 2: [c(7, 'clubs'), c(5)] }, ocean: [c(9)] });
    const n = e.applyMove(s, { kind: 'ask', rank: 7 }) as GoFishState;
    expect(n.books[1]).toEqual([7]);
    expect(n.hands[1].map((x) => x.rank)).toEqual([2]);
    expect(n.last?.booked).toEqual([7]);
    expect(n.current).toBe(1);
  });

  it('drawing the fourth card from the ocean also makes a book', () => {
    const s = mk({ hands: { 1: [...set(7, 3)], 2: [c(5)] }, ocean: [c(7, 'clubs'), c(8)] });
    const n = e.applyMove(s, { kind: 'ask', rank: 7 }) as GoFishState;
    expect(n.books[1]).toEqual([7]);
  });

  it('a player left with an empty hand draws a card when their turn comes', () => {
    const s = mk({ hands: { 1: [c(3)], 2: [c(3, 'hearts'), c(5)] }, ocean: [c(9), c(10)], current: 2 });
    const took = e.applyMove(s, { kind: 'ask', rank: 3 }) as GoFishState;
    expect(took.hands[1]).toHaveLength(0);
    expect(took.current).toBe(2); // still player 2's turn
    // player 2 asks for 5 and has to fish; the turn passes to player 1, who is refilled from the ocean
    const n = e.applyMove(took, { kind: 'ask', rank: 5 }) as GoFishState;
    expect(n.current).toBe(1);
    expect(n.hands[1].map((x) => x.rank)).toEqual([10]);
    expect(n.ocean).toHaveLength(0);
  });

  it('with an empty hand and an empty ocean the turn is skipped', () => {
    const s = mk({ hands: { 1: [c(3)], 2: [c(3, 'hearts'), c(5), c(6)] }, ocean: [], current: 2 });
    const n = e.applyMove(s, { kind: 'ask', rank: 3 }) as GoFishState;
    expect(n.hands[1]).toHaveLength(0);
    const m = e.applyMove(n, { kind: 'ask', rank: 5 }) as GoFishState; // no 5, empty ocean: turn would pass to player 1
    expect(m.current).toBe(2); // player 1 has nothing to play, so player 2 continues
  });

  it('ends when all 13 books are made; most books wins', () => {
    const allBooks = Array.from({ length: RANKS }, (_, i) => i + 2);
    const s = mk({
      hands: { 1: [...set(14, 3)], 2: [c(14, 'clubs')] },
      books: { 1: allBooks.slice(0, 6), 2: allBooks.slice(6, 12) }, // 12 booked, rank 14 outstanding
      current: 1,
    });
    const n = e.applyMove(s, { kind: 'ask', rank: 14 }) as GoFishState;
    expect(n.over).toBe(true);
    expect(n.books[1]).toHaveLength(7);
    expect(e.getStatus(n)).toEqual({ state: 'won', winner: 1 });
    expect(e.legalMoves(n)).toEqual([]);
    expect(e.applyMove(n, { kind: 'ask', rank: 14 })).toBeNull();
  });
});

describe('go fish whole games', () => {
  it('AI vs AI always finishes, keeps 52 cards, ends with 13 books', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const eng = createGoFish(seed);
      let s = eng.initialState();
      let n = 0;
      while (eng.getStatus(s).state === 'playing' && n++ < 2000) {
        const m = getBestMove(s);
        expect(eng.legalMoves(s)).toContainEqual(m);
        s = eng.applyMove(s, m) as GoFishState;
        expect(total(s)).toBe(52);
      }
      expect(s.books[1].length + s.books[2].length).toBe(13);
      expect(eng.getStatus(s).state).toBe('won'); // 13 books can never tie
    }
  });

  it('AI asks for a rank the opponent has asked about', () => {
    const s = mk({
      hands: { 1: [c(3), c(3, 'hearts'), c(8)], 2: [c(8, 'clubs'), c(9)] },
      asked: { 1: [], 2: [8] },
    });
    expect(getBestMove(s)).toEqual({ kind: 'ask', rank: 8 });
  });
});
