import { describe, expect, it } from 'vitest';
import { getBestMove } from './ai';
import { type Cell, count, reversiEngine as e, flipsFor, type ReversiState, SIZE } from './engine';

const at = (r: number, c: number) => r * SIZE + c;
const empty = (): Cell[] => Array<Cell>(SIZE * SIZE).fill(null);

describe('reversi engine', () => {
  it('starts with 2+2 discs and dark has exactly 4 moves', () => {
    const s = e.initialState();
    expect(count(s.cells)).toEqual({ 1: 2, 2: 2 });
    expect(e.legalMoves(s).sort((a, b) => a - b)).toEqual([at(2, 3), at(3, 2), at(4, 5), at(5, 4)]);
    expect(s.current).toBe(1);
  });

  it('flips outflanked discs and switches turns', () => {
    const s = e.initialState();
    const n = e.applyMove(s, at(2, 3));
    expect(n).not.toBeNull();
    expect(n?.cells[at(3, 3)]).toBe(1); // was light, flipped
    expect(count(n?.cells ?? [])).toEqual({ 1: 4, 2: 1 });
    expect(n?.current).toBe(2);
  });

  it('rejects moves that flip nothing, occupied squares and out of range', () => {
    const s = e.initialState();
    expect(e.applyMove(s, at(0, 0))).toBeNull();
    expect(e.applyMove(s, at(3, 3))).toBeNull();
    expect(e.applyMove(s, 64)).toBeNull();
    expect(e.applyMove(s, -1)).toBeNull();
  });

  it('flips in multiple directions at once', () => {
    const cells = empty();
    // dark plays (3,3): light at (3,4) with dark at (3,5), light at (4,3) with dark at (5,3)
    cells[at(3, 4)] = 2;
    cells[at(3, 5)] = 1;
    cells[at(4, 3)] = 2;
    cells[at(5, 3)] = 1;
    expect(flipsFor(cells, at(3, 3), 1).sort()).toEqual([at(3, 4), at(4, 3)].sort());
  });

  it('a line of light discs not capped by a dark disc is not flipped', () => {
    const cells = empty();
    cells[at(0, 1)] = 2;
    cells[at(0, 2)] = 2; // runs off the end of the row on the right? no: (0,3) is empty
    expect(flipsFor(cells, at(0, 0), 1)).toEqual([]);
  });

  it('forces the opponent to pass and keeps the turn with the mover', () => {
    const cells = empty();
    cells[at(0, 0)] = 1;
    cells[at(0, 1)] = 2;
    cells[at(7, 0)] = 1;
    cells[at(6, 0)] = 2;
    const s: ReversiState = { cells, current: 1, skipped: null, over: false };
    const n = e.applyMove(s, at(0, 2));
    // light is left with only (6,0), which cannot flank anything; dark can still capture it via (5,0)
    expect(n).toMatchObject({ current: 1, skipped: 2, over: false });
    expect(n && e.legalMoves(n)).toEqual([at(5, 0)]);
  });

  it('ends the game when neither side can move and counts discs', () => {
    const cells = empty();
    cells[at(0, 0)] = 1;
    cells[at(0, 1)] = 2;
    const s: ReversiState = { cells, current: 1, skipped: null, over: false };
    const n = e.applyMove(s, at(0, 2));
    expect(n?.over).toBe(true);
    expect(n && e.getStatus(n)).toEqual({ state: 'won', winner: 1 });
    expect(n && e.applyMove(n, at(4, 4))).toBeNull();
    expect(n && e.legalMoves(n)).toEqual([]);
  });

  it('draws on equal disc counts', () => {
    const cells = empty();
    cells[at(0, 0)] = 1;
    cells[at(7, 7)] = 2;
    expect(e.getStatus({ cells, current: 1, skipped: null, over: true })).toEqual({ state: 'draw' });
  });
});

describe('reversi AI', () => {
  it('always returns a legal move', () => {
    let s = e.initialState();
    for (let i = 0; i < 12 && !s.over; i++) {
      const m = getBestMove(s, 3);
      const n = e.applyMove(s, m);
      expect(n).not.toBeNull();
      if (n) s = n;
    }
  });

  it('takes an available corner', () => {
    const cells = empty();
    cells[at(0, 1)] = 2;
    cells[at(0, 2)] = 1; // dark can take (0,0) flipping (0,1)
    cells[at(4, 4)] = 2;
    cells[at(4, 5)] = 1; // alternative: (4,3)
    const s: ReversiState = { cells, current: 1, skipped: null, over: false };
    expect(getBestMove(s, 2)).toBe(at(0, 0));
  });

  it('plays a full AI-vs-AI game to a legal finish', () => {
    let s = e.initialState();
    let guard = 0;
    while (!s.over && guard++ < 200) {
      const n = e.applyMove(s, getBestMove(s, 2));
      expect(n).not.toBeNull();
      if (!n) break;
      s = n;
    }
    expect(s.over).toBe(true);
    expect(['won', 'draw']).toContain(e.getStatus(s).state);
  });
});
