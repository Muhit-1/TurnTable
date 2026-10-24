import { describe, expect, it } from 'vitest';
import { getBestMove } from './ai';
import {
  ADJACENT,
  morrisEngine as e,
  inMill,
  MILLS,
  type MorrisMove,
  type MorrisState,
  POINTS,
  QUIET_LIMIT,
  removable,
} from './engine';

const place = (to: number): MorrisMove => ({ kind: 'place', to });
const mv = (from: number, to: number): MorrisMove => ({ kind: 'move', from, to });
const rm = (at: number): MorrisMove => ({ kind: 'remove', at });
const run = (s: MorrisState, ...moves: MorrisMove[]) => {
  let cur = s;
  for (const m of moves) {
    const n = e.applyMove(cur, m);
    if (!n) throw new Error(`illegal ${JSON.stringify(m)}`);
    cur = n;
  }
  return cur;
};
const board = (cells: Record<number, 1 | 2>, hand = { 1: 0, 2: 0 }, current: 1 | 2 = 1): MorrisState => {
  const points = Array(POINTS).fill(null);
  for (const [i, p] of Object.entries(cells)) points[Number(i)] = p;
  return { points, hand, current, mustRemove: false, quiet: 0, status: { state: 'playing' } };
};

describe('morris geometry', () => {
  it('has 24 points, 16 mills, and symmetric adjacency', () => {
    expect(MILLS).toHaveLength(16);
    for (let i = 0; i < POINTS; i++) for (const n of ADJACENT[i]) expect(ADJACENT[n]).toContain(i);
    expect(ADJACENT.filter((a) => a.length === 2)).toHaveLength(12); // corners
    expect(ADJACENT.filter((a) => a.length === 3)).toHaveLength(8); // outer/inner midpoints
    expect(ADJACENT.filter((a) => a.length === 4)).toHaveLength(4); // middle ring midpoints
  });

  it('every point sits on 2 mills', () => {
    for (let i = 0; i < POINTS; i++) expect(MILLS.filter((m) => m.includes(i))).toHaveLength(2);
  });
});

describe('placing phase', () => {
  it('starts with 9 pieces each in hand and 24 placements', () => {
    const s = e.initialState();
    expect(s.hand).toEqual({ 1: 9, 2: 9 });
    expect(e.legalMoves(s)).toHaveLength(24);
  });

  it('places, alternates and counts down the hand; rejects occupied points and slides', () => {
    const s = run(e.initialState(), place(0));
    expect(s.points[0]).toBe(1);
    expect(s.hand[1]).toBe(8);
    expect(s.current).toBe(2);
    expect(e.applyMove(s, place(0))).toBeNull();
    expect(e.applyMove(s, mv(0, 1))).toBeNull();
    expect(e.applyMove(s, place(24))).toBeNull();
    expect(e.applyMove(s, place(-1))).toBeNull();
  });

  it('forming a mill requires the same player to remove a piece, then play passes', () => {
    let s = run(e.initialState(), place(0), place(8), place(1), place(9)); // p1: 0,1  p2: 8,9
    s = run(s, place(2)); // p1 completes the top mill 0-1-2
    expect(s.mustRemove).toBe(true);
    expect(s.current).toBe(1);
    expect(e.legalMoves(s).every((m) => m.kind === 'remove')).toBe(true);
    expect(e.applyMove(s, place(5))).toBeNull(); // must remove first
    expect(e.applyMove(s, rm(0))).toBeNull(); // cannot remove own piece
    const after = run(s, rm(8));
    expect(after.points[8]).toBeNull();
    expect(after.mustRemove).toBe(false);
    expect(after.current).toBe(2);
  });

  it('pieces in a mill are protected unless all opponent pieces are in mills', () => {
    const pts = board({ 0: 2, 1: 2, 2: 2, 10: 2, 16: 1 }).points; // p2 mill 0-1-2 plus a free piece at 10
    expect(removable(pts, 2)).toEqual([10]);
    const allMills = board({ 0: 2, 1: 2, 2: 2, 16: 1 }).points;
    expect(removable(allMills, 2).sort()).toEqual([0, 1, 2]);
    expect(inMill(allMills, 1)).toBe(true);
    expect(inMill(allMills, 16)).toBe(false);
  });
});

describe('moving phase', () => {
  const movingState = (cells: Record<number, 1 | 2>, current: 1 | 2 = 1) =>
    board(cells, { 1: 0, 2: 0 }, current);

  it('slides one step to an adjacent empty point only', () => {
    // player 1 has 4 pieces, so no flying
    const s = movingState({ 0: 1, 4: 1, 5: 1, 10: 1, 18: 2, 21: 2, 22: 2 });
    expect(e.applyMove(s, mv(0, 1))).not.toBeNull();
    expect(e.applyMove(s, mv(0, 7))).not.toBeNull();
    expect(e.applyMove(s, mv(0, 2))).toBeNull(); // not adjacent
    expect(e.applyMove(s, mv(18, 19))).toBeNull(); // not the mover's piece
    expect(e.applyMove(s, place(3))).toBeNull(); // no pieces in hand
  });

  it('cannot slide onto an occupied point', () => {
    // player 1's piece on 0 has both neighbours (1 and 7) taken by the opponent
    const s = movingState({ 0: 1, 12: 1, 13: 1, 14: 1, 1: 2, 7: 2, 22: 2 });
    expect(e.legalMoves(s).filter((m) => m.kind === 'move' && m.from === 0)).toEqual([]);
    expect(e.applyMove(s, mv(0, 1))).toBeNull();
  });

  it('sliding into a mill lets the player remove an unprotected piece', () => {
    // 3 -> 2 completes the outer top mill 0-1-2; player 2 has a mill (12-13-14) and one free piece (22)
    const s = movingState({ 0: 1, 1: 1, 3: 1, 5: 1, 12: 2, 13: 2, 14: 2, 22: 2 });
    const after = run(s, mv(3, 2));
    expect(after.mustRemove).toBe(true);
    expect(after.current).toBe(1);
    expect(e.legalMoves(after)).toEqual([rm(22)]); // the mill pieces are protected
    expect(run(after, rm(22)).current).toBe(2);
  });

  it('a player with exactly 3 pieces may fly anywhere', () => {
    const s = movingState({ 0: 1, 12: 1, 21: 1, 3: 2, 4: 2, 5: 2, 6: 2 });
    const moves = e.legalMoves(s);
    expect(moves.some((m) => m.kind === 'move' && m.from === 0 && m.to === 15)).toBe(true);
    expect(e.applyMove(s, mv(0, 15))).not.toBeNull();
    // player 2 has 4 pieces: sliding only
    const s2 = { ...s, current: 2 as const };
    expect(e.legalMoves(s2).some((m) => m.kind === 'move' && m.from === 3 && m.to === 15)).toBe(false);
  });

  it('reducing the opponent to 2 pieces wins immediately', () => {
    const s = movingState({ 0: 1, 1: 1, 3: 1, 12: 2, 20: 2, 21: 2 }); // p2 has 3 pieces, none in a mill
    const formed = run(s, mv(3, 2));
    expect(formed.mustRemove).toBe(true);
    const end = run(formed, rm(12));
    expect(e.getStatus(end)).toEqual({ state: 'won', winner: 1 });
    expect(e.legalMoves(end)).toEqual([]);
    expect(e.applyMove(end, mv(0, 7))).toBeNull();
  });

  it('a player with no legal slide loses', () => {
    // player 2's four corner pieces are boxed in by player 1's midpoint pieces
    const s = movingState({ 0: 2, 2: 2, 4: 2, 6: 2, 1: 1, 3: 1, 5: 1, 7: 1, 9: 1 });
    expect(e.legalMoves({ ...s, current: 2 })).toEqual([]);
    const after = run(s, mv(9, 8)); // a quiet move that ends player 1's turn
    expect(e.getStatus(after)).toEqual({ state: 'won', winner: 1 });
    expect(e.legalMoves(after)).toEqual([]);
  });

  it('long shuffling without a mill is a draw', () => {
    const s = { ...movingState({ 0: 1, 8: 1, 16: 1, 4: 2, 12: 2, 20: 2 }), quiet: QUIET_LIMIT - 1 };
    const n = e.applyMove(s, mv(0, 1));
    expect(n && e.getStatus(n)).toEqual({ state: 'draw' });
  });
});

describe('morris AI', () => {
  it('completes a mill when it can', () => {
    let s = run(e.initialState(), place(0), place(8), place(1), place(9));
    const m = getBestMove(s, 2);
    expect(m).toEqual(place(2));
    s = run(s, m);
    expect(s.mustRemove).toBe(true);
  });

  it('blocks an opponent mill threat when it cannot win itself', () => {
    const s = run(e.initialState(), place(0), place(8), place(1)); // p2 to move; p1 threatens 2
    expect(getBestMove(s, 2)).toEqual(place(2));
  });

  it('plays a full game against itself with only legal moves', () => {
    let s = e.initialState();
    let plies = 0;
    while (e.getStatus(s).state === 'playing' && plies++ < 600) {
      const m = getBestMove(s, 2);
      const n = e.applyMove(s, m);
      expect(n, `ply ${plies}`).not.toBeNull();
      if (!n) break;
      s = n;
    }
    expect(e.getStatus(s).state).not.toBe('playing');
  });
});
