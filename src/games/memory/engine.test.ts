import { describe, expect, it } from 'vitest';
import { getBestMove } from './ai';
import { createMemory, type MemoryState } from './engine';

const e = createMemory(4, 123);
const pairPositions = (s: MemoryState) => {
  const map = new Map<number, number[]>();
  for (const [i, sym] of s.symbols.entries()) map.set(sym, [...(map.get(sym) ?? []), i]);
  return [...map.values()];
};

describe('memory engine', () => {
  it('lays out each symbol exactly twice, all face-down', () => {
    const s = e.initialState();
    expect(s.symbols).toHaveLength(8);
    for (const p of pairPositions(s)) expect(p).toHaveLength(2);
    expect(s.matchedBy.every((m) => m === null)).toBe(true);
    expect(s.flipped).toEqual([]);
  });

  it('same seed gives same layout', () => {
    expect(createMemory(4, 9).initialState().symbols).toEqual(createMemory(4, 9).initialState().symbols);
  });

  it('a match scores a pair and keeps the turn', () => {
    const s0 = e.initialState();
    const [a, b] = pairPositions(s0)[0];
    const s1 = e.applyMove(s0, a);
    const s2 = s1 && e.applyMove(s1, b);
    expect(s2?.pairs).toEqual({ 1: 1, 2: 0 });
    expect(s2?.current).toBe(1);
    expect(s2?.matchedBy[a]).toBe(1);
    expect(s2?.flipped).toEqual([]);
  });

  it('a mismatch waits face-up, then resolves to the other player', () => {
    const s0 = e.initialState();
    const [a] = pairPositions(s0)[0];
    const [b] = pairPositions(s0)[1];
    const s1 = e.applyMove(e.applyMove(s0, a) as MemoryState, b) as MemoryState;
    expect(s1.flipped).toEqual([a, b]);
    expect(s1.current).toBe(1);
    expect(e.legalMoves(s1)).toContain('resolve');
    const s2 = e.applyMove(s1, 'resolve');
    expect(s2).toMatchObject({ flipped: [], current: 2 });
  });

  it('clicking another card after a mismatch flips the pair back and starts the next turn', () => {
    const s0 = e.initialState();
    const [a] = pairPositions(s0)[0];
    const [b] = pairPositions(s0)[1];
    const [c] = pairPositions(s0)[2];
    const s1 = e.applyMove(e.applyMove(s0, a) as MemoryState, b) as MemoryState;
    const s2 = e.applyMove(s1, c);
    expect(s2).toMatchObject({ flipped: [c], current: 2 });
  });

  it('rejects flipping a matched card, the same card twice, out of range, or resolving with nothing to resolve', () => {
    const s0 = e.initialState();
    const [a, b] = pairPositions(s0)[0];
    const s1 = e.applyMove(s0, a) as MemoryState;
    expect(e.applyMove(s1, a)).toBeNull();
    const s2 = e.applyMove(s1, b) as MemoryState;
    expect(e.applyMove(s2, a)).toBeNull();
    expect(e.applyMove(s0, 99)).toBeNull();
    expect(e.applyMove(s0, -1)).toBeNull();
    expect(e.applyMove(s0, 'resolve')).toBeNull();
  });

  it('ends when all pairs are matched; most pairs wins', () => {
    let s = e.initialState();
    const pairs = pairPositions(s);
    for (const [a, b] of pairs) s = e.applyMove(e.applyMove(s, a) as MemoryState, b) as MemoryState;
    expect(e.getStatus(s)).toEqual({ state: 'won', winner: 1 });
    expect(e.legalMoves(s)).toEqual([]);
    expect(e.applyMove(s, 0)).toBeNull();
  });

  it('draws on equal pairs', () => {
    let s = e.initialState();
    const pairs = pairPositions(s);
    // player 1 matches two pairs, then misses so player 2 gets two
    s = e.applyMove(e.applyMove(s, pairs[0][0]) as MemoryState, pairs[0][1]) as MemoryState;
    s = e.applyMove(e.applyMove(s, pairs[1][0]) as MemoryState, pairs[1][1]) as MemoryState;
    s = e.applyMove(e.applyMove(s, pairs[2][0]) as MemoryState, pairs[3][0]) as MemoryState;
    s = e.applyMove(s, 'resolve') as MemoryState;
    expect(s.current).toBe(2);
    s = e.applyMove(e.applyMove(s, pairs[2][0]) as MemoryState, pairs[2][1]) as MemoryState;
    s = e.applyMove(e.applyMove(s, pairs[3][0]) as MemoryState, pairs[3][1]) as MemoryState;
    expect(s.pairs).toEqual({ 1: 2, 2: 2 });
    expect(e.getStatus(s)).toEqual({ state: 'draw' });
  });
});

describe('memory AI', () => {
  it('only makes legal moves and finishes a whole game against itself', () => {
    let s = e.initialState();
    let guard = 0;
    while (e.getStatus(s).state === 'playing' && guard++ < 500) {
      const m = getBestMove(s);
      expect(e.legalMoves(s)).toContain(m);
      s = e.applyMove(s, m) as MemoryState;
    }
    expect(e.getStatus(s).state).not.toBe('playing');
  });

  it('completes a pair it remembers', () => {
    let s = e.initialState();
    const pairs = pairPositions(s);
    const [a] = pairs[0];
    const [b] = [pairs[0][1]];
    const [x] = pairs[1];
    const [y] = pairs[2];
    // a is revealed (with x, a miss), then b is revealed (with y, a miss): both halves of a pair are now known
    s = e.applyMove(e.applyMove(s, a) as MemoryState, x) as MemoryState;
    s = e.applyMove(s, 'resolve') as MemoryState;
    s = e.applyMove(e.applyMove(s, b) as MemoryState, y) as MemoryState;
    s = e.applyMove(s, 'resolve') as MemoryState;
    const first = getBestMove(s);
    expect([a, b]).toContain(first);
    s = e.applyMove(s, first) as MemoryState;
    expect(getBestMove(s)).toBe(first === a ? b : a);
  });

  it('forgets cards older than its memory span', () => {
    // positions 1 and 3 share a symbol; the player has just flipped 3 and saw position 1 two reveals ago
    const s: MemoryState = {
      symbols: [1, 0, 1, 0, 2, 2],
      matchedBy: [null, null, null, null, null, null],
      flipped: [3],
      current: 2,
      pairs: { 1: 0, 2: 0 },
      reveals: [1, 2, 3],
    };
    expect(getBestMove(s, 8)).toBe(1); // remembers position 1
    expect(getBestMove(s, 1)).not.toBe(1); // only remembers the card in hand
  });
});
