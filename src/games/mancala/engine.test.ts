import { describe, expect, it } from 'vitest';
import { getBestMove } from './ai';
import { mancalaEngine as e, type MancalaState, P1_STORE, P2_STORE } from './engine';

const total = (s: MancalaState) => s.slots.reduce((a, b) => a + b, 0);
const make = (slots: number[], current: 1 | 2 = 1): MancalaState => ({
  slots,
  current,
  extraTurn: false,
  over: false,
});

describe('mancala engine', () => {
  it('starts with 4 seeds in each of the 12 pits, empty stores, 6 legal moves', () => {
    const s = e.initialState();
    expect(s.slots.slice(0, 6)).toEqual([4, 4, 4, 4, 4, 4]);
    expect(s.slots.slice(7, 13)).toEqual([4, 4, 4, 4, 4, 4]);
    expect(s.slots[P1_STORE]).toBe(0);
    expect(s.slots[P2_STORE]).toBe(0);
    expect(e.legalMoves(s)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(total(s)).toBe(48);
  });

  it('sows counterclockwise into own store and a pit-2 opening gives an extra turn', () => {
    // pit 2 has 4 seeds: lands 3,4,5,store -> extra turn
    const s = e.applyMove(e.initialState(), 2);
    expect(s?.slots[P1_STORE]).toBe(1);
    expect(s?.current).toBe(1);
    expect(s?.extraTurn).toBe(true);
    expect(s && total(s)).toBe(48);
  });

  it('passes the turn when the last seed does not land in the store', () => {
    const s = e.applyMove(e.initialState(), 0);
    expect(s?.current).toBe(2);
    expect(s?.extraTurn).toBe(false);
  });

  it("skips the opponent's store when sowing", () => {
    const slots = Array(14).fill(0);
    slots[5] = 10; // 6 (store), 7..12 (6 pits), skip 13, then 0, 1, 2
    slots[2] = 1; // non-empty, so the last seed does not trigger a capture
    slots[8] = 1;
    const s = e.applyMove(make(slots, 1), 5);
    expect(s?.slots[P2_STORE]).toBe(0);
    expect(s?.slots[P1_STORE]).toBe(1);
    expect(s?.slots.slice(0, 3)).toEqual([1, 1, 2]);
    expect(s && total(s)).toBe(12);
  });

  it('captures the opposite pit when ending in an empty own pit', () => {
    const slots = Array(14).fill(0);
    slots[0] = 1; // moves into empty pit 1
    slots[11] = 5; // opposite of 1 is 11
    slots[12] = 1; // keep side 2 non-empty after capture
    slots[5] = 2;
    const s = e.applyMove(make(slots, 1), 0);
    expect(s?.slots[P1_STORE]).toBe(6); // 1 + 5
    expect(s?.slots[1]).toBe(0);
    expect(s?.slots[11]).toBe(0);
  });

  it('does not capture when the opposite pit is empty', () => {
    const slots = Array(14).fill(0);
    slots[0] = 1;
    slots[5] = 2;
    slots[12] = 1;
    const s = e.applyMove(make(slots, 1), 0);
    expect(s?.slots[1]).toBe(1);
    expect(s?.slots[P1_STORE]).toBe(0);
  });

  it('does not capture when ending in an empty pit on the opponent side', () => {
    const slots = Array(14).fill(0);
    slots[5] = 2; // store, then pit 7 (empty, opponent side)
    slots[0] = 1; // keep side 1 non-empty so the game continues
    slots[10] = 3;
    const s = e.applyMove(make(slots, 1), 5);
    expect(s?.over).toBe(false);
    expect(s?.slots[7]).toBe(1);
    expect(s?.slots[P1_STORE]).toBe(1);
    expect(s?.current).toBe(2);
  });

  it('rejects empty pits, the opponent pits, stores and out-of-range', () => {
    const s = e.initialState();
    expect(e.applyMove(s, 7)).toBeNull();
    expect(e.applyMove(s, P1_STORE)).toBeNull();
    expect(e.applyMove(s, 14)).toBeNull();
    expect(e.applyMove(s, -1)).toBeNull();
    const emptied = e.applyMove(make([0, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0]), 0);
    expect(emptied).toBeNull();
  });

  it('ends when a side is empty and the other player keeps their seeds', () => {
    const slots = Array(14).fill(0);
    slots[5] = 1; // moves into store -> side 1 empty
    slots[7] = 3;
    slots[8] = 2;
    slots[P1_STORE] = 10;
    slots[P2_STORE] = 4;
    const s = e.applyMove(make(slots, 1), 5);
    expect(s?.over).toBe(true);
    expect(s?.slots[P1_STORE]).toBe(11);
    expect(s?.slots[P2_STORE]).toBe(9);
    expect(s && e.getStatus(s)).toEqual({ state: 'won', winner: 1 });
    expect(s && e.applyMove(s, 7)).toBeNull();
    expect(s && e.legalMoves(s)).toEqual([]);
  });

  it('draws on equal stores', () => {
    expect(
      e.getStatus({
        slots: [0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 0, 24],
        current: 1,
        extraTurn: false,
        over: true,
      }),
    ).toEqual({
      state: 'draw',
    });
  });

  it('conserves 48 seeds through a full random-ish game', () => {
    let s = e.initialState();
    let n = 0;
    while (!s.over && n++ < 500) {
      const moves = e.legalMoves(s);
      const next = e.applyMove(s, moves[(n * 5) % moves.length]);
      expect(next).not.toBeNull();
      if (!next) break;
      s = next;
      expect(total(s)).toBe(48);
    }
    expect(s.over).toBe(true);
  });
});

describe('mancala AI', () => {
  it('takes an available extra turn', () => {
    // pit 2 with 4 seeds lands in the store; other moves do not
    const s = e.initialState();
    expect(getBestMove(s, 2)).toBe(2);
  });

  it('plays a legal full game against itself', () => {
    let s = e.initialState();
    let n = 0;
    while (!s.over && n++ < 300) {
      const m = getBestMove(s, 4);
      const next = e.applyMove(s, m);
      expect(next).not.toBeNull();
      if (!next) break;
      s = next;
    }
    expect(s.over).toBe(true);
    expect(total(s)).toBe(48);
  });
});
